import { FastifyPluginCallback } from 'fastify';
import { cacheControl, QStr } from '../utils/misc';
import { getAllMinistries } from '../db/Ministry';
import { MinistryListItem, MinistrySlug } from './types';

const MINISTRY_TTL = 1;

export const ministryRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all minitries
   * @param {string} slugs - Comma separated list of MinistrySlugs to filter
   * @returns {MinistryList}
   */
  fastify.get<QStr<'slugs'>>('/ministries', opts, async (req, res) => {
    const slugs = req.query.slugs
      ? (req.query.slugs.split(',') as Array<MinistrySlug>)
      : undefined;
    const data = await getAllMinistries(slugs);
    const ministries = data.map((m): MinistryListItem => {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        id,
        ...ministry
      } = m.get();
      return ministry;
    });
    cacheControl(res, MINISTRY_TTL);
    res.send(ministries);
  });

  done();
};
