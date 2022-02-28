import { ensureRegName } from '@island.is/regulations-tools/utils';
import { FastifyPluginCallback } from 'fastify';

import { FILE_SERVER } from '../constants';
import { fileUploader, MulterS3StorageFile } from '../utils/file-upload';
import { createPresigned, moveUrlsToFileServer } from '../utils/file-upload-urls';
import {
  ensureFileScopeToken,
  ensureObject,
  ensureStringArray,
  ensureUploadTypeHeader,
  QStr,
} from '../utils/misc';

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

  fastify.post<QStr>(
    '/file-upload',
    {
      ...opts,
      onRequest: (request, reply, done) => {
        try {
          const uploadType = ensureUploadTypeHeader(request);
          if (!uploadType) {
            throw new Error('Authentication needed');
          }
          const scopeParam = request.query.scope || request.query.scope;
          if (uploadType === 'publish' && !ensureRegName(scopeParam)) {
            throw new Error('Scope must be of type RegName');
          }
          if (uploadType === 'draft' && !ensureFileScopeToken(scopeParam)) {
            throw new Error('Invalid scope token');
          }
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
   * Accepts post body of type `{ urls: Array<string>, regName: RegName }`
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
          if (ensureUploadTypeHeader(request) !== 'publish') {
            throw new Error('Authentication needed');
          }
          done();
        } catch (error) {
          reply.code(403);
          done(error as Error);
        }
      },
    },
    (request, reply) => {
      const _body = ensureObject(request.body);

      const links = ensureStringArray(_body.urls);
      const regName = ensureRegName(_body.regName);
      const uploadType = ensureUploadTypeHeader(request);

      if (!regName) {
        reply.code(400).send({
          error: 'Invalid/missing scope token',
        });
        return;
      }
      if (!uploadType) {
        // Should never happen. Should be cought in `onRequest` above
        reply.code(500);
        return;
      }

      const urlMap = moveUrlsToFileServer(links, regName);

      reply.send(urlMap);
    },
  );

  fastify.post(
    '/file-presigned',
    {
      ...opts,
      onRequest: (request, reply, done) => {
        try {
          console.log('ensureUploadTypeHeader(request) :>> ', ensureUploadTypeHeader(request));
          if (ensureUploadTypeHeader(request) !== 'presigned') {
            throw new Error('Authentication needed');
          }
          done();
        } catch (error) {
          reply.code(403);
          done(error as Error);
        }
      },
    },
    async (request, reply) => {
      const presigned = await createPresigned();

      if (presigned) {
        return reply.send(presigned);
      }

      return reply.status(500).send();
    },
  );

  done();
};
