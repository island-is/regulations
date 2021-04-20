import { fastify as fast } from 'fastify';
import fastifyRateLimiter from 'fastify-rate-limit';

import fastifyCompress from 'fastify-compress';
import fastifyElasticsearch from 'fastify-elasticsearch';
import { elasticsearchRoutes } from './elastic/routes';

import { regulationRoutes } from './routes/regulationRoutes';
import { regulationsRoutes } from './routes/regulationsRoutes';
import { ministryRoutes } from './routes/ministryRoutes';
import { lawChapterRoutes } from './routes/lawChapterRoutes';
import { yearsRoutes } from './routes/yearsRoutes';

import { connectSequelize } from './utils/sequelize';

const fastify = fast();
fastify.register(fastifyRateLimiter, {
  max: 100,
  timeWindow: '1 minute',
});

if (process.env.PROXIED !== 'true') {
  fastify.register(fastifyCompress, { global: true });
}

const {
  ELASTIC_CLOUD_ID,
  ELASTIC_CLOUD_APIKEY_ID,
  ELASTIC_CLOUD_APIKEY_KEY,
} = process.env;
if (ELASTIC_CLOUD_ID && ELASTIC_CLOUD_APIKEY_ID && ELASTIC_CLOUD_APIKEY_KEY) {
  fastify.register(fastifyElasticsearch, {
    cloud: {
      id: ELASTIC_CLOUD_ID,
    },
    auth: {
      apiKey: { id: ELASTIC_CLOUD_APIKEY_ID, api_key: ELASTIC_CLOUD_APIKEY_KEY },
    },
  });
  fastify.register(elasticsearchRoutes, { prefix: '/api/v1' });
}

fastify.register(regulationRoutes, { prefix: '/api/v1' });
fastify.register(regulationsRoutes, { prefix: '/api/v1' });
fastify.register(ministryRoutes, { prefix: '/api/v1' });
fastify.register(lawChapterRoutes, { prefix: '/api/v1' });
fastify.register(yearsRoutes, { prefix: '/api/v1' });

const start = async () => {
  try {
    connectSequelize();

    const serverPort = process.env.PORT || 3000;

    await fastify.listen(serverPort, '0.0.0.0', (err) => {
      if (err) {
        throw err;
      }
      console.info('API up and running on port ' + serverPort);
    });
  } catch (err) {
    console.info(err);
    process.exit(1);
  }
};

start();
