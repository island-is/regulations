import { DB_LawChapter } from '../entity/LawChapter';
import { getConnection } from 'typeorm';
import { DB_RegulationLawChapter } from '../entity/RegulationLawChapter';
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
    const { parentId, title, slug } = chapter;
    if (!parentId) {
      parents[chapter.id] = {
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
  const lawChaptersRepository = getConnection().getRepository(DB_LawChapter);
  const lawChapters =
    (await lawChaptersRepository
      .createQueryBuilder('lawchapters')
      .orderBy('slug', 'ASC')
      .getMany()) ?? [];
  return lawChapters;
}

export async function getRegulationLawChapters(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const lawChaptersRepository = getConnection().getRepository(DB_LawChapter);
  const regulationLCRepository = getConnection().getRepository(DB_RegulationLawChapter);
  const con = await regulationLCRepository.findOne({ where: { regulationId } });

  const lawChapters: Array<DB_LawChapter> =
    (await lawChaptersRepository
      .createQueryBuilder('regulationlawchapters')
      .where('id = :chapterId', { chapterId: con?.chapterId })
      .getMany()) ?? undefined;

  return augmentLawChapters(lawChapters);
}
