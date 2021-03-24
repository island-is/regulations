import { getAllLawChapters } from '../db/LawChapter';
import { LawChapter } from 'entity/LawChapter';

const _dataToChapterTree = (data: Array<LawChapter>) => {
  const chapters: { [key: string]: any } = {};
  data.forEach((chapter) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, parentId, ...chapterData } = chapter;
    if (!chapter.parentId) {
      chapters[String(chapter.id)] = Object.assign({}, chapterData, { subChapters: [] });
    } else {
      chapters[chapter.parentId].subChapters.push(chapterData);
    }
  });
  return Object.values(chapters);
};

export function lawChapterRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters', opts, async function (request: any, reply: any) {
    const data = await getAllLawChapters();
    reply.send(data);
  });

  /**
   * Gets all LawChapters
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters/tree', opts, async function (request: any, reply: any) {
    const data = await getAllLawChapters();
    const chapterTree = _dataToChapterTree(data);

    reply.send(chapterTree);
  });

  done();
}
