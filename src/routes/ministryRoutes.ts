import { getAllMinistries } from '../db/Ministry';
import { MinistryListItem } from './types';

export function ministryRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets all minitries
   * @returns {MinistryList}
   */
  fastify.get('/ministries', opts, async function (request: any, reply: any) {
    const data = await getAllMinistries();
    const ministries = data.map(
      (m): MinistryListItem => {
        const { id, ...ministry } = m;
        return ministry;
      },
    );
    reply.send(ministries);
  });

  done();
}
