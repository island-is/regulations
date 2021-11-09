const {
  AWS_BUCKET_NAME = '',
  AWS_REGION_NAME = '',
  MEDIA_BUCKET_FOLDER,
} = process.env;
if (!AWS_BUCKET_NAME || !AWS_REGION_NAME) {
  throw new Error('AWS_BUCKET_NAME and AWS_REGION_NAME not configured');
}

export { AWS_BUCKET_NAME, AWS_REGION_NAME, MEDIA_BUCKET_FOLDER };

export const FILE_SERVER =
  process.env.DEV_FILE_SERVER || 'https://files.reglugerd.is';
