import { LawChapter } from '../entity/LawChapter';
import { getConnection } from 'typeorm';
import { RegulationLawChapter } from '../entity/RegulationLawChapter';
import { LawChapterType } from './types';

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

  const lawChaptersData: Array<LawChapter> =
    (await lawChaptersRepository
      .createQueryBuilder('regulationlawchapters')
      .where('id = :chapterId', { chapterId: con?.chapterId })
      .getMany()) ?? undefined;

  const lawChapters: Array<LawChapterType> = [];
  lawChaptersData.forEach((c) => {
    lawChapters.push({ name: c.title, slug: c.slug });
  });

  return lawChapters;
}
