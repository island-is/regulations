import { FastifyPluginCallback } from 'fastify';
import { getRegulationsYears } from '../db/Regulations';

export const yearsRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all minitries
   * @returns {Array<Ministry>}
   */
  fastify.get('/years', opts, async (request, reply) => {
    const data = await getRegulationsYears();
    reply.send(data);
  });

  done();
};
