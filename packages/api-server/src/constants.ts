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

export const API_URL = API_SERVER + '/api/v1/regulation';

export const PDF_TEMPLATE_UPDATED = '2022-02-26T15:40';

export { FILE_SERVER } from '@island.is/regulations-tools/constants';

/** prefix/root-folder for uploading files/documents for draft regulations */
export const DRAFTS_FOLDER = 'admin-drafts';
