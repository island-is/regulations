import { Client } from '@elastic/elasticsearch';
import { populateElastic } from './populate';
import { searchElastic } from './search';

export function elasticsearchRoutes(fastify: any, opts: any, done: any) {
  /**
   * Search regulations
   * @returns {Array<Ministry>}
   */
  fastify.get('/search', opts, async function (request: any, reply: any) {
    const client = this.elastic as Client;
    console.log(request.query);

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

  done();
}
