import { LawChapter } from '../entity/LawChapter';
import { getConnection } from 'typeorm';

export async function getAllLawChapters() {
  const connection = getConnection();
  const lawChapters =
    (await connection
      .getRepository(LawChapter)
      .createQueryBuilder('lawchapters')
      .orderBy('slug', 'ASC')
      .getMany()) ?? [];
  return lawChapters;
}
