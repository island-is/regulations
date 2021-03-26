import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationChange } from '../entity/RegulationChange';
import { getRegulationMinistry } from './Ministry';
import { RegulationCancel } from '../entity/RegulationCancel';
import { getRegulationLawChapters } from './LawChapter';

export type RegulationHistoryItem = {
  date: string;
  name: string;
  title: string;
  reason: string;
};

export async function getRegulationById(regulationId: number) {
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

export async function getRegulationByName(regulationName?: string) {
  if (!regulationName) {
    return;
  }
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { name: regulationName },
    })) ?? undefined;
  return regulation;
}

export async function getRegulationHistory(regulationName?: string) {
  if (!regulationName) {
    return;
  }
  const connection = getManager();
  const historyData: Array<{ [key: string]: string }> =
    (await connection.query('call regulationHistoryByName(?)', [regulationName]))?.[0] ??
    [];
  const history: Array<RegulationHistoryItem> = [];
  historyData.forEach((h) => {
    if (h.reason !== 'root') {
      history.push({
        date: h.effectiveDate,
        name: h.name,
        title: h.title,
        reason: h.reason,
      });
    }
  });
  return history;
}

export async function getRegulationCancel(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const cancelyRepository = getConnection().getRepository(RegulationCancel);
  return await cancelyRepository.findOne({ where: { regulationId } });
}

export async function getLatestRegulationChange(regulationId?: number, date?: Date) {
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
      before: date ? date.toISOString() : new Date().toISOString(),
    })
    .getOne();
  return regulationChanges;
}

export async function getRegulationChanges(regulationId?: number) {
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

const augmentRegulation = async (regulation: Regulation) => {
  const more = await Promise.all([
    getRegulationMinistry(regulation.id),
    getRegulationCancel(regulation.id),
  ]);
  const extraData = {
    ministry: more[0] ?? undefined,
    repealedDate: more[1]?.date ?? undefined,
    appendixes: 'TODO!', // TODO: add appendixes
    lastAmendDate: 'TODO!', // TODO: add lastAmendDate
    lawChapters: 'TODO!', // TODO: add lawChapters
  };
  const mergedData = Object.assign({}, regulation, extraData);
  const { id, ...rest } = mergedData;
  return rest;
};

const getRegulationRedirect = (regulation?: Regulation) => {
  return {
    name: regulation?.name || 'Regulation name missing',
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

export async function getOriginalRegulation(regulationName: string) {
  const regulation = await getRegulationByName(regulationName);
  const migrated = await isMigrated(regulation);

  if (regulation && migrated) {
    return augmentRegulation(regulation);
  } else {
    return getRegulationRedirect(regulation);
  }
}

export async function getCurrentRegulation(regulationName: string) {
  const regulation = await getRegulationByName(regulationName);
  const migrated = await isMigrated(regulation);

  if (regulation && migrated) {
    const latestChange = await getLatestRegulationChange(regulation.id);
    if (latestChange) {
      regulation.text = latestChange.text;
    }
    return augmentRegulation(regulation);
  } else {
    return getRegulationRedirect(regulation);
  }
}

export async function getRegulationDiff(regulationName: string) {
  const regulation = await getRegulationByName(regulationName, false);
  let regulationChanges = {};
  if (regulation) {
    regulationChanges = getRegulationChanges(regulation.id);
  }
  return regulationChanges;
}
