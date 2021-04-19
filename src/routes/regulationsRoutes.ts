import { FastifyPluginCallback } from 'fastify';
import {
  PER_PAGE,
  getNewestRegulations,
  getRegulationsCount,
  getAllBaseRegulations,
} from '../db/Regulations';
import { assertPosInt, IntPositive, QStr } from './utils';

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
    reply.send(data);
  });
  fastify.get('/regulations/all/current/full', opts, async (request, reply) => {
    const data = await getAllBaseRegulations({ full: true });
    reply.send(data);
  });
  fastify.get('/regulations/all/current/extra', opts, async (request, reply) => {
    const data = await getAllBaseRegulations({ full: true, extra: true });
    reply.send(data);
  });

  done();
};
