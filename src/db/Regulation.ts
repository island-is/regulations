import htmldiff from 'htmldiff-js';
import { db } from '../utils/sequelize';
import { FindAttributeOptions, Op, QueryTypes } from 'sequelize';
import {
  DB_Regulation,
  DB_RegulationChange,
  DB_RegulationCancel,
  DB_Task,
} from '../models';
import { getMinistry } from './Ministry';
import { getRegulationLawChapters } from './LawChapter';
import {
  HTMLText,
  PlainText,
  ISODate,
  ISODateTime,
  RegName,
  RegulationEffect,
  RegulationHistoryItem,
  RegulationRedirect,
  Regulation,
  RegulationDiff,
} from '../routes/types';
import { extractAppendixesAndComments } from '../utils/extractData';
import { nameToSlug, toISODate } from '../utils/misc';
import promiseAll from '@hugsmidjan/qj/promiseAllObject';
import { FILE_SERVER } from '../constants';
import { readFileSync } from 'fs';

// ---------------------------------------------------------------------------

const toHTML = (textContent: PlainText) =>
  textContent.replace(/>/g, '&lg;') as HTMLText;

const SLOW_DIFF_LIMIT = 1500;

const getDiff = (older: HTMLText, newer: HTMLText, raw?: boolean) => {
  const startTime = Date.now();
  let diffed = htmldiff.execute(older, newer);
  if (!raw) {
    diffed = diffed
      .replace(/<del [^>]+>\n*<\/del>/g, '')
      .replace(/<ins [^>]+>\n*<\/ins>/g, '') as HTMLText;
    // // The old, more aggressive version of the cleanup
    // return diffed
    //   .replace(/<del [^>]+>\s+<\/del>/g, '')
    //   .replace(/<ins [^>]+>\s+<\/ins>/g, '') as HTMLText;
  }
  const time = Date.now() - startTime;
  return {
    diff: diffed as HTMLText,
    time,
    slow: time > SLOW_DIFF_LIMIT,
  };
};

const getTextContentDiff = (older: PlainText, newer: PlainText): HTMLText =>
  older === newer ? toHTML(newer) : getDiff(toHTML(older), toHTML(newer)).diff;

// ---------------------------------------------------------------------------

async function getRegulationByName(
  name: RegName,
  attributes?: FindAttributeOptions,
) {
  const regulation =
    (await DB_Regulation.findOne({
      attributes,
      where: { name },
    })) ?? undefined;
  return regulation;
}

async function getRegulationTask(regulationId: number) {
  const task =
    (await DB_Task.findOne({ where: { regulationId } })) ?? undefined;
  return task;
}

async function getRegulationCancel(regulationId: number) {
  const regulationCancel =
    (await DB_RegulationCancel.findOne({ where: { regulationId } })) ??
    undefined;
  return regulationCancel;
}

type HistoryData = ReadonlyArray<{
  reason: 'root' | 'amend' | 'repeal';
  impactMissing: boolean;
  id: number;
  title: string;
  name: RegName;
  status: string;
  type: 'base' | 'amending';
  effectiveDate: Date;
}>;

async function getRegulationHistory(regulation: DB_Regulation) {
  const historyData = <HistoryData>await db.query(
    'call regulationHistoryByName(:name)',
    {
      replacements: { name: regulation.name },
      type: QueryTypes.RAW,
    },
  );

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
  });

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
  attributes?: FindAttributeOptions,
) {
  const regulationChange =
    (await DB_RegulationChange.findOne({
      attributes,
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
  regulationChange: DB_RegulationChange | undefined,
  pdfVersion: string,
): Promise<Regulation> => {
  const {
    id,
    type,
    name,
    signatureDate,
    publishedDate,
    effectiveDate,
    _externalsource,
    repealedBeacuseReasons,
  } = regulation;

  const {
    ministry,
    history,
    effects,
    lawChapters,
    lastAmendDate,
    repealedDate,
  } = await promiseAll({
    ministry: getMinistry(regulation.ministryId),
    history: getRegulationHistory(regulation),
    effects: getRegulationEffects(id),
    lawChapters: getRegulationLawChapters(id),
    lastAmendDate: getLatestRegulationChange(id).then((change) => change?.date),
    repealedDate: repealedBeacuseReasons
      ? undefined
      : getRegulationCancel(id).then((cancel) => {
          const date = cancel?.date;
          // Skip if repeal/cancellation date is in the future
          if (!date || new Date().toISOString() < date) {
            return;
          }
          return date;
        }),
  });

  const { text, appendixes, comments } = extractAppendixesAndComments(
    regulationChange ? regulationChange.text : regulation.text,
  );

  return {
    type,
    name,
    title: regulationChange ? regulationChange.title : regulation.title,
    text,
    signatureDate,
    publishedDate,
    effectiveDate,
    ministry,
    repealed: !!repealedDate || repealedBeacuseReasons,
    repealedDate,
    appendixes,
    comments,
    lastAmendDate,
    lawChapters,
    history,
    effects,
    originalDoc: _externalsource?.replace(/^http:\/\//, 'https://'),
    pdfVersion,
    // timelineDate: undefined,
    // showingDiff: undefined,
  };
};

const getRegulationRedirect = (
  regulation: DB_Regulation,
): RegulationRedirect => {
  const { name, title, _externalsource } = regulation;
  return {
    name,
    title,
    redirectUrl:
      'https://www.reglugerd.is/reglugerdir/allar/nr/' + nameToSlug(name),
    originalDoc: _externalsource,
  };
};

async function isMigrated(regulation: DB_Regulation) {
  let migrated = false;
  if (regulation.type === 'base') {
    const task = await getRegulationTask(regulation.id);
    migrated = !!task && task.done;
  } else {
    migrated = ['text_locked', 'migrated'].includes(regulation.status);
  }
  return migrated;
}

function isNonCurrent(
  regulation: Regulation,
  regulationVersion?: DB_RegulationChange,
) {
  // Check if we are seeing NON-CURRENT version of a regulation
  // -- `regulationVersion` is undefined but the augmentedRegulation has lastAmendDate
  // -- or there is `regulationVersion` but it does not match lastAmendDate
  // ---- then we assume it's either past or future (non current) regulation and show timelineDate

  return (
    (!regulationVersion && regulation.lastAmendDate) ||
    (regulationVersion && regulationVersion.date !== regulation.lastAmendDate)
  );
}

// ---------------------------------------------------------------------------

const getPdfVersion = (routePath: string) => FILE_SERVER + '/pdf/' + routePath;

// ===========================================================================

export const fetchModifiedDate = async (name: RegName, date?: Date) => {
  const reg = await getRegulationByName(name, ['id', 'publishedDate']);
  if (!reg) {
    return;
  }
  const change =
    date && (await getLatestRegulationChange(reg.id, date, ['date']));
  // FIXME: The database should be updated to contain lastModified/created timestamps
  return ((change ? change.date : reg.publishedDate) +
    'T08:00:00') as ISODateTime;
};

// ===========================================================================

// eslint-disable-next-line complexity
export async function getRegulation(
  regulationName: RegName,
  opts: {
    diff?: boolean;
    date?: Date;
    earlierDate?: Date | 'original';
  },
  routePath: string,
) {
  const { date, diff, earlierDate } = opts;
  const regulation = await getRegulationByName(regulationName);
  if (!regulation) {
    return null;
  }

  const migrated = await isMigrated(regulation);
  if (!migrated) {
    return getRegulationRedirect(regulation);
  }

  const regulationChange =
    date && (await getLatestRegulationChange(regulation.id, date));
  const augmentedRegulation = await augmentRegulation(
    regulation,
    regulationChange,
    getPdfVersion(routePath),
  );

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

  // htmldiff-js has a horrible performance hockey-stick curve
  // and Byggingareglugerð (0112-2012) is crazy large and has
  // huge amount of detailed changes so certain permutaions
  // need to be cached, lest the server timeout.
  // Those cached/static results are stored in the folder "static-diffs/*"
  // This is a horrible, horrible hack, and needs proper resolving
  // upstream with a database table containing pre-rendered html diffs.
  // -- Már @2021-11-08
  if (/\/original$/.test(routePath)) {
    const jsonFileName =
      './static-diffs/' + routePath.replace(/\//g, '-') + '.json';
    try {
      return JSON.parse(
        readFileSync(jsonFileName).toString(),
      ) as RegulationDiff;
    } catch (e) {}
  }
  // Resolve/apply diff

  const diffedRegulation = augmentedRegulation as unknown as RegulationDiff;

  let earlierTitle: Regulation['title'];
  let earlierState: Pick<Regulation, 'text' | 'appendixes' | 'comments'> & {
    date?: ISODate;
  };

  if (!regulationChange) {
    // Here the "active" regulation is the original and any diffing should be against the empty string
    earlierState = extractAppendixesAndComments('' as HTMLText);
    earlierTitle = '';
  } else if (earlierDate === 'original') {
    earlierState = extractAppendixesAndComments(regulation.text);
    earlierTitle = regulation.title;
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
    } else {
      earlierState = extractAppendixesAndComments(regulation.text);
      earlierTitle = regulation.title;
    }
  }

  diffedRegulation.title = getTextContentDiff(
    earlierTitle,
    augmentedRegulation.title,
  );
  diffedRegulation.text = getDiff(
    earlierState.text,
    augmentedRegulation.text,
  ).diff;
  diffedRegulation.comments = getDiff(
    earlierState.comments,
    augmentedRegulation.comments,
  ).diff;
  diffedRegulation.appendixes = augmentedRegulation.appendixes.map(
    (baseAppendix, i) => {
      const { title, text } = earlierState.appendixes[i] || {
        title: '',
        text: '',
      };
      return {
        title: getTextContentDiff(title, baseAppendix.title),
        text: getDiff(text, baseAppendix.text).diff,
      };
    },
  );

  const fromChangeIdx = earlierState.date
    ? diffedRegulation.history.findIndex(
        (item) => item.date === earlierState.date,
      )
    : -1;
  const fromChange = diffedRegulation.history[fromChangeIdx + 1] as
    | RegulationHistoryItem
    | undefined;

  diffedRegulation.showingDiff = {
    // from: earlierState.date || regulation.publishedDate,
    from: fromChange ? fromChange.date : regulation.effectiveDate,
    to: regulationChange ? regulationChange.date : regulation.effectiveDate,
  };

  return diffedRegulation;
}
