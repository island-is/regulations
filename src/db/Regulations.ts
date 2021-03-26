import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationListItemType } from './types';

export const regulationsPerPage = 100;

export async function getAllRegulations() {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(Regulation);
  const regulations: Array<Regulation> = (await regulationRepository.find()) ?? [];
  return regulations;
}

export async function getRegulationsCount() {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(Regulation);
  const regulationsCount: number =
    (await regulationRepository
      .createQueryBuilder('allregulations')
      // .where({ status: 'text_locked' || 'migrated' })
      .getCount()) ?? 0;
  return regulationsCount;
}

export async function getRegulationsYears() {
  const connection = getManager();
  const years: Array<{ year: number }> =
    (await connection.query(
      'SELECT DISTINCT YEAR(publishedDate) as `year` from Regulation order by `year`',
    )) ?? [];
  return years.map((y) => y.year);
}

export async function getNewestRegulations(skip: number, take: number) {
  const connection = getConnection();
  const regulations: Array<RegulationListItemType> =
    (await connection
      .getRepository(Regulation)
      .createQueryBuilder('regulations')
      .select(['name', 'title', 'publishedDate'])
      // .where({ status: 'text_locked' || 'migrated' })
      .orderBy('publishedDate', 'DESC')
      .skip(skip ?? 0)
      .take(take ?? regulationsPerPage)
      .getRawMany()) ?? [];
  return regulations;
}
