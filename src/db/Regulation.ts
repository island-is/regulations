import htmldiff from 'htmldiff-js';
import { DB_Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { DB_RegulationChange } from '../entity/RegulationChange';
import { getRegulationMinistry } from './Ministry';
import { DB_RegulationCancel } from '../entity/RegulationCancel';
import { getRegulationLawChapters } from './LawChapter';
import { DB_RegulationTasks } from '../entity/RegulationTasks';
import {
  ISODate,
  RegName,
  RegulationEffect,
  RegulationHistoryItem,
  RegulationRedirect,
  Regulation,
} from '../routes/types';
import { extractAppendixesAndComments } from '../utils/extractData';
import { nameToSlug, toISODate } from '../utils/misc';

const getDiff = (older: string, newer: string) =>
  htmldiff
    .execute(older, newer)
    .replace(/<del [^>]+>\s+<\/del>/g, '')
    .replace(/<ins [^>]+>\s+<\/ins>/g, '');

async function getRegulationById(regulationId: number) {
  if (!regulationId) {
    return;
  }
  const regulationRepository = getConnection().getRepository(DB_Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { id: regulationId },
    })) ?? undefined;
  return regulation;
}

async function getRegulationByName(name: RegName) {
  const regulationRepository = getConnection().getRepository(DB_Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { name },
    })) ?? undefined;
  return regulation;
}

async function getRegulationTasks(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const taskRepository = getConnection().getRepository(DB_RegulationTasks);
  const task = await taskRepository.findOne({ where: { regulationId } });
  return task;
}

async function getRegulationCancel(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const regulationCancel = await getConnection()
    .getRepository(DB_RegulationCancel)
    .findOne({ where: { regulationId } });

  return regulationCancel;
}

async function getRegulationHistory(regulation: DB_Regulation) {
  const historyData: ReadonlyArray<{
    reason: 'root' | 'amend' | 'repeal';
    impactMissing: boolean;
    id: number;
    title: string;
    name: RegName;
    status: string;
    type: 'base' | 'amending' | 'repealing';
    effectiveDate: Date;
  }> =
    (
      await getManager().query('call regulationHistoryByName(?)', [regulation.name])
    )?.[0] ?? [];

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

async function getRegulationEffects(regulationId: number) {
  const effectsQuery = `select name, title, date, effect from Regulation
  join ((select regulationId, date, 'amend' as effect from RegulationChange where changingId = ?)
  union
  (select regulationId, date, 'repeal' as effect from RegulationCancel where changingId = ?)) as effects
  on Regulation.id = effects.regulationId
  order by Regulation.publishedDate, Regulation.id
  ;`;
  const effectsData: ReadonlyArray<{
    name: RegName;
    title: string;
    date: Date;
    effect: 'amend' | 'repeal';
  }> = (await getManager().query(effectsQuery, [regulationId, regulationId])) ?? [];

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
  const regulationChanges = await getConnection()
    .getRepository(DB_RegulationChange)
    .createQueryBuilder('changes')
    .orderBy('date', 'DESC')
    .addOrderBy('id', 'ASC')
    .where('regulationId = :regulationId', { regulationId })
    .andWhere('date <= :before')
    .setParameters({ before: beforeDate.toISOString() })
    .getOne();
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
    regulationChange ? regulationChange?.text : regulation.text,
  );

  return {
    type: type === 'repealing' ? 'amending' : type,
    name,
    title: /* regulationChange?.title ||*/ regulation.title,
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

async function isMigrated(regulation?: DB_Regulation) {
  let migrated = false;
  if (regulation?.type === 'base') {
    const tasks = await getRegulationTasks(regulation.id);
    migrated = tasks?.done || false;
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
  if (isNonCurrent(augmentedRegulation, regulationChange)) {
    augmentedRegulation.timelineDate = regulationChange
      ? regulationChange.date
      : augmentedRegulation.effectiveDate;
  }

  if (diff) {
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
            date: change.date,
          }
        : extractAppendixesAndComments(regulation.text);
    }

    augmentedRegulation.text = getDiff(earlierState.text, augmentedRegulation.text);
    augmentedRegulation.comments = getDiff(
      earlierState.comments,
      augmentedRegulation.comments,
    );
    augmentedRegulation.appendixes = augmentedRegulation.appendixes.map(
      (baseAppendix, i) => {
        const { title, text } = earlierState.appendixes[i] || {};
        return {
          title: getDiff(title, baseAppendix.title),
          text: getDiff(text, baseAppendix.text),
        };
      },
    );

    augmentedRegulation.showingDiff = {
      from: earlierState.date || regulation.publishedDate,
      to: regulationChange ? regulationChange.date : regulation.effectiveDate,
    };
  }
  return augmentedRegulation;
}
