import multer from 'fastify-multer';
import S3 from 'aws-sdk/clients/s3';
import multerS3 from 'multer-s3-transform';
import { createHash } from 'crypto';
import { PassThrough, Readable } from 'stream';
import sharp from 'sharp';
import file_type from 'file-type';
import fetch from 'node-fetch';

import {
  FILE_SERVER,
  AWS_BUCKET_NAME,
  AWS_REGION_NAME,
  MEDIA_BUCKET_FOLDER,
  OLD_SERVER,
} from '../constants';
import {
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';
import { QStr } from 'utils/misc';
import type { Request as ExpressRequest } from 'express';

const DRAFTS_FOLDER = 'admin-drafts';
const EMPTY_KEY = '_';
const QUERY_REPLACEMENT = '__q__';

const {
  FILE_UPLOAD_KEY_DRAFT = EMPTY_KEY,
  FILE_UPLOAD_KEY_PUBLISH = EMPTY_KEY,
} = process.env;

type UploadType = 'draft' | 'publish';

const apiKeyUsers: Record<string, UploadType | undefined> = {
  [FILE_UPLOAD_KEY_DRAFT]: 'draft',
  [FILE_UPLOAD_KEY_PUBLISH]: 'publish',
};
delete apiKeyUsers[EMPTY_KEY]; // Missing env keys must not open a security hole.

/** Asserts that FastifyRequest.headers contain an allowed X-APIKey header value
 * and returns the relevant UploadType string
 *
 * Throws if valid API key is not provided
 */
const assertUploadType = (req: Pick<FastifyRequest, 'headers'>): UploadType => {
  const apiKeyHeader = req.headers['X-APIKey'] || req.headers['x-apikey'];
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

  const rootFolder = assertUploadType(req) === 'draft' ? DRAFTS_FOLDER : '';
  const devFolder = MEDIA_BUCKET_FOLDER || '';
  const originalName = file.originalname.split('/').pop() as string;
  let fileNamePart = originalName.replace(/\.[^.]+$/, '');
  const fileExtension = originalName.slice(fileNamePart.length).toLowerCase();
  if (/^pasted--image/.test(fileNamePart)) {
    file.isPasted = true;
    fileNamePart = fileNamePart.replace(/^pasted--/, '');
  }
  const hash = file.$hash$ ? '--' + file.$hash$ : '';

  const fileName = `${fileNamePart}${hash}${fileExtension}`;

  const fileUrl = `/${devFolder}/${rootFolder}/files/${folder}/${fileName}`
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

// Stupid cloning for stupid streams
const stupidStreamClone = (stream: Readable) =>
  new Promise<[Readable, Readable]>((resolve, reject) => {
    const b1: Array<Buffer> = [];
    const b2: Array<Buffer> = [];
    stream
      .on('data', (data: Buffer) => {
        b1.push(data);
        b2.push(data);
      })
      .on('end', () => {
        const s1 = Readable.from(b1).pipe(new PassThrough());
        const s2 = Readable.from(b2).pipe(new PassThrough());
        resolve([s1, s2]);
      })
      .on('error', (error) => {
        reject(error);
      });
  });

const makeFileKey = (rawUrl: string, req: FastifyRequest) => {
  try {
    let fullUrl = ('' + rawUrl).replace(`${DRAFTS_FOLDER}/`, '');
    if (/^\//.test(fullUrl)) {
      fullUrl = OLD_SERVER + fullUrl;
    }

    const { hostname, pathname } = new URL(
      fullUrl.replace(/\?/g, QUERY_REPLACEMENT),
    );

    const pathPrefix =
      hostname === 'www.stjornartidindi.is'
        ? 'stjornartidindi/'
        : hostname !== FILE_SERVER && hostname !== OLD_SERVER
        ? `ext/${hostname}/`
        : '';

    const devFolder = MEDIA_BUCKET_FOLDER || '';
    const rootFolder =
      assertUploadType(req) === 'draft' && !fullUrl.startsWith(FILE_SERVER)
        ? DRAFTS_FOLDER
        : '';

    const fileKey = `/${devFolder}/${rootFolder}/${pathPrefix}/${pathname}`
      // remove double slashes
      .replace(/\/\/+/g, '/');

    return FILE_SERVER + fileKey;
  } catch (error) {
    console.error({ error });
    return '';
  }
};

function ensureObject(cand: unknown): Record<string, unknown> | undefined {
  if (cand && typeof cand === 'object' && !Array.isArray(cand)) {
    return cand as Record<string, unknown>;
  }
}
function ensureStringArray(cand: unknown): Array<string> | undefined {
  if (Array.isArray(cand) && !cand.find((item) => typeof item !== 'string')) {
    return cand.find((u) => !!u) as Array<string>;
  }
}

type FileUrlMapping = { oldUrl: string; newUrl: string };
const fileUrlsMapper = (req: FastifyRequest) => {
  const fileUrls: Array<FileUrlMapping> = [];
  const bdy = ensureObject(req.body) || {};
  const links = ensureStringArray(bdy.urls) || [];

  links.forEach((url) => {
    fileUrls.push({ oldUrl: url, newUrl: makeFileKey(url, req) });
  });

  return fileUrls;
};

const uploadFile = async (file: FileUrlMapping) => {
  const doLog = !!MEDIA_BUCKET_FOLDER || process.env.NODE_ENV !== 'production';
  const fileKey = file.newUrl.replace(FILE_SERVER, '');

  try {
    const s3 = new S3({ region: AWS_REGION_NAME });
    const res = await fetch(file.oldUrl);
    if (!res.ok) {
      throw new Error(`Error fetching '${file.oldUrl}' (${res.status})`);
    }
    const [fileA, fileB] = await stupidStreamClone(res.body as Readable);

    const fileType = await file_type.fromStream(fileA);

    await s3
      .upload({
        Bucket: AWS_BUCKET_NAME,
        Key: fileKey,
        ACL: 'public-read',
        ContentType: fileType?.mime,
        Body: fileB,
      })
      .promise()
      .then((data) => {
        doLog &&
          console.info('🆗 Uploaded', {
            oldUrl: file.oldUrl,
            key: data.Key,
          });
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.info('⚠️ ', message);
  }
};

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
        } catch (error) {
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

  /**
   * Uploads files from urls into S3 bucket and returns mappings for new urls.
   *
   * Accepts post body containing Array<string>
   *
   * Requires a valid `X-APIKey: [secretKey]` HTTP header
   *
   * @returns {Array<{ oldUrl: string; newUrl: string; }>}}
   */

  fastify.post(
    '/file-upload-urls',
    {
      ...opts,
      onRequest: (request, reply, done) => {
        try {
          assertUploadType(request);
          done();
        } catch (error) {
          reply.code(403);
          done(error as Error);
        }
      },
    },
    (request, reply) => {
      const files = fileUrlsMapper(request);

      reply.send(files);

      files.forEach((file) => uploadFile(file));
    },
  );

  done();
};
