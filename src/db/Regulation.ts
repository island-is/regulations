import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationChange } from '../entity/RegulationChange';
import { getRegulationMinistry } from './Ministry';
import { RegulationCancel } from '../entity/RegulationCancel';
import { getRegulationLawChapters } from './LawChapter';
import { RegulationTasks } from '../entity/RegulationTasks';

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

export async function getRegulationTasks(regulationId?: number) {
  if (!regulationId) {
    return;
  }
  const taskRepository = getConnection().getRepository(RegulationTasks);
  return await taskRepository.findOne({ where: { regulationId } });
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
  // pick fields we want to show in api
  const cleanRegulation = {
    // id: regulation.id,
    // type: regulation.type,
    // status: regulation.status,
    name: regulation.name,
    title: regulation.title,
    text: regulation.text,
    signatureDate: regulation.signatureDate,
    publishedDate: regulation.publishedDate,
    effectiveDate: regulation.effectiveDate,
  };
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
  console.log({ changes });

  // populate extradata object
  const extraData = {
    ministry: ministry,
    repealedDate: cancel?.date,
    appendixes: [], // TODO: add appendixes
    lastAmendDate: latestChange?.date,
    lawChapters,
    history: history,
  };
  const mergedData = Object.assign({}, cleanRegulation, extraData);
  return mergedData;
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
