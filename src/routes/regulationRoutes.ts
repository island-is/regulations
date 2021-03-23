import {
  getRegulationByName,
  getAllRegulations,
  getRegulationsByPage,
  regulationsPerPage,
  getRegulationsCount,
} from '../db/Regulation';

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
   * @param {string} name - ID of the Regulation to fetch
   * @returns {Regulation}
   */

  fastify.get('/regulation/:name', opts, async function (request: any, reply: any) {
    if (request.params.name) {
      const data = await getRegulationByName(
        String(request.params.name).replace('-', '/'),
      );
      reply.send(data);
    } else {
      reply.code(400).send('No Regulation id specified!');
    }
  });

  done();
}
