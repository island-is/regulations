import htmldiff from 'htmldiff-js';
import { Regulation as DB_Regulation } from '../models/Regulation';
import { RegulationChange as DB_RegulationChange } from '../models/RegulationChange';
import { getRegulationMinistry } from './Ministry';
import { RegulationCancel as DB_RegulationCancel } from '../models/RegulationCancel';
import { getRegulationLawChapters } from './LawChapter';
import { Task as DB_RegulationTasks } from '../models/Task';
import { db } from '../utils/sequelize';
import util from 'util';
import { Op } from 'sequelize';
import {
  HTMLText,
  PlainText,
  ISODate,
  RegName,
  RegulationEffect,
  RegulationHistoryItem,
  RegulationRedirect,
  Regulation,
  RegulationDiff,
} from '../routes/types';
import { extractAppendixesAndComments } from '../utils/extractData';
import { nameToSlug, toISODate } from '../utils/misc';

// ---------------------------------------------------------------------------

const toHTML = (textContent: PlainText) => textContent.replace(/>/g, '&lg;') as HTMLText;

const getDiff = (older: HTMLText, newer: HTMLText) =>
  htmldiff
    .execute(older, newer)
    .replace(/<del [^>]+>\s+<\/del>/g, '')
    .replace(/<ins [^>]+>\s+<\/ins>/g, '') as HTMLText;

const getTextContentDiff = (older: PlainText, newer: PlainText): HTMLText =>
  older === newer ? toHTML(newer) : getDiff(toHTML(older), toHTML(newer));

// ---------------------------------------------------------------------------

async function getRegulationById(regulationId: number) {
  if (!regulationId) {
    return;
  }
  const regulation =
    (await DB_Regulation.findOne({
      where: { id: regulationId },
    })) ?? undefined;
  return regulation;
}

async function getRegulationByName(name: RegName) {
  const regulation =
    (await DB_Regulation.findOne({
      where: { name },
    })) ?? undefined;
  return regulation;
}

async function getRegulationTasks(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const task =
    (await DB_RegulationTasks.findOne({ where: { regulationId } })) ?? undefined;
  return task;
}

async function getRegulationCancel(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const regulationCancel =
    (await DB_RegulationCancel.findOne({ where: { regulationId } })) ?? undefined;

  return regulationCancel;
}

type HistoryData = ReadonlyArray<{
  reason: 'root' | 'amend' | 'repeal';
  impactMissing: boolean;
  id: number;
  title: string;
  name: RegName;
  status: string;
  type: 'base' | 'amending' | 'repealing';
  effectiveDate: Date;
}>;

async function getRegulationHistory(regulation: DB_Regulation) {
  const historyData = <HistoryData>await db.query('call regulationHistoryByName(:name)', {
      replacements: { name: regulation.name },
    }) ?? [];

  return (
    historyData
      // strip off the 'root' item
      .slice(1)
      .map(
        ({ name, title, reason, effectiveDate }): RegulationHistoryItem => ({
          date: toISODate(effectiveDate) as ISODate,
          name,
          title,
          effect: reason as Exclude<typeof reason, 'root'>, // root has already been hacked off by slice above
        }),
      )
  );
}

type EffectsData = ReadonlyArray<{
  name: RegName;
  title: string;
  date: Date;
  effect: 'amend' | 'repeal';
}>;
async function getRegulationEffects(regulationId: number) {
  const effectsQuery = `select name, title, date, effect from Regulation
  join ((select regulationId, date, 'amend' as effect from RegulationChange where changingId = :changingId)
  union
  (select regulationId, date, 'repeal' as effect from RegulationCancel where changingId = :changingId)) as effects
  on Regulation.id = effects.regulationId
  order by Regulation.publishedDate, Regulation.id
  ;`;
  const effectsData = <EffectsData>await db.query(effectsQuery, {
      replacements: { changingId: regulationId },
    }) ?? [];

  return effectsData.map(
    ({ date, name, title, effect }): RegulationEffect => ({
      date: toISODate(date) as ISODate,
      name,
      title,
      effect,
    }),
  );
}

async function getLatestRegulationChange(
  regulationId: number,
  beforeDate: Date = new Date(),
) {
  const regulationChanges =
    (await DB_RegulationChange.findOne({
      where: {
        regulationId: regulationId,
        date: {
          [Op.lte]: beforeDate,
        },
      },
      order: [
        ['date', 'DESC'],
        ['id', 'ASC'],
      ],
    })) ?? undefined;
  return regulationChanges;
}

// async function getRegulationChanges(regulationId: number) {
//   const connection = getConnection();
//   const regulationChanges = await connection
//     .getRepository(DB_RegulationChange)
//     .createQueryBuilder('changes')
//     .where('regulationId = :regulationId', { regulationId })
//     .orderBy('date', 'DESC')
//     .addOrderBy('id', 'ASC')
//     .getMany();
//   return regulationChanges;
// }

// ---------------------------------------------------------------------------

const augmentRegulation = async (
  regulation: DB_Regulation,
  regulationChange?: DB_RegulationChange,
): Promise<Regulation> => {
  const { id, type, name, signatureDate, publishedDate, effectiveDate } = regulation;

  if (!id) {
    return (regulation as unknown) as Regulation;
  }

  const [
    ministry,
    history,
    effects,
    lawChapters,
    lastAmendDate,
    repealedDate,
  ] = await Promise.all([
    getRegulationMinistry(id),
    getRegulationHistory(regulation),
    getRegulationEffects(id),
    getRegulationLawChapters(id),
    getLatestRegulationChange(id).then((change) => change?.date),
    getRegulationCancel(id).then((cancel) => {
      const date = cancel?.date;
      // Skip if repeal/cancellation date is in the future
      if (!date || new Date().toISOString() < date) {
        return;
      }
      return date;
    }),
  ]);

  const { text, appendixes, comments } = extractAppendixesAndComments(
    (regulationChange ? regulationChange?.text : regulation.text) as HTMLText,
  );

  return {
    type: (type === 'repealing' ? 'amending' : type) as 'base' | 'amending',
    name: name as RegName,
    title: /* regulationChange?.title ||*/ regulation.title,
    text,
    signatureDate: signatureDate as ISODate,
    publishedDate: publishedDate as ISODate,
    effectiveDate: effectiveDate as ISODate,
    ministry,
    repealedDate: repealedDate as ISODate,
    appendixes,
    comments,
    lastAmendDate: lastAmendDate as ISODate,
    lawChapters: lawChapters ?? [],
    history,
    effects,
    // timelineDate: undefined,
    // showingDiff: undefined,
  };
};

const getRegulationRedirect = (regulation: DB_Regulation): RegulationRedirect => {
  const name = regulation.name as RegName;
  return {
    name: name,
    title: regulation.title,
    redirectUrl: 'https://www.reglugerd.is/reglugerdir/allar/nr/' + nameToSlug(name),
  };
};

async function isMigrated(regulation?: DB_Regulation) {
  let migrated = false;
  if (regulation?.type === 'base') {
    const tasks = await getRegulationTasks(regulation.id);
    migrated = !!tasks?.done || false;
  } else if (regulation?.type === 'amending') {
    migrated = ['text_locked', 'migrated'].includes(regulation.status);
  }
  return migrated;
}

function isNonCurrent(regulation: Regulation, regulationVersion?: DB_RegulationChange) {
  // Check if we are seeing NON-CURRENT version of a regulation
  // -- `regulationVersion` is undefined but the augmentedRegulation has lastAmendDate
  // -- or there is `regulationVersion` but it does not match lastAmendDate
  // ---- then we assume it's either past or future (non current) regulation and show timelineDate

  return (
    (!regulationVersion && regulation.lastAmendDate) ||
    (regulationVersion && regulationVersion.date !== regulation.lastAmendDate)
  );
}

// ***

// eslint-disable-next-line complexity
export async function getRegulation(
  regulationName: RegName,
  opts?: {
    diff?: boolean;
    date?: Date;
    earlierDate?: Date | 'original';
  },
) {
  const { date, diff, earlierDate } = opts || {};
  const regulation = await getRegulationByName(regulationName);
  if (!regulation || !regulation.id) {
    return null;
  }

  const migrated = await isMigrated(regulation);
  if (!migrated) {
    return getRegulationRedirect(regulation);
  }

  const regulationChange = date && (await getLatestRegulationChange(regulation.id, date));
  const augmentedRegulation = await augmentRegulation(regulation, regulationChange);

  // Add timelineDate if regulation is NON-CURRENT
  // or has an earlierDate that's not "original"
  //
  // Augmented regulation needs timelineDate:
  //
  //  * false === /:name/current
  //  * false === /:name/diff
  //  * true === /:name/original
  //  * false === /:name/d/:lastAmendDate   (same as /:name/current)
  //  * true === /:name/d/:lastAmendDate/diff
  //  * false === /:name/d/:lastAmendDate/diff/original   (same as /:name/diff)
  //  * true === /:name/d/:lastAmendDate/diff/:earlierDate
  //  * true === /:name/d/:lastAmendDate/diff/:originalPublishedDate
  const needsTimelineDate =
    isNonCurrent(augmentedRegulation, regulationChange) ||
    (diff && (!earlierDate || earlierDate !== 'original'));

  if (needsTimelineDate) {
    augmentedRegulation.timelineDate = regulationChange
      ? (regulationChange.date as ISODate)
      : augmentedRegulation.effectiveDate;
  }

  if (!diff) {
    return augmentedRegulation;
  }

  const diffedRegulation = (augmentedRegulation as unknown) as RegulationDiff;

  let earlierState: Pick<Regulation, 'text' | 'appendixes' | 'comments'> & {
    date?: ISODate;
  };

  if (!regulationChange) {
    // Here the "active" regulation is the original and any diffing should be against the empty string
    earlierState = extractAppendixesAndComments('');
  } else if (earlierDate === 'original') {
    earlierState = extractAppendixesAndComments(regulation.text);
  } else {
    let eDate = earlierDate;
    if (!eDate) {
      eDate = new Date(regulationChange.date);
      eDate.setDate(eDate.getDate() - 1);
    }
    const change = await getLatestRegulationChange(regulation.id, eDate);
    earlierState = change
      ? {
          ...extractAppendixesAndComments(change.text),
          date: change.date as ISODate,
        }
      : extractAppendixesAndComments(regulation.text);
  }

  diffedRegulation.title = toHTML(augmentedRegulation.title);
  // TODO:
  // diffedRegulation.title = getTextContentDiff(
  //   earlierState.title,
  //   diffedRegulation.title,
  // );
  diffedRegulation.text = getDiff(earlierState.text, augmentedRegulation.text);
  diffedRegulation.comments = getDiff(
    earlierState.comments,
    augmentedRegulation.comments,
  );
  diffedRegulation.appendixes = augmentedRegulation.appendixes.map((baseAppendix, i) => {
    const { title, text } = earlierState.appendixes[i] || { title: '', text: '' };
    return {
      title: getTextContentDiff(title, baseAppendix.title),
      text: getDiff(text, baseAppendix.text),
    };
  });

  diffedRegulation.showingDiff = {
    from: (earlierState.date || regulation.publishedDate) as ISODate,
    to: (regulationChange ? regulationChange.date : regulation.effectiveDate) as ISODate,
  };

  return diffedRegulation;
}
