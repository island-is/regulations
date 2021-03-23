import * as dotenv from 'dotenv';

import { Regulation } from './entity/Regulation';
import { regulationRoutes } from './routes/regulationRoutes';
import { createConnection } from 'typeorm';
import { fastify as fast } from 'fastify';

import fastifyRateLimiter from 'fastify-rate-limit';
import { Ministry } from './entity/Ministry';
import { ministryRoutes } from './routes/ministryRoutes';

const fastify = fast();
fastify.register(fastifyRateLimiter, {
  max: 100,
  timeWindow: '1 minute',
});

fastify.register(regulationRoutes, { prefix: '/api/v1' });
fastify.register(ministryRoutes, { prefix: '/api/v1' });

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
      entities: [Regulation, Ministry],
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
