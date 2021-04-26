import { FastifyPluginCallback } from 'fastify';
import { cache } from '../utils/misc';
import { getRegulationsRedirects } from '../db/RegulationsRedirects';

const REDIRECTS_TTL = 1;

export const redirectsRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all redirects
   * @returns Redirects
   */
  fastify.get('/redirects', opts, async (request, reply) => {
    const data = await getRegulationsRedirects();
    cache(reply, REDIRECTS_TTL);
    reply.send(data);
  });

  done();
};
