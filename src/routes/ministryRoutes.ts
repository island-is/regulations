import { FastifyPluginCallback } from 'fastify';
import { getAllMinistries } from '../db/Ministry';
import { MinistryListItem } from './types';

export const ministryRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all minitries
   * @returns {MinistryList}
   */
  fastify.get('/ministries', opts, async (request, reply) => {
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
};
