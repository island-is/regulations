import multer from 'fastify-multer';
import S3 from 'aws-sdk/clients/s3';
import multerS3 from 'multer-s3-transform';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import sharp from 'sharp';
import { FILE_SERVER } from '../constants';
import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import { QStr } from 'utils/misc';
import type { Request as ExpressRequest } from 'express';

const EMPTY_KEY = '_';

const {
  AWS_BUCKET_NAME,
  AWS_REGION_NAME,
  MEDIA_BUCKET_FOLDER,
  FILE_UPLOAD_KEY_DRAFT = EMPTY_KEY,
  FILE_UPLOAD_KEY_PUBLISH = EMPTY_KEY,
} = process.env;

if (!AWS_BUCKET_NAME || !AWS_REGION_NAME) {
  throw new Error('AWS_BUCKET_NAME and AWS_REGION_NAME not configured');
}

const apiKeyUsers: Record<string, 'draft' | 'publish' | undefined> = {
  [FILE_UPLOAD_KEY_DRAFT]: 'draft',
  [FILE_UPLOAD_KEY_PUBLISH]: 'publish',
};
delete apiKeyUsers[EMPTY_KEY]; // Missing env keys must not open a security hole.

const assertUploadType = ({ headers }: Pick<FastifyRequest, 'headers'>) => {
  const apiKeyHeader = headers['X-APIKey'] || headers['x-apikey'];
  const uploadType = apiKeyUsers[String(apiKeyHeader)];
  if (!uploadType) {
    throw new Error('Authentication needed');
  }
  return uploadType;
};

// ---------------------------------------------------------------------------

// `multer-s3-transform` doesn't have TypeScript definitions, so we just make do with this
// copied over from https://www.npmjs.com/package/multer-s3-transform#file-information
type MulterFile = Omit<
  Express.Multer.File,
  'filename' | 'destination' | 'path' | 'buffer' | 'stream'
>;

type MulterS3StorageFile = MulterFile & {
  /** The bucket used to store the file */
  bucket: string;
  /** The name of the file */
  key: string;
  /** Access control for the file */
  acl: string;
  /** The mimetype used to upload the file */
  contentType: string;
  /** The metadata object to be sent to S3 */
  metadata: string;
  /** The S3 url to access the file */
  location: string;
  /** The etagof the uploaded file in S3 */
  etag: string;
  /** The contentDisposition used to upload the file */
  contentDisposition: string;
  /** The storageClass to be used for the uploaded file in S3 */
  storageClass: string;
  /** The versionId is an optional param returned by S3 for versioned buckets. */
  versionId: string;
};

type MulterFileWithHash = MulterFile & {
  $hash$?: string;
  isPasted?: boolean;
  key?: string;
};

const getSingleQuery = (req: ExpressRequest, param: string): string => {
  let value = req.query[param] as string | Array<string> | undefined;
  if (value && typeof value !== 'string') {
    value = value[0];
  }
  return value || '';
};

const dotPathRe = /\.+(?:\/|$)/g;

const getKey = (req: ExpressRequest, _file: MulterFile) => {
  const file = _file as MulterFileWithHash;

  const folder = getSingleQuery(req, 'folder').replace(dotPathRe, '/');

  const rootFolder = assertUploadType(req) === 'draft' ? 'draft' : 'files';
  const bucketFolder = MEDIA_BUCKET_FOLDER || '';
  const originalName = file.originalname.split('/').pop() as string;
  let fileNamePart = originalName.replace(/\.[^.]+$/, '');
  const fileExtension = originalName.slice(fileNamePart.length).toLowerCase();
  if (/^pasted--image/.test(fileNamePart)) {
    file.isPasted = true;
    fileNamePart = fileNamePart.replace(/^pasted--/, '');
  }
  const hash = file.$hash$ ? '--' + file.$hash$ : '';

  const fileName = `${fileNamePart}${hash}${fileExtension}`;

  const fileUrl = `/${bucketFolder}/${rootFolder}/${folder}/${fileName}`
    // remove double slashes
    .replace(/\/\/+/g, '/')
    .replace(/^\//, '');

  return fileUrl;
};

const storage = multerS3({
  s3: new S3({ region: AWS_REGION_NAME }),
  bucket: AWS_BUCKET_NAME || '',
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    cb(null, getKey(req as ExpressRequest, file));
  },
  // See also: https://www.npmjs.com/package/multer-s3-transform#transforming-files-before-upload
  // @ts-expect-error  (multer-s3-transform has no .d.ts files)
  shouldTransform: function (req, file: MulterFileWithHash, cb) {
    // cb(null, false); // no transforming for the time being. Deafult to all pasted files being just bulky PNG
    cb(null, file.isPasted);
  },
  transforms: [
    {
      id: 'original',
      key: (
        req: ExpressRequest,
        file: MulterFileWithHash,
        // @ts-expect-error  (multer-s3-transform has no .d.ts files)
        cb,
      ) => {
        cb(null, getKey(req, file).replace(/\.png$/, '.jpg'));
      },
      // @ts-expect-error  (multer-s3-transform has no .d.ts files)
      transform: (req: Request, file, cb) => {
        cb(
          null,
          sharp().flatten({ background: '#ffffff' }).jpeg({ quality: 85 }),
        );
      },
    },
    // {
    //   id: 'webp nearLossless',
    //   // @ts-expect-error  (multer-s3-transform has no .d.ts files)
    //   key: (req: Request, file: MulterFileWithHash, cb) => {
    //     cb(null, getKey(req, file).replace(/\.png$/, '-nll.webp'));
    //   },
    //   // @ts-expect-error  (multer-s3-transform has no .d.ts files)
    //   transform: (req: Request, file, cb) => {
    //     cb(null, sharp().webp({ quality: 85, nearLossless: true }));
    //   },
    // },
    // {
    //   id: 'webp lossy',
    //   // @ts-expect-error  (multer-s3-transform has no .d.ts files)
    //   key: (req: Request, file: MulterFileWithHash, cb) => {
    //     cb(null, getKey(req, file).replace(/\.png$/, '.webp'));
    //   },
    //   // @ts-expect-error  (multer-s3-transform has no .d.ts files)
    //   transform: (req: Request, file, cb) => {
    //     cb(null, sharp().webp({ quality: 85 }));
    //   },
    // },
  ],
});

const multerS3_handleFile = storage._handleFile;
storage._handleFile = function (req, file, cb) {
  const _this = this;
  const hash = createHash('md5');
  const fileData: Array<Buffer> = [];
  file.stream
    .on('data', (data: Buffer) => {
      hash.update(data);
      fileData.push(data);
    })
    .on('end', () => {
      const $hash$ = hash.digest('hex').substr(0, 8);
      multerS3_handleFile.call(
        _this,
        req,
        {
          ...file,
          $hash$,
          stream: Readable.from(fileData),
        },
        cb,
      );
    });
};

const fileUploader = multer({
  // @ts-expect-error  (multer-s3-transform assumes Express.js-branded Response/Request objects)
  storage,
}).single('file');

// ---------------------------------------------------------------------------

export const fileUploadRoutes: FastifyPluginCallback = (
  fastify,
  opts,
  done,
) => {
  /**
   * Uploads file into S3 bucket.
   *
   * Accepts a `?folder=2021/0123` query parameter (...or `?folder=[draftUUId]`)
   *
   * Requires a valid `X-APIKey: [secretKey]` HTTP header
   *
   * @returns {{ location: string }}}
   */

  fastify.post<QStr<'folder'>>(
    '/file-upload',
    {
      ...opts,
      onRequest: (request, reply, done) => {
        try {
          assertUploadType(request);
          done();
        } catch (error: unknown) {
          reply.code(403);
          done(error as Error);
        }
      },
      preHandler: fileUploader,
    },
    (request, reply) => {
      const fileObj = (request as any).file as MulterS3StorageFile | undefined;

      // NOTE: Not sure if this is needed. May be handled inside `fileUploader` – Már @2021-11-03
      if (!fileObj) {
        reply.code(400).send({ error: 'No file was uploaded' });
        return;
      }

      // !!MEDIA_BUCKET_FOLDER && console.info(fileObj);

      // @ts-expect-error  (multer-s3-transform has no .d.ts files)
      const uploadInfo = fileObj.transforms ? fileObj.transforms[0] : fileObj;

      reply.send({ location: FILE_SERVER + '/' + uploadInfo.key });
    },
  );

  done();
};
