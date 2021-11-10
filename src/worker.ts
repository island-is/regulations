import throng from 'throng';
import { makeDraftPdf, makePublishedPdf } from 'db/RegulationPdf';
import { connectSequelize } from 'utils/sequelize';
import { getQueue } from 'utils/bullQueue';

// Connect to a local redis instance locally, and the Heroku-provided URL in production
const REDIS_URL = process.env.REDIS_URL;

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
const workers = process.env.WEB_CONCURRENCY || 2;

const maxJobsPerWorker = 1;

// pdfQueue.empty();

function start() {
  const pdfQueue = getQueue();
  pdfQueue.process(maxJobsPerWorker, async (job) => {
    const { routePath, opts, body } = job.data;
    try {
      const pdf =
        opts.name !== 'new'
          ? makePublishedPdf(routePath, opts)
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

if (REDIS_URL) {
  //need to run this cause the worker doesn't have access to the server.ts initialization
  connectSequelize();

  // Initialize the clustered worker process
  // See: https://devcenter.heroku.com/articles/node-concurrency for more info
  throng({ workers, start });
}
