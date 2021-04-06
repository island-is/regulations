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
  toIsoDate,
} from './types';
import { extractAppendixesAndComments } from '../utils/extractData';

export type RegulationHistoryItem = {
  date: string;
  name: string;
  title: string;
  reason: string;
};

async function getRegulationById(regulationId: number, full = true) {
  if (!regulationId) {
    return;
  }
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { id: regulationId },
      select: full ? undefined : ['id', 'name'],
    })) ?? undefined;
  return regulation;
}

async function getRegulationByName(regulationName?: string, full = true) {
  if (!regulationName) {
    return;
  }
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { name: regulationName },
      select: full ? undefined : ['id', 'name'],
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

async function getRegulationHistory(regulationName?: string) {
  if (!regulationName) {
    return;
  }
  const historyData: Array<{ [key: string]: any }> =
    (
      await getManager().query('call regulationHistoryByName(?)', [regulationName])
    )?.[0] ?? [];
  const history: Array<RegulationHistoryItemType> = [];
  historyData.forEach((h) => {
    if (h.reason !== 'root') {
      history.push({
        date: toIsoDate(h.effectiveDate) as ISODate,
        name: h.name,
        title: h.title,
        effect: h.reason,
      });
    }
  });
  return history;
}

async function getRegulationEffects(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const effectsQuery = `select name, title, date, effect from Regulation
  join ((select regulationId, date, 'amend' as effect from RegulationChange where changingId = ${regulationId})
  union
  (select regulationId, date, 'repeal' as effect from RegulationCancel where changingId = ${regulationId})) as effects
  on Regulation.id = effects.regulationId
  order by Regulation.publishedDate, Regulation.id
  ;`;
  const effectsData: Array<{ [key: string]: any }> =
    (await getManager().query(effectsQuery)) ?? [];

  const effects: Array<RegulationEffectType> = [];
  effectsData.forEach((e) => {
    effects.push({
      date: toIsoDate(e.date) as ISODate,
      name: e.name,
      title: e.title,
      effect: e.effect,
    });
  });
  return effects;
}

async function getRegulationCancel(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const cancelRepository = getConnection().getRepository(RegulationCancel);
  // const cancelled = await cancelRepository.find();
  // const cannedRegulation = await getRegulationById(8488);
  // console.log({ cannedRegulation });
  // return await cancelRepository.find();

  return await cancelRepository.findOne({ where: { regulationId } });
}

async function getLatestRegulationChange(regulationId?: number, date?: Date) {
  if (!regulationId) {
    return;
  }

  const connection = getConnection();
  const regulationChanges = await connection
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

async function getRegulationChanges(regulationId?: number) {
  if (!regulationId) {
    return;
  }
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
  const [
    ministry,
    history,
    effects,
    lawChapters,
    latestChange,
    // changes,
    cancel,
  ] = await Promise.all([
    getRegulationMinistry(regulation.id) ?? undefined,
    regulation.type === 'base' ? getRegulationHistory(regulation.name) : [],
    ['amending', 'repelling'].includes(regulation.type)
      ? getRegulationEffects(regulation.id)
      : [],
    getRegulationLawChapters(regulation.id),
    getLatestRegulationChange(regulation?.id),
    // getRegulationChanges(regulation?.id),
    getRegulationCancel(regulation.id),
  ]);

  const textData = extractAppendixesAndComments(
    regulationChange ? regulationChange?.text : regulation.text,
  );

  const returnRegulation: RegulationType = {
    type: regulation.type,
    name: regulation.name as RegName,
    title: /* regulationChange?.title ||*/ regulation.title,
    text: textData.text,
    signatureDate: regulation.signatureDate,
    publishedDate: regulation.publishedDate,
    effectiveDate: regulation.effectiveDate,
    ministry: ministry as MinistryType,
    repealedDate: cancel?.date,
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

const getRegulationRedirect = (regulation?: Regulation): RegulationRedirectType => {
  return {
    name: (regulation?.name || 'Regulation name missing') as RegName,
    title: regulation?.title || 'Regulation title missing',
    redirectUrl: regulation?.name
      ? 'https://www.reglugerd.is/reglugerdir/allar/nr/' + regulation?.name
      : 'https://www.reglugerd.is/',
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

export async function getRegulation(regulationName: string, date?: Date) {
  const regulation = await getRegulationByName(regulationName);
  const migrated = await isMigrated(regulation);

  if (regulation && migrated) {
    const regulationChange = date
      ? await getLatestRegulationChange(regulation.id, date)
      : undefined;
    const augmentedRegulation = await augmentRegulation(regulation, regulationChange);

    // Add timelineDate if regulation is NON-CURRENT
    if (isNonCurrent(augmentedRegulation, regulationChange)) {
      augmentedRegulation.timelineDate = augmentedRegulation.effectiveDate;
    }
    return augmentedRegulation;
  } else {
    return getRegulationRedirect(regulation);
  }
}

export async function getRegulationDiff(regulationName: string) {
  const regulation = await getRegulationByName(regulationName);
  const regulationChanges = await getRegulationChanges(regulation?.id);
  if (regulation && regulation.type === 'base' && regulationChanges) {
    const diff = htmldiff
      .execute(regulation.text, regulationChanges[0].text)
      .replace(/<del [^>]+>\s+<\/del>/g, '')
      .replace(/<ins [^>]+>\s+<\/ins>/g, '');
    regulation.text = diff;

    const augmentedRegulation = await augmentRegulation(regulation);
    augmentedRegulation.timelineDate = regulationChanges[0].date;
    augmentedRegulation.showingDiff = {
      from: regulation.effectiveDate,
      to: regulationChanges[0].date,
    };
    return augmentedRegulation;
  }
  return {};
}
