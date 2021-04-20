import { Regulation as DB_Regulation } from '../models/Regulation';
import { ISODate, RegulationListItem, LawChapter, RegName } from '../routes/types';
import { getRegulationMinistry } from './Ministry';
import { getRegulationLawChapters } from './LawChapter';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';

export const PER_PAGE = 18;

export async function getAllRegulations() {
  const regulations = (await DB_Regulation.findAll()) ?? [];
  return regulations;
}

export async function getRegulationsCount() {
  const regulationsCount = await DB_Regulation.count();
  return regulationsCount;
}

export async function getRegulationsYears() {
  const years =
    <Array<{ year: number }>>(
      await db.query(
        'SELECT DISTINCT YEAR(publishedDate) AS `year` FROM Regulation ORDER BY `year` DESC',
        { type: QueryTypes.SELECT },
      )
    ) ?? [];
  return years.map((y) => y.year);
}

// ---------------------------------------------------------------------------

type SQLRegulationsList = ReadonlyArray<
  Pick<
    DB_Regulation,
    'id' | 'name' | 'type' | 'title' | 'publishedDate' | 'effectiveDate'
  > & {
    text?: DB_Regulation['text'];
  }
>;
export type RegulationListItemFull = RegulationListItem & {
  type: 'amending' | 'base';
  text?: DB_Regulation['text'];
  effectiveDate: ISODate;
  lawChapters?: ReadonlyArray<LawChapter>;
};

const augmentRegulations = async (
  regulations: SQLRegulationsList,
  opts: { text?: boolean; ministry?: boolean; lawChapters?: boolean } = {},
) => {
  const chunkSize = 20;
  const augmentedRegulations: Array<RegulationListItemFull> = [];

  for (let i = 0; i < regulations.length; i += chunkSize) {
    const regChunk = regulations.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const regProms = regChunk.map(async (reg) => {
      const { type, name, title, text, publishedDate, effectiveDate } = reg;

      const [ministry, lawChapters] = await Promise.all([
        opts.ministry ?? true ? await getRegulationMinistry(reg.id) : undefined,
        opts.lawChapters ? await getRegulationLawChapters(reg.id) : undefined,
      ]);

      const itm: RegulationListItemFull = {
        type: (type === 'repealing' ? 'amending' : type) as 'amending' | 'base',
        title,
        text: opts.text ? text : undefined,
        name: name as RegName,
        publishedDate: publishedDate as ISODate,
        effectiveDate: effectiveDate as ISODate,
        ministry,
        lawChapters,
      };
      return itm;
    });

    // eslint-disable-next-line no-await-in-loop
    const augmentedChunk = await Promise.all(regProms);

    augmentedRegulations.push(...augmentedChunk);
  }

  return augmentedRegulations;
};

// ---------------------------------------------------------------------------

export async function getNewestRegulations(opts: { skip?: number; take?: number }) {
  const { skip = 0, take = PER_PAGE } = opts;

  const regulations = <SQLRegulationsList>await DB_Regulation.findAll({
      attributes: ['id', 'type', 'name', 'title', 'publishedDate', 'effectiveDate'],
      order: [['publishedDate', 'DESC']],
      offset: skip,
      limit: take,
    }) ?? [];

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
    order by publishedDate DESC, id
    ;`;

  const regulations = <SQLRegulationsList>(
    ((await db.query(sql, { type: QueryTypes.SELECT })) ?? [])
  );

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
