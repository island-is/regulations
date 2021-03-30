import { LawChapter } from '../entity/LawChapter';
import { getConnection } from 'typeorm';
import { RegulationLawChapter } from '../entity/RegulationLawChapter';
import { LawChapterTreeType, LawChapterType } from './types';

export const augmentLawChapters = (chapters: Array<LawChapter>) => {
  const lawChapters: Array<LawChapterType> = [];
  chapters.forEach((c) => {
    lawChapters.push({ name: c.title, slug: c.slug });
  });
  return lawChapters;
};

export const chaptersToTree = (data: Array<LawChapter>): LawChapterTreeType => {
  const chapters: { [key: string]: any } = {};
  data.forEach((chapter) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, parentId, title, slug } = chapter;
    const retChapter: LawChapterType = { name: title, slug: slug };
    if (!chapter.parentId) {
      chapters[String(chapter.id)] = Object.assign({}, retChapter, { subChapters: [] });
    } else {
      chapters[chapter.parentId].subChapters.push(retChapter);
    }
  });
  return Object.values(chapters);
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
