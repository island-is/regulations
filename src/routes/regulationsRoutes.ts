import { FastifyPluginCallback } from 'fastify';
import {
  PER_PAGE,
  getNewestRegulations,
  getRegulationsCount,
  getAllBaseRegulations,
} from '../db/Regulations';
import {
  assertPosInt,
  cache,
  IntPositive,
  loadData,
  QStr,
  storeData,
} from '../utils/misc';

const NEWEST_TTL = 0.5;
const ALLCURRENT_TTL = 0.5;

export const regulationsRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets latest regulations as paged array
   * @returns {Array<DB_Regulation>}
   */
  fastify.get<QStr<'page'>>('/regulations/newest', opts, async (request, reply) => {
    const page = assertPosInt(request.query.page || '') || (1 as IntPositive);

    const data = await getNewestRegulations({
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    });
    const totalItems: number = await getRegulationsCount();
    const totalPages = Math.ceil(totalItems / PER_PAGE);

    cache(reply, NEWEST_TTL);
    reply.send({
      page,
      perPage: PER_PAGE,
      totalPages,
      totalItems,
      data,
    });
  });

  // ---------------------------------------------------------------------------

  fastify.get('/regulations/all/current', opts, async (request, reply) => {
    const data = await getAllBaseRegulations();
    cache(reply, ALLCURRENT_TTL);
    reply.send(data);
  });

  fastify.get('/regulations/all/current/full', opts, async (request, reply) => {
    let data = await loadData('backup-json/all-current-full.json');
    if (!data) {
      console.info('Fetching data from db');
      data = await getAllBaseRegulations({ full: true });
      storeData(data, 'backup-json/all-current-full.json');
    } else {
      console.info('Returning all-current-full data from file');
    }
    reply.send(data);
  });

  fastify.get('/regulations/all/current/extra', opts, async (request, reply) => {
    let data = await loadData('backup-json/all-current-extra.json');
    if (!data) {
      console.info('Fetching data from db');
      data = await getAllBaseRegulations({ full: true, extra: true });
      storeData(data, 'backup-json/all-current-extra.json');
    } else {
      console.info('Returning all-current-extra data from file');
    }
    reply.send(data);
  });

  done();
};
