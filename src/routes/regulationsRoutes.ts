import {
  getLatestRegulations,
  regulationsPerPage,
  getRegulationsCount,
} from '../db/Regulations';

import { Regulation } from 'entity/Regulation';

export function regulationsRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets latest regulations as paged array
   * @returns {Array<Regulation>}
   */

  fastify.get('/regulations/newest', opts, async function (request: any, reply: any) {
    const page = Number(request.query.page) ?? 1;

    const data =
      !page || page < 1
        ? []
        : await getLatestRegulations((page - 1) * regulationsPerPage, regulationsPerPage);
    const total: number = await getRegulationsCount();
    const totalPages = Math.ceil(total / regulationsPerPage);

    reply.send({
      page,
      totalPages,
      data,
    });
  });

  done();
}
