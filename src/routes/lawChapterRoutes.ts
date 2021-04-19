import { FastifyPluginCallback } from 'fastify';
import { augmentLawChapters, chaptersToTree, getAllLawChapters } from '../db/LawChapter';

export const lawChapterRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters', opts, async (request, reply) => {
    const lawChapters = await getAllLawChapters();
    reply.send(augmentLawChapters(lawChapters));
  });

  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters/tree', opts, async (request, reply) => {
    const lawChapters = await getAllLawChapters();
    reply.send(chaptersToTree(lawChapters));
  });

  done();
};
