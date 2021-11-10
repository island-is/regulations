import Queue from 'bull';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.info('Missing REDIS_URL for bull queue');
  process.exit(1);
}

export const getQueue = (queueName = 'pdfQueue') => {
  const redis_uri = new URL(REDIS_URL);
  return REDIS_URL.includes('rediss://')
    ? new Queue(queueName, {
        redis: {
          port: Number(redis_uri.port),
          host: redis_uri.hostname,
          password: redis_uri.password,
          db: 0,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          tls: {
            rejectUnauthorized: false,
          },
        },
      })
    : new Queue(queueName, REDIS_URL);
};
