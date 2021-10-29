import { FastifyPluginCallback } from 'fastify';
import { cacheControl } from '../utils/misc';
import { getRegulationsRedirects } from '../db/RegulationsRedirects';

const REDIRECTS_TTL = 1;

export const redirectsRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all redirects
   * @returns Redirects
   */
  fastify.get('/redirects', opts, async (req, res) => {
    const data = await getRegulationsRedirects();
    cacheControl(res, REDIRECTS_TTL);
    res.send(data);
  });

  done();
};
