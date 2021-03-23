import {
  getRegulationById,
  getAllRegulations,
  getRegulationsByPage,
  regulationsPerPage,
  getRegulationsCount,
} from '../db/regulation';

import { Regulation } from 'entity/Regulation';

export function regulationRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets all regulations as paged array
   * @returns {Array<Regulation>}
   */

  fastify.get('/regulations', opts, async function (request: any, reply: any) {
    const page = parseInt(request.params.page ?? 1) - 1;
    const data = await getRegulationsByPage(
      page * regulationsPerPage,
      regulationsPerPage,
    );
    const total: number = await getRegulationsCount();
    reply.send({
      page: page + 1,
      totalPages: Math.ceil(total / regulationsPerPage),
      data,
    });
  });

  /**
   * Gets a single regulation by id
   * @param {number} id - ID of the Regulation to fetch
   * @returns {Regulation}
   */

  fastify.get('/regulation/:id', opts, async function (request: any, reply: any) {
    if (request.params.id) {
      const data = await getRegulationById(parseInt(request.params.id));
      reply.send(data);
    } else {
      reply.code(400).send('No Regulation id specified!');
    }
  });

  done();
}
