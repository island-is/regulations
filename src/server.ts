import * as dotenv from 'dotenv';
import { fastify as fast } from 'fastify';
import fastifyRateLimiter from 'fastify-rate-limit';
import { createConnection } from 'typeorm';

import { Regulation } from './entity/Regulation';
import { regulationRoutes } from './routes/regulationRoutes';
import { regulationsRoutes } from './routes/regulationsRoutes';
import { Ministry } from './entity/Ministry';
import { ministryRoutes } from './routes/ministryRoutes';
import { LawChapter } from './entity/LawChapter';
import { lawChapterRoutes } from './routes/lawChapterRoutes';
import { yearsRoutes } from './routes/yearsRoutes';
import { RegulationChange } from './entity/RegulationChange';
import { RegulationCancel } from './entity/RegulationCancel';
import { RegulationMinistry } from './entity/RegulationMinistry';
import { RegulationLawChapter } from './entity/RegulationLawChapter';

const fastify = fast();
fastify.register(fastifyRateLimiter, {
  max: 100,
  timeWindow: '1 minute',
});

fastify.register(regulationRoutes, { prefix: '/api/v1' });
fastify.register(regulationsRoutes, { prefix: '/api/v1' });
fastify.register(ministryRoutes, { prefix: '/api/v1' });
fastify.register(lawChapterRoutes, { prefix: '/api/v1' });
fastify.register(yearsRoutes, { prefix: '/api/v1' });

const start = async () => {
  try {
    dotenv.config();
    await createConnection({
      type: 'mysql',
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT ?? ''),
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DB,
      synchronize: false,
      entities: [
        Regulation,
        Ministry,
        LawChapter,
        RegulationChange,
        RegulationCancel,
        RegulationMinistry,
        RegulationLawChapter,
      ],
    });

    await fastify.listen(process.env.PORT || 3000, '0.0.0.0', (err) => {
      if (err) {
        throw err;
      }
      console.log('API up and running on port ' + (process.env.PORT ?? 3000));
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

start();
