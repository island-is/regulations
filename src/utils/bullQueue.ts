import Queue from 'bull';
import { PdfQueueItem } from 'routes/regulationRoutes';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.info('Missing REDIS_URL for bull queue');
  process.exit(1);
}

export const getQueue = <T>(queueName = 'pdfQueue') => {
  const redis_uri = new URL(REDIS_URL);
  return REDIS_URL.includes('rediss://')
    ? new Queue<T>(queueName, {
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
    : new Queue<T>(queueName, REDIS_URL);
};

export const isWorking = async (
  routePath: string,
  queue: Queue.Queue<PdfQueueItem>,
) => {
  const workerJob = await queue.getJob(routePath);
  const state = await workerJob?.getState();
  return workerJob !== null && state !== 'completed';
};

export const handleWorker = async (
  routePath: string,
  queue: Queue.Queue<PdfQueueItem>,
  item?: PdfQueueItem,
) => {
  const workerJob = await queue.getJob(routePath);
  if (workerJob === null) {
    if (item) {
      await queue.add(item, { jobId: routePath, removeOnFail: true });
    }
    return { working: true };
  } else {
    const status = await workerJob.getState();

    if (status === 'completed') {
      const pdf = workerJob.returnvalue;
      const { fileName } = pdf;
      const pdfContents = pdf.pdfContents.data
        ? Buffer.from(pdf.pdfContents.data)
        : undefined;

      return { fileName, pdfContents, working: false };
    } else if (status === 'failed') {
      return { fileName: '', pdfContents: undefined, working: false };
    }
    return { fileName: '', pdfContents: undefined, working: false };
  }
};
