import {
  PER_PAGE,
  getNewestRegulations,
  getRegulationsCount,
  getAllBaseRegulations,
} from '../db/Regulations';

export function regulationsRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets latest regulations as paged array
   * @returns {Array<DB_Regulation>}
   */

  fastify.get('/regulations/newest', opts, async function (request: any, reply: any) {
    const page = Number(request.query.page) || 1;

    const data =
      !page || page < 1
        ? []
        : await getNewestRegulations({
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

  fastify.get(
    '/regulations/all/current',
    opts,
    async function (request: any, reply: any) {
      const data = await getAllBaseRegulations();
      reply.send(data);
    },
  );
  fastify.get(
    '/regulations/all/current/full',
    opts,
    async function (request: any, reply: any) {
      const data = await getAllBaseRegulations({ full: true });
      reply.send(data);
    },
  );
  fastify.get(
    '/regulations/all/current/extra',
    opts,
    async function (request: any, reply: any) {
      const data = await getAllBaseRegulations({ full: true, extra: true });
      reply.send(data);
    },
  );

  done();
}
