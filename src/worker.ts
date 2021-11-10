import throng from 'throng';
import Queue from 'bull';
import { makeDraftPdf, makePublishedPdf } from 'db/RegulationPdf';
import { PdfQueueItem } from 'routes/regulationRoutes';
import { connectSequelize } from 'utils/sequelize';

// Connect to a local redis instance locally, and the Heroku-provided URL in production
const REDIS_URL = process.env.REDIS_URL;

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
const workers = process.env.WEB_CONCURRENCY || 1;

const maxJobsPerWorker = 5;

function start() {
  console.info('Worker started');
  if (!REDIS_URL) {
    console.info('Missing REDIS URL for worker queue');
    process.exit(1);
  }
  // Connect to the named work queue
  const pdfQueue = new Queue<PdfQueueItem>('pdfQueue', REDIS_URL);

  pdfQueue.process(maxJobsPerWorker, async (job) => {
    console.log('job started', job.id);
    const { routePath, opts, body } = job.data;
    try {
      const pdf =
        opts.name !== 'new'
          ? makePublishedPdf(
              routePath,
              // @ts-expect-error  (TS doesn't realize opts.name can't be 'new' at this point)
              opts,
            )
          : body
          ? makeDraftPdf(body)
          : undefined;

      const pdfResult = await pdf;
      return pdfResult || {};
    } catch (e) {
      console.error('Failure in worker', e);
    }
    return {};
  });
}
//need to run this cause the worker doesn't have access to the server.ts initialization
connectSequelize();

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start, lifetime: Infinity });
console.info('Worker up and running');
