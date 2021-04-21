import { FastifyPluginCallback } from 'fastify';
import { QStr } from '../utils/misc';
import { recreateElastic, repopulateElastic, updateElasticItem } from './populate';
import { searchElastic, SearchQueryParams } from './search';

// ---------------------------------------------------------------------------

export const elasticsearchRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Search regulations
   * @returns RegulationSearchResults
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
   * Recreate regulations search index
   * @returns {success: boolean>}
   */
  fastify.get<QStr<'template'>>(
    '/search/recreate',
    opts,
    async function (request, reply) {
      const data = await recreateElastic(this.elastic);
      reply.send(data);
    },
  );

  /**
   * Repopulate regulations search index
   * @returns {success: boolean>}
   */
  fastify.get<QStr<'template'>>(
    '/search/repopulate',
    opts,
    async function (request, reply) {
      const data = await repopulateElastic(this.elastic);
      reply.send(data);
    },
  );

  /**
   * Update single regulation in index by RegName
   * @returns {success: boolean>}
   */
  fastify.get<QStr<'name'>>('/search/update', opts, async function (request, reply) {
    await updateElasticItem(this.elastic, request.query);

    reply.send({ success: true });
  });

  done();
};
