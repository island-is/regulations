import { FastifyPluginCallback } from 'fastify';
import { cacheControl } from '../utils/misc';
import { getRegulationsYears } from '../db/Regulations';

const YEARS_TTL = 1;

export const yearsRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all minitries
   * @returns {Array<number>}
   */
  fastify.get('/years', opts, async (request, reply) => {
    const data = await getRegulationsYears();
    cacheControl(reply, YEARS_TTL);
    reply.send(data);
  });

  done();
};
