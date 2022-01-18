import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { FILE_SERVER } from '../constants';
import { fileUploader, MulterS3StorageFile } from '../utils/file-upload';
import { fileUrlsMapper, uploadFile } from '../utils/file-upload-urls';
import { QStr } from '../utils/misc';

export const DRAFTS_FOLDER = 'admin-drafts';
export const EMPTY_KEY = '_';
export const QUERY_REPLACEMENT = '__q__';

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
export const assertUploadType = (
  req: Pick<FastifyRequest, 'headers'>,
): UploadType => {
  const apiKeyHeader = req.headers['X-APIKey'] || req.headers['x-apikey'];
  const uploadType = apiKeyUsers[String(apiKeyHeader)];

  if (!uploadType) {
    throw new Error('Authentication needed');
  }
  return uploadType;
};

// ---------------------------------------------------------------------------

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
      const fileObj = (
        request as unknown as { file: MulterS3StorageFile | undefined }
      ).file;

      // NOTE: Not sure if this is needed. May be handled inside `fileUploader` – Már @2021-11-03
      if (!fileObj) {
        reply.code(400).send({ error: 'No file was uploaded' });
        return;
      }

      // !!MEDIA_BUCKET_FOLDER && console.info(fileObj);

      const uploadInfo =
        // @ts-expect-error  (multer-s3-transform has no .d.ts files)
        (fileObj.transforms as Array<MulterS3StorageFile> | undefined)?.[0] ||
        fileObj;

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
      const fileInfoList = fileUrlsMapper(request);

      reply.send(
        fileInfoList.map(({ oldUrl, newUrl }) => ({
          oldUrl,
          newUrl,
        })),
      );

      fileInfoList.forEach((file) => uploadFile(file));
    },
  );

  done();
};
