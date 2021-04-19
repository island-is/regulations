import { fastify as fast } from 'fastify';
import fastifyRateLimiter from 'fastify-rate-limit';
import { Sequelize } from 'sequelize-typescript';

import fastifyCompress from 'fastify-compress';
import fastifyElasticsearch from 'fastify-elasticsearch';
import { elasticsearchRoutes } from './elastic/routes';

import { regulationRoutes } from './routes/regulationRoutes';
import { regulationsRoutes } from './routes/regulationsRoutes';
import { ministryRoutes } from './routes/ministryRoutes';
import { lawChapterRoutes } from './routes/lawChapterRoutes';
import { yearsRoutes } from './routes/yearsRoutes';

import { Regulation as DB_Regulation } from './models/Regulation';
import { RegulationChange as DB_RegulationChange } from './models/RegulationChange';
import { RegulationCancel as DB_RegulationCancel } from './models/RegulationCancel';
import { Regulation_Ministry as DB_RegulationMinistry } from './models/Regulation_Ministry';
import { Regulation_LawChapter as DB_RegulationLawChapter } from './models/Regulation_LawChapter';
import { Ministry as DB_Ministry } from './models/Ministry';
import { LawChapter as DB_LawChapter } from './models/LawChapter';
import { Task as DB_RegulationTasks } from './models/Task';

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
    await new Sequelize({
      dialect: 'mysql',
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT ?? ''),
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
      storage: ':memory:',
      models: [
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
      pool: {
        max: Number(process.env.DATABASE_CONNECTION_LIMIT) || 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
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
