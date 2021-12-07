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

const makeFileKey = (fullUrl: string, req: FastifyRequest) => {
  try {
    fullUrl = ('' + fullUrl).replace(`${DRAFTS_FOLDER}/`, '');
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

    return FILE_SERVER + fileKey;
  } catch (error) {
    console.error({ error });
    return '';
  }
};

function ensureObject(cand: unknown): Record<string, unknown> {
  if (cand && typeof cand === 'object' && !Array.isArray(cand)) {
    return cand as Record<string, unknown>;
  }
  return {};
}
function ensureStringArray(cand: unknown): Array<string> {
  if (Array.isArray(cand) && !cand.find((item) => typeof item !== 'string')) {
    return cand.filter((u) => !!u) as Array<string>;
  }
  return [];
}

type FileUrlMapping = { oldUrl: string; newUrl: string };
export const fileUrlsMapper = (req: FastifyRequest) => {
  const fileUrls: Array<FileUrlMapping> = [];
  const bdy = ensureObject(req.body);
  const links = ensureStringArray(bdy.urls);

  links.forEach((url) => {
    if (/^\//.test(url)) {
      url = OLD_SERVER + url;
    }
    fileUrls.push({ oldUrl: url, newUrl: makeFileKey(url, req) });
  });

  return fileUrls;
};

export const uploadFile = async (file: FileUrlMapping) => {
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
    console.error('⚠️ ', message);
  }
};
