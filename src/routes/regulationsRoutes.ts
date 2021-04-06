import {
  getNewestRegulations,
  regulationsPerPage,
  getRegulationsCount,
  getAllBaseRegulations,
} from '../db/Regulations';

import { Regulation } from 'entity/Regulation';

export function regulationsRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets latest regulations as paged array
   * @returns {Array<Regulation>}
   */

  fastify.get('/regulations/newest', opts, async function (request: any, reply: any) {
    const page = Number(request.query.page) || 1;

    const data =
      !page || page < 1
        ? []
        : await getNewestRegulations({
            skip: (page - 1) * regulationsPerPage,
            take: regulationsPerPage,
          });
    const total: number = await getRegulationsCount();
    const totalPages = Math.ceil(total / regulationsPerPage);

    reply.send({
      page,
      perPage: regulationsPerPage,
      totalPages,
      data,
    });
  });

  fastify.get(
    '/regulations/all/current',
    opts,
    async function (request: any, reply: any) {
      const data = await getAllBaseRegulations();
      reply.send(data);
    },
  );
  fastify.get(
    '/regulations/all/current/full',
    opts,
    async function (request: any, reply: any) {
      const data = await getAllBaseRegulations({ full: true });
      reply.send(data);
    },
  );

  done();
}
