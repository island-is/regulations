import { getAllMinistries } from '../db/Ministry';
import { Ministry } from 'entity/Ministry';

export function ministryRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets all minitries
   * @returns {Array<Ministry>}
   */
  fastify.get('/ministries', opts, async function (request: any, reply: any) {
    const data = await getAllMinistries();
    reply.send({ data });
  });

  done();
}
