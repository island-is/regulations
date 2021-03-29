import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationListItemType, toIsoDate } from './types';
import { getRegulationMinistry } from './Ministry';

export const regulationsPerPage = 14;

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

type RegulationsList = Array<Pick<Regulation, 'id' | 'name' | 'title' | 'publishedDate'>>;

const augmentRegulations = async (regulations: RegulationsList) => {
  const retRegulations: Array<RegulationListItemType> = [];
  for await (const reg of regulations) {
    const [regMinistry] = await Promise.all([await getRegulationMinistry(reg.id)]);
    const itm: RegulationListItemType = {
      title: reg.title,
      name: reg.name,
      publishedDate: toIsoDate((reg.publishedDate as unknown) as Date),
      ministry: regMinistry,
    };
    retRegulations.push(itm);
  }
  return retRegulations;
};

export async function getNewestRegulations(skip: number, take: number) {
  const connection = getConnection();
  const regulations: RegulationsList =
    (await connection
      .getRepository(Regulation)
      .createQueryBuilder('regulations')
      .select(['id', 'name', 'title', 'publishedDate'])
      // .where({ status: 'text_locked' || 'migrated' })
      .orderBy('publishedDate', 'DESC')
      .skip(skip ?? 0)
      .take(take ?? regulationsPerPage)
      .getRawMany()) ?? [];
  return await augmentRegulations(regulations);
}
