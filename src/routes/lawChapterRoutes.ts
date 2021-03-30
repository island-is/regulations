import { augmentLawChapters, chaptersToTree, getAllLawChapters } from '../db/LawChapter';

export function lawChapterRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters', opts, async function (request: any, reply: any) {
    const lawChapters = await getAllLawChapters();
    reply.send(augmentLawChapters(lawChapters));
  });

  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters/tree', opts, async function (request: any, reply: any) {
    const data = await getAllLawChapters();
    const chapterTree = chaptersToTree(data);

    reply.send(chapterTree);
  });

  done();
}
