import { FastifyPluginCallback } from 'fastify';
import { QStr } from '../utils/misc';
import { populateElastic, updateElasticItem } from './populate';
import { searchElastic, SearchQueryParams } from './search';

// ---------------------------------------------------------------------------

export const elasticsearchRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Search regulations
   * @returns {Array<Ministry>}
   */
  fastify.get<{ Querystring: SearchQueryParams }>(
    '/search',
    opts,
    async function (request, reply) {
      const data = await searchElastic(this.elastic, request.query);
      reply.send(data);
    },
  );

  /**
   * Populate regulations search index
   * @returns {Array<Ministry>}
   */
  fastify.get<QStr<'template'>>(
    '/search/populate',
    opts,
    async function (request, reply) {
      const data = await populateElastic(this.elastic);
      reply.send(data);
    },
  );

  /**
   * Update single regulation in index by RegName
   * @returns {Array<Ministry>}
   */
  fastify.get<QStr<'name'>>('/search/update', opts, async function (request, reply) {
    await updateElasticItem(this.elastic, request.query);

    reply.send({ success: 1 });
  });

  done();
};
