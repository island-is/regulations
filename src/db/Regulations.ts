import { DB_Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { ISODate, RegulationListItem, LawChapter } from '../routes/types';
import { getRegulationMinistry } from './Ministry';
import { getRegulationLawChapters } from './LawChapter';
import { toISODate } from '../utils/misc';

export const regulationsPerPage = 18;

export async function getAllRegulations() {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(DB_Regulation);
  const regulations: Array<DB_Regulation> = (await regulationRepository.find()) ?? [];
  return regulations;
}

export async function getRegulationsCount() {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(DB_Regulation);
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

type SQLRegulationsList = ReadonlyArray<
  Pick<
    DB_Regulation,
    'id' | 'name' | 'type' | 'title' | 'publishedDate' | 'effectiveDate'
  > & {
    text?: DB_Regulation['text'];
  }
>;
type _RegulationListItem = RegulationListItem & {
  type: 'amending' | 'base';
  text?: string;
  effectiveDate: ISODate;
  lawChapters?: ReadonlyArray<LawChapter>;
};

const augmentRegulations = async (
  regulations: SQLRegulationsList,
  opts: { text?: boolean; ministry?: boolean; lawChapters?: boolean } = {},
) => {
  const chunkSize = 5;
  let augmentedRegulations: Array<_RegulationListItem> = [];

  for (let i = 0; i * chunkSize < regulations.length; i += chunkSize) {
    const regChunk = regulations.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const regProms = regChunk.map(async (reg) => {
      const { type, name, title, text, publishedDate, effectiveDate } = reg;

      const [ministry, lawChapters] = await Promise.all([
        opts.ministry ?? true ? await getRegulationMinistry(reg.id) : undefined,
        opts.lawChapters ? await getRegulationLawChapters(reg.id) : undefined,
      ]);

      const itm: _RegulationListItem = {
        type: type === 'repealing' ? 'amending' : type,
        title,
        text: opts.text ? text : undefined,
        name,
        publishedDate: toISODate(publishedDate) as ISODate,
        effectiveDate: toISODate(effectiveDate) as ISODate,
        ministry,
        lawChapters,
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
  const regulations: SQLRegulationsList =
    (await connection
      .getRepository(DB_Regulation)
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
      r.type,
      r.publishedDate,
      r.effectiveDate
    from Regulation as r
    where
      r.type = 'base'
      and (select done from Task where regulationId = r.id) = true
      and (select date from RegulationCancel where regulationId = r.id limit 1) IS NULL
    order by publishedDate DESC
    ;`;

  const regulations = ((await getManager().query(sql)) ?? []) as SQLRegulationsList;

  if (extra) {
    return await augmentRegulations(regulations, {
      text: true,
      ministry: true,
      lawChapters: true,
    });
  } else {
    // FIXME: The items in this array have `publishedDate` and `effectiveDate`
    // of type `Date` - not `ISODate`  O_o
    return regulations;
  }
}
