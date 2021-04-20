import {
  LawChapter as DB_LawChapter,
  Regulation_LawChapter as DB_RegulationLawChapter,
} from '../models';
import { LawChapterTree, LawChapter } from '../routes/types';

export const augmentLawChapters = (chapters: Array<DB_LawChapter>) =>
  chapters.map(
    (c): LawChapter => ({
      name: c.title,
      slug: c.slug,
    }),
  );

export const chaptersToTree = (chapters: Array<DB_LawChapter>): LawChapterTree => {
  const parents: {
    [key: string]: LawChapter & {
      subChapters: Array<LawChapter>;
    };
  } = {};

  chapters.forEach((chapter) => {
    const { id = -1, parentId, title, slug } = chapter;
    if (!parentId) {
      parents[id] = {
        name: title,
        slug,
        subChapters: [],
      };
    } else {
      parents[parentId].subChapters.push({
        name: title,
        slug,
      });
    }
  });

  return Object.values(parents);
};

export async function getAllLawChapters() {
  const lawChapters = await DB_LawChapter.findAll({ order: [['slug', 'ASC']] });
  return lawChapters;
}

export async function getRegulationLawChapters(regulationId?: number) {
  if (!regulationId) {
    return;
  }

  const con = await DB_RegulationLawChapter.findOne({ where: { regulationId } });

  const lawChapters =
    (await DB_LawChapter.findAll({ where: { id: con?.chapterId } })) ?? undefined;

  return augmentLawChapters(lawChapters);
}
