import { FastifyPluginCallback } from 'fastify';
import { cache } from '../utils/misc';
import { getLawChapterTree, getLawChapterList } from '../db/LawChapter';
import { LawChapter, LawChapterTree } from './types';

const LAWCHAPTER_TTL = 24;

export const lawChapterRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Gets all LawChapters sorted by slug
   * @returns {Array<LawChapter>}
   */
  fastify.get('/lawchapters', opts, async (req, res) => {
    const lawChapters = await getLawChapterList();
    cache(res, LAWCHAPTER_TTL);
    res.send(lawChapters);
  });

  /**
   * Gets a tree containing all LawChapters sorted by slug
   * @returns {LawChapterTree}
   */
  fastify.get('/lawchapters/tree', opts, async (req, res) => {
    const lawChapterTree = await getLawChapterTree();
    cache(res, LAWCHAPTER_TTL);
    res.send(lawChapterTree);
  });

  done();
};
