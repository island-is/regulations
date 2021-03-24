import { getRegulationByName } from '../db/Regulation';

import { Regulation } from 'entity/Regulation';

export function regulationRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets a single regulation by name
   * @param {string} name - Name of the Regulation to fetch
   * @returns {Regulation}
   */

  fastify.get('/regulation/nr/:name', opts, async function (request: any, reply: any) {
    if (request.params.name) {
      const data = await getRegulationByName(
        String(request.params.name).replace('-', '/'),
      );
      if (data) {
        reply.send(data);
      } else {
        reply.code(400).send('Regulation not found!');
      }
    } else {
      reply.code(400).send('No Regulation name specified!');
    }
  });

  done();
}
