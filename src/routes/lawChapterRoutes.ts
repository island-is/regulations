import { FastifyPluginCallback } from 'fastify';
import { cache } from '../utils/misc';
import { augmentLawChapters, chaptersToTree, getAllLawChapters } from '../db/LawChapter';

const LAWCHAPTER_TTL = 24;

export const lawChapterRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters', opts, async (request, reply) => {
    const lawChapters = await getAllLawChapters();
    cache(reply, LAWCHAPTER_TTL);
    reply.send(augmentLawChapters(lawChapters));
  });

  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters/tree', opts, async (request, reply) => {
    const lawChapters = await getAllLawChapters();
    cache(reply, LAWCHAPTER_TTL);
    reply.send(chaptersToTree(lawChapters));
  });

  done();
};
