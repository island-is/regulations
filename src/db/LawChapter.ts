import { LawChapter } from '../entity/LawChapter';
import { getConnection } from 'typeorm';
import { RegulationLawChapter } from '../entity/RegulationLawChapter';
import { LawChapterTreeType, LawChapterType } from './types';

export const augmentLawChapters = (chapters: Array<LawChapter>) =>
  chapters.map(
    (c): LawChapterType => ({
      name: c.title,
      slug: c.slug,
    }),
  );

export const chaptersToTree = (chapters: Array<LawChapter>): LawChapterTreeType => {
  const parents: {
    [key: string]: LawChapterType & {
      subChapters: Array<LawChapterType>;
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
  const lawChaptersRepository = getConnection().getRepository(LawChapter);
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
  const lawChaptersRepository = getConnection().getRepository(LawChapter);
  const regulationLCRepository = getConnection().getRepository(RegulationLawChapter);
  const con = await regulationLCRepository.findOne({ where: { regulationId } });

  const lawChapters: Array<LawChapter> =
    (await lawChaptersRepository
      .createQueryBuilder('regulationlawchapters')
      .where('id = :chapterId', { chapterId: con?.chapterId })
      .getMany()) ?? undefined;

  return augmentLawChapters(lawChapters);
}
