import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationListItemType, toIsoDate } from './types';
import { getRegulationMinistry } from './Ministry';

export const regulationsPerPage = 18;

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
  const years: Array<{ year: number }> =
    (await getManager().query(
      'SELECT DISTINCT YEAR(publishedDate) as `year` from Regulation order by `year`',
    )) ?? [];
  return years.map((y) => y.year);
}

type RegulationsList = Array<
  Pick<Regulation, 'id' | 'type' | 'name' | 'title' | 'text' | 'publishedDate'>
>;

const augmentRegulations = async (regulations: RegulationsList) => {
  const retRegulations: Array<RegulationListItemType> = [];
  for await (const reg of regulations) {
    const regMinistry = await getRegulationMinistry(reg.id);

    const itm: RegulationListItemType = {
      type: reg.type,
      title: reg.title,
      name: reg.name,
      publishedDate: toIsoDate((reg.publishedDate as unknown) as Date),
      ministry: regMinistry,
    };
    retRegulations.push(itm);
  }
  return retRegulations;
};

export async function getNewestRegulations(opts: { skip?: number; take?: number }) {
  const { skip = 0, take = regulationsPerPage } = opts;
  const connection = getConnection();
  const regulations: RegulationsList =
    (await connection
      .getRepository(Regulation)
      .createQueryBuilder('regulations')
      .select(['id', 'type', 'name', 'title', 'publishedDate'])
      .orderBy('publishedDate', 'DESC')
      .skip(skip)
      .take(take)
      .getRawMany()) ?? [];
  return await augmentRegulations(regulations);
}

export async function getAllBaseRegulations(opts: { full?: boolean } = {}) {
  const { full = false } = opts;
  const sql = `
    select
      r.id,
      r.name,
      r.title,
      ${
        full
          ? 'COALESCE((select text from RegulationChange where regulationId = r.id and date <= now() order by date desc limit 1), text) as text,'
          : ''
      }
      r.effectiveDate
    from Regulation as r
    where
      r.type = 'base'
      and (select done from Task where regulationId = r.id) = true
      and (select date from RegulationCancel where regulationId = r.id limit 1) IS NULL
    order by effectiveDate DESC
    ;`;

  return ((await getManager().query(sql)) ?? []) as RegulationsList;
}
