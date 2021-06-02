import htmldiff from 'htmldiff-js';
import { db } from '../utils/sequelize';
import { Op, QueryTypes } from 'sequelize';
import {
  DB_Regulation,
  DB_RegulationChange,
  DB_RegulationCancel,
  DB_Task,
} from '../models';
import { getMinistry } from './Ministry';
import { getLawChapterList } from './LawChapter';
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
import promiseAll from 'qj/promiseAllObject';

// ---------------------------------------------------------------------------

const toHTML = (textContent: PlainText) => textContent.replace(/>/g, '&lg;') as HTMLText;

const getDiff = (older: HTMLText, newer: HTMLText, raw?: boolean) => {
  const diffed = htmldiff.execute(older, newer);
  if (raw) {
    return diffed as HTMLText;
  }
  return diffed
    .replace(/<del [^>]+>\n*<\/del>/g, '')
    .replace(/<ins [^>]+>\n*<\/ins>/g, '') as HTMLText;
  // // The old, more aggressive version of the cleanup
  // return diffed
  //   .replace(/<del [^>]+>\s+<\/del>/g, '')
  //   .replace(/<ins [^>]+>\s+<\/ins>/g, '') as HTMLText;
};

const getTextContentDiff = (older: PlainText, newer: PlainText): HTMLText =>
  older === newer ? toHTML(newer) : getDiff(toHTML(older), toHTML(newer));

// ---------------------------------------------------------------------------

async function getRegulationById(regulationId: number) {
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

async function getRegulationTask(regulationId: number) {
  const task = (await DB_Task.findOne({ where: { regulationId } })) ?? undefined;
  return task;
}

async function getRegulationCancel(regulationId: number) {
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
      type: QueryTypes.RAW,
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
  const effectsQuery = `
    select name, title, date, effect from Regulation
    join ((select regulationId, date, 'amend' as effect from RegulationChange where changingId = :changingId)
    union
    (select regulationId, date, 'repeal' as effect from RegulationCancel where changingId = :changingId)) as effects
    on Regulation.id = effects.regulationId
    order by Regulation.publishedDate, Regulation.id
  ;`;
  const effectsData = <EffectsData>await db.query(effectsQuery, {
      replacements: { changingId: regulationId },
      type: QueryTypes.SELECT,
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
  const regulationChange =
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
  return regulationChange;
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

  const { ministry, history, effects, lawChapters, lastAmendDate, repealedDate } =
    await promiseAll({
      ministry: getMinistry(regulationChange || regulation),
      history: getRegulationHistory(regulation),
      effects: getRegulationEffects(id),
      lawChapters: getLawChapterList(id),
      lastAmendDate: getLatestRegulationChange(id).then((change) => change?.date),
      repealedDate: getRegulationCancel(id).then((cancel) => {
        const date = cancel?.date;
        // Skip if repeal/cancellation date is in the future
        if (!date || new Date().toISOString() < date) {
          return;
        }
        return date;
      }),
    });

  const { text, appendixes, comments } = extractAppendixesAndComments(
    regulationChange ? regulationChange?.text : regulation.text,
  );

  return {
    type: type === 'repealing' ? 'amending' : type,
    name,
    title: regulationChange ? regulationChange.title : regulation.title,
    text,
    signatureDate,
    publishedDate,
    effectiveDate,
    ministry,
    repealedDate,
    appendixes,
    comments,
    lastAmendDate,
    lawChapters: lawChapters ?? [],
    history,
    effects,
    // timelineDate: undefined,
    // showingDiff: undefined,
  };
};

const getRegulationRedirect = (regulation: DB_Regulation): RegulationRedirect => {
  const { name, title } = regulation;
  return {
    name,
    title,
    redirectUrl: 'https://www.reglugerd.is/reglugerdir/allar/nr/' + nameToSlug(name),
  };
};

async function isMigrated(regulation: DB_Regulation) {
  let migrated = false;
  if (regulation.type === 'base') {
    const task = await getRegulationTask(regulation.id);
    migrated = !!task && task.done;
  } else if (regulation.type === 'amending') {
    migrated = ['text_locked', 'migrated'].includes(regulation.status);
  } else {
    /* The regulation is of type 'repealing' which isn't really a thing and should just be ignored. */
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
  if (!regulation) {
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
      ? regulationChange.date
      : augmentedRegulation.effectiveDate;
  }

  if (!diff) {
    return augmentedRegulation;
  }

  // Resolve/apply diff

  const diffedRegulation = augmentedRegulation as unknown as RegulationDiff;

  let earlierMinistry: Regulation['ministry'] | undefined;
  let earlierTitle: Regulation['title'];
  let earlierState: Pick<Regulation, 'text' | 'appendixes' | 'comments'> & {
    date?: ISODate;
  };

  const _getMinistry = (regOrChange: DB_Regulation | DB_RegulationChange) =>
    // reuse already fetched ministry if possible
    regOrChange.ministryId === (regulationChange || regulation).ministryId
      ? Promise.resolve(augmentedRegulation.ministry)
      : getMinistry(regOrChange);

  if (!regulationChange) {
    // Here the "active" regulation is the original and any diffing should be against the empty string
    earlierState = extractAppendixesAndComments('');
    earlierTitle = '';
    earlierMinistry = undefined;
  } else if (earlierDate === 'original') {
    earlierState = extractAppendixesAndComments(regulation.text);
    earlierTitle = regulation.title;
    earlierMinistry = await _getMinistry(regulation);
  } else {
    let eDate = earlierDate;
    if (!eDate) {
      eDate = new Date(regulationChange.date);
      eDate.setDate(eDate.getDate() - 1);
    }
    const change = await getLatestRegulationChange(regulation.id, eDate);

    if (change) {
      earlierState = {
        ...extractAppendixesAndComments(change.text),
        date: change.date,
      };
      earlierTitle = change.title;
      earlierMinistry = await _getMinistry(change);
    } else {
      earlierState = extractAppendixesAndComments(regulation.text);
      earlierTitle = regulation.title;
      earlierMinistry = await _getMinistry(regulation);
    }
  }

  diffedRegulation.title = getTextContentDiff(earlierTitle, augmentedRegulation.title);
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
  diffedRegulation.prevMinistry = earlierMinistry || null;

  const fromChangeIdx = earlierState.date
    ? diffedRegulation.history.findIndex((item) => item.date === earlierState.date)
    : -1;
  const fromChange = diffedRegulation.history[fromChangeIdx + 1];

  diffedRegulation.showingDiff = {
    // from: earlierState.date || regulation.publishedDate,
    from: fromChange ? fromChange.date : regulation.effectiveDate,
    to: regulationChange ? regulationChange.date : regulation.effectiveDate,
  };

  return diffedRegulation;
}
