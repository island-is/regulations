import S3 from 'aws-sdk/clients/s3';
import file_type from 'file-type';
import fetch from 'node-fetch';
import { PassThrough, Readable } from 'stream';
import { FastifyRequest } from 'fastify';

import {
  FILE_SERVER,
  AWS_BUCKET_NAME,
  AWS_REGION_NAME,
  MEDIA_BUCKET_FOLDER,
  OLD_SERVER,
} from '../constants';
import {
  assertUploadType,
  DRAFTS_FOLDER,
  QUERY_REPLACEMENT,
} from 'routes/fileUploadRoutes';

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

// FIXME: Add tests!
const makeFileKey = (url: string, req: FastifyRequest) => {
  try {
    const fullUrl = url.replace(`${DRAFTS_FOLDER}/`, '');
    const { hostname, pathname } = new URL(
      fullUrl.replace(/\?/g, QUERY_REPLACEMENT),
    );

    const pathPrefix =
      hostname === 'www.stjornartidindi.is'
        ? 'stjornartidindi/'
        : FILE_SERVER.endsWith('//' + hostname) ||
          OLD_SERVER.endsWith('//' + hostname)
        ? ''
        : `ext/${hostname}/`;

    const devFolder = MEDIA_BUCKET_FOLDER || '';
    const rootFolder =
      assertUploadType(req) === 'draft' && !fullUrl.startsWith(FILE_SERVER)
        ? DRAFTS_FOLDER
        : '';

    const fileKey = `/${devFolder}/${rootFolder}/${pathPrefix}/${pathname}`
      // remove double slashes
      .replace(/\/\/+/g, '/')
      .replace(/^\//, '');

    return fileKey;
  } catch (error) {
    console.error({ error });
    return undefined;
  }
};

function ensureObject(cand: unknown): Record<string, unknown> {
  if (cand && typeof cand === 'object' && !Array.isArray(cand)) {
    return cand as Record<string, unknown>;
  }
  return {};
}
function ensureStringArray(cand: unknown): Array<string> {
  if (Array.isArray(cand)) {
    return cand.filter(
      (item): item is string => !!item && typeof item === 'string',
    );
  }
  return [];
}

type FileUrlMapping = {
  oldUrl: string;
  oldUrlFull: string;
  newUrl: string;
  fileKey: string;
};

const dedupeUrls = (urls: Array<FileUrlMapping>) => {
  const newArray: Array<FileUrlMapping> = [];
  const foundArr: Array<string> = [];

  urls.forEach((u) => {
    if (!foundArr.includes(u.oldUrlFull)) {
      foundArr.push(u.oldUrlFull);
      newArray.push(u);
    }
  });
  return newArray;
};

// FIXME: Add tests!
export const fileUrlsMapper = (req: FastifyRequest) => {
  const fileUrls: Array<FileUrlMapping> = [];
  const bdy = ensureObject(req.body);
  const links = ensureStringArray(bdy.urls);

  links.forEach((oldUrl) => {
    let oldUrlFull = oldUrl;
    if (/^\//.test(oldUrlFull)) {
      oldUrlFull = OLD_SERVER + oldUrlFull;
    }
    const fileKey = makeFileKey(oldUrl, req);
    const newUrl = FILE_SERVER + '/' + fileKey;

    if (fileKey && oldUrl !== newUrl) {
      fileUrls.push({
        oldUrl,
        oldUrlFull,
        newUrl,
        fileKey,
      });
    }
  });

  return dedupeUrls(fileUrls);
};

export const uploadFile = async (fileInfo: FileUrlMapping) => {
  const { fileKey, oldUrlFull } = fileInfo;
  const doLog = !!MEDIA_BUCKET_FOLDER || process.env.NODE_ENV !== 'production';

  try {
    const s3 = new S3({ region: AWS_REGION_NAME });
    const res = await fetch(oldUrlFull);
    if (!res.ok) {
      throw new Error(`Error fetching '${oldUrlFull}' (${res.status})`);
    }
    let Body = res.body as Readable;

    let ContentType: string | undefined =
      res.headers.get('content-type') || undefined;

    if (!ContentType) {
      const [fileA, fileB] = await stupidStreamClone(res.body as Readable);
      Body = fileA;
      ContentType = (await file_type.fromStream(fileB))?.mime;
    }

    await s3
      .upload({
        Bucket: AWS_BUCKET_NAME,
        Key: fileKey,
        ACL: 'public-read',
        ContentType,
        Body,
      })
      .promise()
      .then((data) => {
        doLog &&
          console.info('🆗 Uploaded', {
            oldUrl: oldUrlFull,
            key: data.Key,
          });
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error('⚠️ ', message);
  }
};
