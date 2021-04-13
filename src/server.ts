import { fastify as fast } from 'fastify';
import fastifyRateLimiter from 'fastify-rate-limit';
import { createConnection } from 'typeorm';

import fastifyCompress from 'fastify-compress';
import fastifyElasticsearch from 'fastify-elasticsearch';
import { elasticsearchRoutes } from './elastic/routes';

import { DB_Regulation } from './entity/Regulation';
import { regulationRoutes } from './routes/regulationRoutes';
import { regulationsRoutes } from './routes/regulationsRoutes';
import { DB_Ministry } from './entity/Ministry';
import { ministryRoutes } from './routes/ministryRoutes';
import { DB_LawChapter } from './entity/LawChapter';
import { lawChapterRoutes } from './routes/lawChapterRoutes';
import { yearsRoutes } from './routes/yearsRoutes';
import { DB_RegulationChange } from './entity/RegulationChange';
import { DB_RegulationCancel } from './entity/RegulationCancel';
import { DB_RegulationMinistry } from './entity/RegulationMinistry';
import { DB_RegulationLawChapter } from './entity/RegulationLawChapter';
import { DB_RegulationTasks } from './entity/RegulationTasks';

const fastify = fast();
fastify.register(fastifyRateLimiter, {
  max: 100,
  timeWindow: '1 minute',
});

if (process.env.PROXIED !== 'true') {
  fastify.register(fastifyCompress, { global: true });
}

fastify.register(fastifyElasticsearch, { node: process.env.SEARCHBOX_URL });
fastify.register(elasticsearchRoutes, { prefix: '/api/v1' });

fastify.register(regulationRoutes, { prefix: '/api/v1' });
fastify.register(regulationsRoutes, { prefix: '/api/v1' });
fastify.register(ministryRoutes, { prefix: '/api/v1' });
fastify.register(lawChapterRoutes, { prefix: '/api/v1' });
fastify.register(yearsRoutes, { prefix: '/api/v1' });

const start = async () => {
  try {
    await createConnection({
      type: 'mysql',
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT ?? ''),
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
      synchronize: false,
      entities: [
        DB_Regulation,
        DB_Ministry,
        DB_LawChapter,
        DB_RegulationChange,
        DB_RegulationCancel,
        DB_RegulationMinistry,
        DB_RegulationLawChapter,
        DB_RegulationTasks,
      ],
      // Options passed down to the `mysql2` driver
      extra: {
        connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT) || 5,
      },
    });

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
