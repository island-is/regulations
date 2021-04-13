import { Client } from '@elastic/elasticsearch';
import { populateElastic, updateElasticItem } from './populate';
import { searchElastic } from './search';

export function elasticsearchRoutes(fastify: any, opts: any, done: any) {
  /**
   * Search regulations
   * @returns {Array<Ministry>}
   */
  fastify.get('/search', opts, async function (request: any, reply: any) {
    const client = this.elastic as Client;
    const data = await searchElastic(client, request?.query);
    reply.send(data);
  });

  /**
   * Populate regulations search index
   * @returns {Array<Ministry>}
   */
  fastify.get('/search/populate', opts, async function (request: any, reply: any) {
    const client = this.elastic as Client;
    const data = await populateElastic(client);
    reply.send(data);
  });

  /**
   * Update single regulation in index by RegName
   * @returns {Array<Ministry>}
   */
  fastify.get('/search/update', opts, async function (request: any, reply: any) {
    const client = this.elastic as Client;
    await updateElasticItem(client, request?.query);

    reply.send({ success: 1 });
  });

  done();
}
