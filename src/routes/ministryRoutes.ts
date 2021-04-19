import { FastifyPluginCallback } from 'fastify';
import { cache } from 'utils/misc';
import { getAllMinistries } from '../db/Ministry';
import { MinistryListItem } from './types';

const MINISTRY_TTL = 1;

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
    cache(reply, MINISTRY_TTL);
    reply.send(ministries);
  });

  done();
};
