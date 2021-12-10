const {
  AWS_BUCKET_NAME = '',
  AWS_REGION_NAME = '',
  API_SERVER,
  MEDIA_BUCKET_FOLDER,
} = process.env;

if (!AWS_BUCKET_NAME || !AWS_REGION_NAME || !API_SERVER) {
  throw new Error(
    'AWS_BUCKET_NAME, AWS_REGION_NAME and/or API_SERVER not configured',
  );
}

export { AWS_BUCKET_NAME, AWS_REGION_NAME, MEDIA_BUCKET_FOLDER };

export const OLD_SERVER = 'https://www.reglugerd.is';

export { FILE_SERVER } from '@island.is/regulations-tools/constants';

export const API_URL = API_SERVER + '/regulation';

export const PDF_TEMPLATE_UPDATED = '2021-11-09T13:05';
