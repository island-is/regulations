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

async function getRegulationChanges(regulationId: number) {
  const connection = getConnection();
  const regulationChanges = await connection
    .getRepository(DB_RegulationChange)
    .createQueryBuilder('changes')
    .where('regulationId = :regulationId', { regulationId })
    .orderBy('date', 'DESC')
    .addOrderBy('id', 'ASC')
    .getMany();
  return regulationChanges;
}

const augmentRegulation = async (
  regulation: DB_Regulation,
  regulationChange?: DB_RegulationChange,
) => {
  const { id, type, name, signatureDate, publishedDate, effectiveDate } = regulation;

  const [
    ministry,
    history,
    effects,
    lawChapters,
    lastAmendDate,
    repealedDate,
  ] = await Promise.all([
    getRegulationMinistry(id) ?? undefined,
    type === 'base' ? getRegulationHistory(regulation) : [],
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

  const returnRegulation: Regulation = {
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
  return returnRegulation;
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

function isNonCurrent(regulation: Regulation, regulationChange?: DB_RegulationChange) {
  // Check if we are seeing NON-CURRENT version of 'base' regulation
  // -- `regulationChange` is undefined but the augmentedRegulation has lastAmendDate
  // -- or there is `regulationChange` but it does not match lastAmendDate
  // ---- then we assume it's either past or future non current regulation and show timelineDate

  return (
    regulation.type === 'base' && // Debatable: All amending regulations
    ((!regulationChange && regulation.lastAmendDate) ||
      (regulationChange && regulationChange.date !== regulation.lastAmendDate))
  );
}

// ***

export async function getRegulation(
  regulationName: RegName,
  opts?: {
    diff?: boolean;
    date?: Date;
  },
) {
  const { date, diff } = opts || {};
  const regulation = await getRegulationByName(regulationName);
  if (!regulation) {
    return null;
  }

  const migrated = await isMigrated(regulation);
  if (!migrated) {
    return getRegulationRedirect(regulation);
  }

  if (regulation.type !== 'base') {
    return augmentRegulation(regulation);
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
    const textBefore = regulationChange ? regulation.text : '';
    const textAfter = regulationChange ? regulationChange.text : regulation.text;

    augmentedRegulation.text = htmldiff
      .execute(textBefore, textAfter)
      .replace(/<del [^>]+>\s+<\/del>/g, '')
      .replace(/<ins [^>]+>\s+<\/ins>/g, '');

    augmentedRegulation.showingDiff = {
      from: regulation.effectiveDate,
      to: regulationChange ? regulationChange.date : regulation.effectiveDate,
    };
  }
  return augmentedRegulation;
}
