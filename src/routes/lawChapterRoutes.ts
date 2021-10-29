import { FastifyPluginCallback } from 'fastify';
import { cacheControl, QStr } from '../utils/misc';
import { getLawChapterTree, getLawChapterList } from '../db/LawChapter';
import { LawChapterSlug } from './types';

const LAWCHAPTER_TTL = 24;

export const lawChapterRoutes: FastifyPluginCallback = (
  fastify,
  opts,
  done,
) => {
  /**
   * Gets all LawChapters sorted by slug
   * @param {string} slugs - Comma separated list of LawChapterSlug to filter
   * @returns {Array<LawChapter>}
   */
  fastify.get<QStr<'slugs'>>('/lawchapters', opts, async (req, res) => {
    const slugs = req.query.slugs
      ? (req.query.slugs.split(',') as Array<LawChapterSlug>)
      : undefined;
    const lawChapters = await getLawChapterList(slugs);
    cacheControl(res, LAWCHAPTER_TTL);
    res.send(lawChapters);
  });

  /**
   * Gets a tree containing all LawChapters sorted by slug
   * @returns {LawChapterTree}
   */
  fastify.get('/lawchapters/tree', opts, async (req, res) => {
    const lawChapterTree = await getLawChapterTree();
    cacheControl(res, LAWCHAPTER_TTL);
    res.send(lawChapterTree);
  });

  done();
};
