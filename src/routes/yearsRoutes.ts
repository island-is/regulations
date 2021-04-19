import { FastifyPluginCallback } from 'fastify';
import { cache } from '../utils/misc';
import { getRegulationsYears } from '../db/Regulations';

const YEARS_TTL = 1;

export const yearsRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all minitries
   * @returns {Array<Ministry>}
   */
  fastify.get('/years', opts, async (request, reply) => {
    const data = await getRegulationsYears();
    cache(reply, YEARS_TTL);
    reply.send(data);
  });

  done();
};
