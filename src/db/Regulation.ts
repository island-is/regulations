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
  RegulationHistoryItemType,
  RegulationRedirectType,
  RegulationType,
  toIsoDate,
} from './types';

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
  const connection = getManager();
  const historyData: Array<{ [key: string]: any }> =
    (await connection.query('call regulationHistoryByName(?)', [regulationName]))?.[0] ??
    [];
  const history: Array<RegulationHistoryItemType> = [];
  historyData.forEach((h) => {
    if (h.reason !== 'root') {
      history.push({
        date: h.effectiveDate,
        name: h.name,
        title: h.title,
        effect: h.reason,
      });
    }
  });
  return history;
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
  regulationChange?: RegulationChange | 'original',
) => {
  const [
    ministry,
    history,
    lawChapters,
    latestChange,
    changes,
    cancel,
  ] = await Promise.all([
    getRegulationMinistry(regulation.id) ?? undefined,
    getRegulationHistory(regulation.name),
    getRegulationLawChapters(regulation.id),
    getLatestRegulationChange(regulation?.id),
    getRegulationChanges(regulation?.id),
    getRegulationCancel(regulation.id),
  ]);

  const returnRegulation: RegulationType = {
    type: regulation.type,
    name: regulation.name as RegName,
    title: /* regulationChange?.title ||*/ regulation.title,
    text: typeof regulationChange === 'object' ? regulationChange?.text : regulation.text,
    signatureDate: regulation.signatureDate,
    publishedDate: regulation.publishedDate,
    effectiveDate: regulation.effectiveDate,
    ministry: ministry as MinistryType,
    repealedDate: cancel?.date,
    appendixes: [], // TODO: add appendixes
    lastAmendDate: latestChange?.date,
    lawChapters: lawChapters ?? [],
    history: history ?? [],
    effects: [], // TODO: add effects
    timelineDate:
      regulationChange === 'original' ? regulation.publishedDate : regulationChange?.date,
    showingDiff: undefined,
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

// ***

export async function getRegulation(regulationName: string, date?: Date) {
  const regulation = await getRegulationByName(regulationName);
  const migrated = await isMigrated(regulation);

  if (regulation && migrated) {
    const regChange = date
      ? (await getLatestRegulationChange(regulation.id, date)) ?? 'original'
      : undefined;
    return augmentRegulation(regulation, regChange);
  } else {
    return getRegulationRedirect(regulation);
  }
}

export async function getRegulationDiff(regulationName: string) {
  const regulation = await getRegulationByName(regulationName, false);
  const regulationChanges = await getRegulationChanges(regulation?.id);
  return regulationChanges;
}
