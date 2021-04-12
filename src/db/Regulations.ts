import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationListItemType, toIsoDate } from './types';
import { getRegulationMinistry } from './Ministry';
import { getRegulationLawChapters } from './LawChapter';

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
      'SELECT DISTINCT YEAR(publishedDate) AS `year` FROM Regulation ORDER BY `year` DESC',
    )) ?? [];
  return years.map((y) => y.year);
}

type RegulationsList = Array<
  Pick<
    Regulation,
    'id' | 'type' | 'name' | 'title' | 'text' | 'publishedDate' | 'effectiveDate'
  >
>;

const augmentRegulations = async (
  regulations: RegulationsList,
  opts: { text?: boolean; ministry?: boolean; lawChapters?: boolean } = {},
) => {
  const { ministry = true, text = false, lawChapters = false } = opts;
  const chunkSize = 5;
  let augmentedRegulations: Array<RegulationListItemType> = [];

  for (let i = 0; i * chunkSize < regulations.length; i += chunkSize) {
    const regChunk = regulations.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const regProms = regChunk.map(async (reg) => {
      const [regMinistry, regLawChapters] = await Promise.all([
        ministry ? await getRegulationMinistry(reg.id) : undefined,
        lawChapters ? await getRegulationLawChapters(reg.id) : undefined,
      ]);

      const itm: RegulationListItemType = {
        type: reg.type,
        title: reg.title,
        text: text ? reg.text : undefined,
        name: reg.name,
        publishedDate: toIsoDate((reg.publishedDate as unknown) as Date),
        effectiveDate: toIsoDate((reg.effectiveDate as unknown) as Date),
        ministry: regMinistry,
        lawChapters: regLawChapters,
      };
      return itm;
    });

    // eslint-disable-next-line no-await-in-loop
    const augmentedChunk = await Promise.all(regProms);

    augmentedRegulations = augmentedRegulations.concat(augmentedChunk);
  }

  return augmentedRegulations;
};

export async function getNewestRegulations(opts: { skip?: number; take?: number }) {
  const { skip = 0, take = regulationsPerPage } = opts;
  const connection = getConnection();
  const regulations: RegulationsList =
    (await connection
      .getRepository(Regulation)
      .createQueryBuilder('regulations')
      .select(['id', 'type', 'name', 'title', 'publishedDate', 'effectiveDate'])
      .orderBy('publishedDate', 'DESC')
      .skip(skip)
      .take(take)
      .getRawMany()) ?? [];
  return await augmentRegulations(regulations);
}

export async function getAllBaseRegulations(
  opts: { full?: boolean; extra?: boolean } = {},
) {
  const { full = false, extra = false } = opts;
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
      r.publishedDate,
      r.effectiveDate
    from Regulation as r
    where
      r.type = 'base'
      and (select done from Task where regulationId = r.id) = true
      and (select date from RegulationCancel where regulationId = r.id limit 1) IS NULL
    order by publishedDate DESC
    ;`;

  const regulations = ((await getManager().query(sql)) ?? []) as RegulationsList;

  if (extra) {
    return await augmentRegulations(regulations, {
      text: true,
      ministry: true,
      lawChapters: true,
    });
  } else {
    return regulations;
  }
}
