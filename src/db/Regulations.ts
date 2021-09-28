import { DB_Regulation, DB_Task } from '../models';
import {
  ISODate,
  RegulationListItem,
  LawChapter,
  Year,
  RegulationYears,
} from '../routes/types';
import { getMinistry } from './Ministry';
import { getRegulationLawChapters } from './LawChapter';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';
import promiseAll from 'qj/promiseAllObject';
import { eliminateComments } from '../utils/extractData';

export const PER_PAGE = 30;

export const getAllRegulations = () => DB_Regulation.findAll();

export async function getRegulationsCount() {
  const regulationsCount = await DB_Regulation.count();
  return regulationsCount;
}

export async function getRegulationsYears(): Promise<RegulationYears> {
  const years = await db.query<{ year: Year }>(
    'SELECT DISTINCT YEAR(publishedDate) AS `year` FROM Regulation ORDER BY `year` DESC',
    { type: QueryTypes.SELECT },
  );
  return years.map((y) => y.year);
}

// ---------------------------------------------------------------------------

type SQLRegulationsItem = Pick<
  DB_Regulation,
  | 'id'
  | 'name'
  | 'type'
  | 'title'
  | 'ministryId'
  | 'publishedDate'
  | 'effectiveDate'
> & {
  repealedDate?: ISODate | null;
  text?: DB_Regulation['text'];
  migrated?: DB_Task['done'];
};

export type SQLRegulationsList = ReadonlyArray<SQLRegulationsItem>;

export type RegulationListItemFull = Omit<RegulationListItem, 'ministry'> & {
  type: 'amending' | 'base';
  ministry?: RegulationListItem['ministry'];
  text?: DB_Regulation['text'];
  effectiveDate: ISODate;
  repealedDate?: ISODate | null;
  repealed?: boolean | null;
  lawChapters?: ReadonlyArray<LawChapter>;
};

const augmentRegulationList = async (
  regulations: SQLRegulationsList,
  opts: { text?: boolean; lawChapters?: boolean; ministry?: boolean } = {},
) => {
  const chunkSize = 200;
  const augmentedRegulations: Array<RegulationListItemFull> = [];
  const today = new Date();

  for (let i = 0; i < regulations.length; i += chunkSize) {
    console.info(`- Augmenting chunk ${i} - ${i + chunkSize}`);
    const regChunk = regulations.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const regProms = regChunk.map(async (reg) => {
      const {
        type,
        migrated,
        name,
        title,
        text,
        publishedDate,
        effectiveDate,
        repealedDate,
      } = reg;

      const { ministry, lawChapters } = await promiseAll({
        ministry: opts.ministry ? await getMinistry(reg.ministryId) : undefined,
        lawChapters: opts.lawChapters
          ? await getRegulationLawChapters(reg.id)
          : undefined,
      });

      const textWithoutComments =
        !!migrated && opts.text && text ? eliminateComments(text) : undefined;

      const itm: RegulationListItemFull = {
        type,
        title,
        text: textWithoutComments,
        name,
        publishedDate,
        effectiveDate,
        repealedDate: repealedDate ?? undefined,
        repealed: repealedDate ? new Date(repealedDate) <= today : false,
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

export async function getNewestRegulations(opts: {
  skip?: number;
  take?: number;
}) {
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
    order: [
      ['publishedDate', 'DESC'],
      ['id', 'DESC'],
    ],
    offset: skip,
    limit: take,
  });

  return await augmentRegulationList(regulations, { ministry: true });
}

/**
 * Returns all base regulations
 * @param {boolean} full - Include text and minitry info
 * @param {boolean} extra - Also includes lawchapter info
 * @param {boolean} includeRepealed - Include amending and repealed regulations
 * @returns {SQLRegulationsList | RegulationListItemFull[]}
 */
export async function getAllBaseRegulations(opts?: {
  full?: boolean;
  extra?: boolean;
  includeRepealed?: boolean;
  nameFilter?: string; // format: "'RegName','RegName','RegName'" ... used for indexing specific regulations
}) {
  const { full, extra, includeRepealed, nameFilter } = opts || {};

  const whereConds: Array<string> = [];

  if (!includeRepealed) {
    whereConds.push(
      `r.type = 'base' and (select date from RegulationCancel where regulationId = r.id limit 1) IS NULL`,
    );
  }
  if (nameFilter) {
    whereConds.push(`r.name IN ("${nameFilter}")`);
  }

  const sql = `
    select
      r.id,
      r.name,
      COALESCE((select title from RegulationChange where regulationId = r.id and date <= now() and title != '' order by date desc limit 1), r.title) as title,
      ${
        // Inefficient repetition, but works. TODO: Make this more fancy with Blackjack and CTEs??
        full || extra
          ? 'COALESCE((select text from RegulationChange where regulationId = r.id and date <= now() and text != "" order by date desc limit 1), r.text) as text,'
          : ''
      }
      t.done as migrated,
      r.type,
      COALESCE((select ministryId from RegulationChange where regulationId = r.id and date <= now() order by date desc limit 1), r.ministryId) as ministryId,
      r.publishedDate,
      ${includeRepealed ? 'c.date as repealedDate,' : ''}
      r.effectiveDate
    from Regulation as r
    ${
      includeRepealed
        ? 'left join RegulationCancel as c on c.regulationId = r.id'
        : ''
    }
    left join Task as t on t.regulationId = r.id
    ${whereConds.length ? 'where ' + whereConds.join(' and ') : ''}
    order by r.publishedDate DESC, r.id DESC
  ;`;

  let regulations = await db.query<SQLRegulationsItem>(sql, {
    type: QueryTypes.SELECT,
  });

  // FIXME: Remove this block once the Reglugerðagrunnur has been cleaned up
  // so that RegulationCancel.regulationId values are unique
  // (i.e. only one cancellation per regulation).
  if (includeRepealed) {
    const found: Record<string, true | undefined> = {};
    regulations = regulations.filter((item) => {
      if (!found[item.name]) {
        found[item.name] = true;
        return true;
      }
    });
  }

  return await augmentRegulationList(regulations, {
    text: full || extra,
    ministry: full || extra,
    lawChapters: extra,
  });
}
