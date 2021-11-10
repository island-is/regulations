import { FastifyPluginCallback } from 'fastify';
import { DB_Ministry } from 'models';
import { get, set } from 'utils/cache';
import { cacheControl, QStr } from '../utils/misc';
import { getAllMinistries } from '../db/Ministry';
import { MinistryListItem, MinistrySlug } from './types';

const MINISTRY_TTL = 1;
const MINISTRY_REDIS_TTL = MINISTRY_TTL * 60 * 60;

export const ministryRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all minitries
   * @param {string} slugs - Comma separated list of MinistrySlugs to filter
   * @returns {MinistryList}
   */
  fastify.get<QStr<'slugs'>>('/ministries', opts, async (req, res) => {
    const { redis } = fastify;

    const slugs = req.query.slugs
      ? (req.query.slugs.split(',') as Array<MinistrySlug>)
      : undefined;

    const cacheKey = `ministries-${req.query.slugs ?? 'noslugs'}`;

    const cached = await get<Array<DB_Ministry> | null>(redis, cacheKey);

    let data;

    if (cached) {
      data = cached;
    } else {
      try {
        data = await getAllMinistries(slugs);
      } catch (e) {
        console.error('unable to get all ministries', e);
        return res.status(500).send();
      }
      set(redis, cacheKey, data, MINISTRY_REDIS_TTL);
    }
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
