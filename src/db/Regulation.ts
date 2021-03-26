import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationChange } from '../entity/RegulationChange';
import { getRegulationMinistry } from './Ministry';
import { RegulationCancel } from '../entity/RegulationCancel';
import { getRegulationLawChapters } from './LawChapter';

export async function getRegulationById(regulationId: number) {
  if (!regulationId) {
    return;
  }
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { id: regulationId },
      select: ['id', 'name', 'title'],
    })) ?? undefined;
  return regulation;
}

export async function getRegulationByName(regulationName?: string, full = true) {
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

export async function getRegulationCancel(regulationId: number) {
  const ministryRepository = getConnection().getRepository(RegulationCancel);
  return await ministryRepository.findOne({ where: { regulationId } });
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

export async function getOriginalRegulation(regulationName: string) {
  const regulation = await getRegulationByName(regulationName);
  return regulation ? augmentRegulation(regulation) : null;
}

export async function getCurrentRegulation(regulationName: string) {
  const regulation = await getRegulationByName(regulationName);
  return regulation ? augmentRegulation(regulation) : null;
}

export async function getRegulationDiff(regulationName: string) {
  const regulation = await getRegulationByName(regulationName, false);
  let regulationChanges = {};
  if (regulation) {
    regulationChanges = getRegulationChanges(regulation.id);
  }
  return regulationChanges;
}
