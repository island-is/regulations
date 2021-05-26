import { DB_Regulation, DB_Task } from '../models';
import {
  ISODate,
  RegulationListItem,
  LawChapter,
  RegName,
  Year,
  RegulationYears,
} from '../routes/types';
import { getMinistry } from './Ministry';
import { getLawChapterList } from './LawChapter';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';
import promiseAll from 'qj/promiseAllObject';

export const PER_PAGE = 18;

export async function getAllRegulations() {
  const regulations = (await DB_Regulation.findAll()) ?? [];
  return regulations;
}

export async function getRegulationsCount() {
  const regulationsCount = await DB_Regulation.count();
  return regulationsCount;
}

export async function getRegulationsYears(): Promise<RegulationYears> {
  const years =
    <Array<{ year: Year }>>(
      await db.query(
        'SELECT DISTINCT YEAR(publishedDate) AS `year` FROM Regulation ORDER BY `year` DESC',
        { type: QueryTypes.SELECT },
      )
    ) ?? [];
  return years.map((y) => y.year);
}

// ---------------------------------------------------------------------------

export type SQLRegulationsList = ReadonlyArray<
  Pick<
    DB_Regulation,
    'id' | 'name' | 'type' | 'title' | 'ministryId' | 'publishedDate' | 'effectiveDate'
  > & {
    text?: DB_Regulation['text'];
    migrated?: DB_Task['done'];
  }
>;
export type RegulationListItemFull = Omit<RegulationListItem, 'ministry'> & {
  type: 'amending' | 'base';
  ministry?: RegulationListItem['ministry'];
  text?: DB_Regulation['text'];
  effectiveDate: ISODate;
  lawChapters?: ReadonlyArray<LawChapter>;
};

const augmentRegulationList = async (
  regulations: SQLRegulationsList,
  opts: { text?: boolean; lawChapters?: boolean } = {},
) => {
  const chunkSize = 10;
  const augmentedRegulations: Array<RegulationListItemFull> = [];

  for (let i = 0; i < regulations.length; i += chunkSize) {
    const regChunk = regulations.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const regProms = regChunk.map(async (reg) => {
      const { type, migrated, name, title, text, publishedDate, effectiveDate } = reg;

      const { ministry, lawChapters } = await promiseAll({
        ministry: await getMinistry(reg),
        lawChapters: opts.lawChapters ? await getLawChapterList(reg.id) : undefined,
      });

      const itm: RegulationListItemFull = {
        type: type === 'repealing' ? 'amending' : type,
        title,
        text: !!migrated && opts.text ? text : undefined,
        name,
        publishedDate,
        effectiveDate,
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
      // NOTE: This is leaky - as both title and ministryId might have changed
      attributes: [
        'id',
        'type',
        'name',
        'title',
        'publishedDate',
        'effectiveDate',
        'ministryId',
      ],
      order: [['publishedDate', 'DESC']],
      offset: skip,
      limit: take,
    }) ?? [];

  return await augmentRegulationList(regulations);
}

export async function getAllBaseRegulations(opts?: {
  full?: boolean;
  extra?: boolean;
  includeRepealed?: boolean;
}) {
  const { full, extra, includeRepealed } = opts || {};
  const sql = `
    select
      r.id,
      r.name,
      COALESCE((select title from RegulationChange where regulationId = r.id and date <= now() order by date desc limit 1), r.title) as title,
      ${
        // This is dumb and inefficient repetition, but works. TODO: Make this more fancy with Blackjack and CTEs
        full
          ? 'COALESCE((select text from RegulationChange where regulationId = r.id and date <= now() order by date desc limit 1), r.text) as text,'
          : ''
      }
      t.done as migrated,
      r.type,
      COALESCE((select ministryId from RegulationChange where regulationId = r.id and date <= now() order by date desc limit 1), r.ministryId) as ministryId,
      r.publishedDate,
      r.effectiveDate
    from Regulation as r
    left join Task as t on t.regulationId = r.id
    where
      r.type = 'base'
      ${
        includeRepealed
          ? ''
          : 'and (select date from RegulationCancel where regulationId = r.id limit 1) IS NULL'
      }
    order by r.publishedDate DESC, r.id
  ;`;

  const regulations = <SQLRegulationsList>(
    ((await db.query(sql, { type: QueryTypes.SELECT })) ?? [])
  );

  if (extra) {
    return await augmentRegulationList(regulations, {
      text: true,
      lawChapters: true,
    });
  } else {
    // FIXME: The items in this array have `publishedDate` and `effectiveDate`
    // of type `Date` - not `ISODate`  O_o
    return regulations;
  }
}
