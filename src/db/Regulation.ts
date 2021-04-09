import htmldiff from 'htmldiff-js';
import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationChange } from '../entity/RegulationChange';
import { getRegulationMinistry } from './Ministry';
import { RegulationCancel } from '../entity/RegulationCancel';
import { getRegulationLawChapters } from './LawChapter';
import { RegulationTasks } from '../entity/RegulationTasks';
import {
  ISODate,
  MinistryType,
  RegName,
  RegulationEffectType,
  RegulationHistoryItemType,
  RegulationRedirectType,
  RegulationType,
} from './types';
import { extractAppendixesAndComments } from '../utils/extractData';
import { nameToSlug, toISODate } from '../utils/misc';

export type RegulationHistoryItem = {
  date: string;
  name: string;
  title: string;
  reason: string;
};

async function getRegulationById(regulationId: number) {
  if (!regulationId) {
    return;
  }
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { id: regulationId },
    })) ?? undefined;
  return regulation;
}

async function getRegulationByName(name: RegName) {
  const regulationRepository = getConnection().getRepository(Regulation);
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
  const taskRepository = getConnection().getRepository(RegulationTasks);
  const task = await taskRepository.findOne({ where: { regulationId } });
  return task;
}

async function getRegulationCancel(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const regulationCancel = await getConnection()
    .getRepository(RegulationCancel)
    .findOne({ where: { regulationId } });

  return regulationCancel;
}

async function getRegulationHistory(regulation: Regulation) {
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
        ({ name, title, reason, effectiveDate }): RegulationHistoryItemType => ({
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
    ({ date, name, title, effect }): RegulationEffectType => ({
      date: toISODate(date) as ISODate,
      name,
      title,
      effect,
    }),
  );
}

async function getLatestRegulationChange(regulationId?: number, date?: Date) {
  if (!regulationId) {
    return;
  }
  const regulationChanges = await getConnection()
    .getRepository(RegulationChange)
    .createQueryBuilder('changes')
    .orderBy('date', 'DESC')
    .addOrderBy('id', 'ASC')
    .where('regulationId = :regulationId', { regulationId })
    .andWhere('date <= :before')
    .setParameters({
      before: (date ? date : new Date()).toISOString(),
    })
    .getOne();
  return regulationChanges;
}

async function getRegulationChanges(regulationId: number) {
  const connection = getConnection();
  const regulationChanges = await connection
    .getRepository(RegulationChange)
    .createQueryBuilder('changes')
    .where('regulationId = :regulationId', { regulationId })
    .orderBy('date', 'DESC')
    .addOrderBy('id', 'ASC')
    .getMany();
  return regulationChanges;
}

const augmentRegulation = async (
  regulation: Regulation,
  regulationChange?: RegulationChange,
) => {
  const { id, type } = regulation;
  const [
    ministry,
    history,
    effects,
    lawChapters,
    latestChange,
    repealed,
  ] = await Promise.all([
    getRegulationMinistry(id) ?? undefined,
    type === 'base' ? getRegulationHistory(regulation) : [],
    type === 'amending' ? getRegulationEffects(id) : [],
    getRegulationLawChapters(id),
    getLatestRegulationChange(id),
    getRegulationCancel(id),
  ]);

  const textData = extractAppendixesAndComments(
    regulationChange ? regulationChange?.text : regulation.text,
  );

  // check if regulation has past repealed date
  const isRepealed = repealed && new Date().toISOString() > repealed.date;

  const returnRegulation: RegulationType = {
    type: regulation.type,
    name: regulation.name as RegName,
    title: /* regulationChange?.title ||*/ regulation.title,
    text: textData.text,
    signatureDate: regulation.signatureDate,
    publishedDate: regulation.publishedDate,
    effectiveDate: regulation.effectiveDate,
    ministry: ministry as MinistryType,
    repealedDate: isRepealed ? repealed?.date : undefined,
    appendixes: textData.appendixes,
    comments: textData.comments,
    lastAmendDate: latestChange?.date,
    lawChapters: lawChapters ?? [],
    history: history ?? [],
    effects: effects ?? [],
    // timelineDate: undefined,
    // showingDiff: undefined,
  };
  return returnRegulation;
};

const getRegulationRedirect = (regulation: Regulation): RegulationRedirectType => {
  const { name, title } = regulation;
  return {
    name,
    title,
    redirectUrl: 'https://www.reglugerd.is/reglugerdir/allar/nr/' + nameToSlug(name),
  };
};

async function isMigrated(regulation?: Regulation) {
  let migrated = false;
  if (regulation?.type === 'base') {
    const tasks = await getRegulationTasks(regulation.id);
    migrated = tasks?.done || false;
  } else if (regulation?.type === 'amending') {
    migrated = ['text_locked', 'migrated'].includes(regulation.status);
  }
  return migrated;
}

function isNonCurrent(regulation: RegulationType, regulationChange?: RegulationChange) {
  // Check if we are seeing NON-CURRENT version of 'base' regulation
  // -- `regulationChange` is undefined but the augmentedRegulation has lastAmendDate
  // -- or there is `regulationChange` but it does not match lastAmendDate
  // ---- then we assume it's either past or future non current regulation and show timelineDate

  return (
    regulation.type === 'base' &&
    ((!regulationChange && regulation.lastAmendDate) ||
      (regulationChange && regulationChange.date !== regulation.lastAmendDate))
  );
}

// ***

export async function getRegulation(
  regulationName: RegName,
  date?: Date,
  showDiff?: boolean,
) {
  const regulation = await getRegulationByName(regulationName);

  if (!regulation) {
    return null;
  }

  const migrated = await isMigrated(regulation);

  if (migrated) {
    const regulationChange =
      date && regulation.type === 'base'
        ? await getLatestRegulationChange(regulation.id, date)
        : undefined;
    const augmentedRegulation = await augmentRegulation(regulation, regulationChange);

    if (regulation.type !== 'base') {
      return augmentedRegulation;
    }

    // Add timelineDate if regulation is NON-CURRENT
    if (isNonCurrent(augmentedRegulation, regulationChange)) {
      augmentedRegulation.timelineDate = regulationChange
        ? regulationChange.date
        : augmentedRegulation.effectiveDate;
    }

    if (showDiff && regulationChange) {
      const diff = htmldiff
        .execute(regulation.text, regulationChange.text)
        .replace(/<del [^>]+>\s+<\/del>/g, '')
        .replace(/<ins [^>]+>\s+<\/ins>/g, '');
      augmentedRegulation.text = diff;

      augmentedRegulation.showingDiff = {
        from: regulation.effectiveDate,
        to: regulationChange.date,
      };
    }
    return augmentedRegulation;
  } else {
    return getRegulationRedirect(regulation);
  }
}
