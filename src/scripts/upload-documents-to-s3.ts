import S3 from 'aws-sdk/clients/s3';
import file_type from 'file-type';
import { readFile, writeFile } from 'fs/promises';
import fetch from 'node-fetch';
import { PassThrough, Readable } from 'stream';
import {
  FILE_SERVER,
  AWS_BUCKET_NAME,
  AWS_REGION_NAME,
  MEDIA_BUCKET_FOLDER,
} from '../constants';

const QUERY_REPLACEMENT = '__q__';

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

const makeFileKey = (fullUrl: string) => {
  try {
    const { hostname, pathname } = new URL(
      fullUrl.replace(/\?/g, QUERY_REPLACEMENT),
    );
    const pathPrefix =
      hostname === 'www.stjornartidindi.is'
        ? 'stjornartidindi/'
        : /(?:\.lovdata\.no|\.googleusercontent\.com)$/.test(hostname)
        ? `ext/${hostname}/`
        : '';
    const rootFolder = MEDIA_BUCKET_FOLDER || '';

    const fileKey = `/${rootFolder}/${pathPrefix}/${pathname}`
      // remove double slashes
      .replace(/\/\/+/g, '/')
      .replace(/^\//, '');

    return fileKey;
  } catch (error) {
    return '';
  }
};

// ---------------------------------------------------------------------------

(async () => {
  let uploadedCount = 0;
  const errored: Array<string> = [];

  const doLog = !!MEDIA_BUCKET_FOLDER || process.env.NODE_ENV !== 'production';

  const s3 = new S3({ region: AWS_REGION_NAME });

  const rawUrls = (await readFile('./found-urls.txt'))
    .toString()
    .split(/\n/)
    .filter((str) => !!str);
  // const rawUrls = [
  //   '/media/vidhengi/nr_137_1994_mynd2.gif',
  //   'http://www.lovdata.no/for/sf/gr/sd-19930928-0910-001.gif',
  //   'https://www.stjornartidindi.is/images/B_90_2013_image004.jpg',
  //   'https://www.stjornartidindi.is/DocumentActions.aspx?ActionType=GetImage&documentID=0518a48e-3f82-44e5-a839-4258c6af5a5c',
  //   'https://lh6.googleusercontent.com/LOvkwMqJ8saeCgmGTYk7yaiq-v4WO_0AwfbsGPH_OALJl0y-2hFDIfl1v4zER4PGnZCawOebimcR89CkNTfil_dealngaPGsDo0OKMqqaVqBVThCq03UX2Els6CN5hDmtWu81ZPu',
  // ];

  if (rawUrls.length === 0) {
    throw new Error('No raw URLs found');
  }

  /* eslint-disable no-await-in-loop */
  for (const rawUrl of rawUrls) {
    const fullUrl = rawUrl.replace(/^\//, 'https://www.reglugerd.is/');
    try {
      const res = await fetch(fullUrl);
      if (!res.ok) {
        throw new Error(`Error fetching '${fullUrl}' (${res.status})`);
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
          Key: makeFileKey(fullUrl),
          ACL: 'public-read',
          ContentType,
          Body,
        })
        .promise()
        .then((data) => {
          uploadedCount++;
          doLog &&
            console.info('🆗 Uploaded', {
              oldUrl: fullUrl,
              key: data.Key,
            });
          if (uploadedCount % 100 === 0) {
            console.info(`✅ ${uploadedCount} uploaded`);
          }
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : error;
      const fileKey = makeFileKey(fullUrl);
      console.info('⚠️ ', message);
      fileKey && errored.push(fullUrl + '\t\t' + FILE_SERVER + '/' + fileKey);
    }
  }
  /* eslint-enable no-await-in-loop */

  // ---------------------------------------------------------------------------

  console.info(
    `\n______________________________________________________________________________\n`,
  );
  console.info(`✅ Done uploading ${uploadedCount} files`);

  if (errored.length) {
    console.info(`\n❌ ${errored.length} failed to upload:`, errored);
    const errorFileName = './upload-errors.txt';
    await writeFile(errorFileName, errored.join('\n'));
    console.info(`(See: '${errorFileName}')`);
  }
})();
