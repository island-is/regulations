import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';
import { RegulationChange } from '../entity/RegulationChange';
import { getAllMinistries, getRegulationMinistry } from './Ministry';
import { RegulationCancel } from '../entity/RegulationCancel';

export async function getRegulationById(regulationId: number) {
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { id: regulationId },
      select: ['id', 'name', 'title'],
    })) ?? null;
  return regulation;
}

export async function getRegulationByName(regulationName: string, full = true) {
  const regulationRepository = getConnection().getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { name: regulationName },
      select: full
        ? [
            'id',
            'name',
            'title',
            'text',
            'signatureDate',
            'publishedDate',
            'effectiveDate',
          ]
        : ['id', 'title'],
    })) ?? null;
  return regulation;
}

export async function getRegulationCancel(regulationId: number) {
  const ministryRepository = getConnection().getRepository(RegulationCancel);
  return await ministryRepository.findOne({ where: { regulationId } });
}

export async function getRegulationChanges(regulationId: number) {
  const connection = getConnection();
  const regulationChanges = await connection
    .getRepository(RegulationChange)
    .createQueryBuilder('changes')
    .where('regulationId = :regulationId', { regulationId })
    .orderBy('date', 'ASC')
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

/*
  /** List of the regulation's appendixes * /
  appendixes: ReadonlyArray<Appendix>
  lastAmendDate?: ISODate | null
  /** Date when (if) this regulation was repealed and became a thing of the past * /
  repealedDate?: ISODate | null
  /** Law chapters that this regulation is linked to * /
  lawChapters: ReadonlyArray<LawChapter>
  // TODO: add link to original DOC/PDF file in Stjórnartíðindi's data store.
*/
