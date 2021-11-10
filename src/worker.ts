import throng from 'throng';
import Queue from 'bull';
import { makeDraftPdf, makePublishedPdf } from 'db/RegulationPdf';
import { PdfQueueItem } from 'routes/regulationRoutes';

// Connect to a local redis instance locally, and the Heroku-provided URL in production
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
const workers = process.env.WEB_CONCURRENCY || 2;

// The maximum number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
const maxJobsPerWorker = 50;

function start() {
  // Connect to the named work queue
  const pdfQueue = new Queue<PdfQueueItem>('pdfQueue', REDIS_URL);

  pdfQueue.process(maxJobsPerWorker, async (job) => {
    console.log('starting job id:', job.id);
    const { routePath, opts, body } = job.data;

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

    const result = (await pdf) || {};
    console.log('pdf result:', result);

    return result;
  });
}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });
