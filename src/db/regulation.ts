import { Regulation } from '../entity/Regulation';
import { getConnection } from 'typeorm';

export const regulationsPerPage = 100;

export async function getAllRegulations() {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(Regulation);
  const regulations: Array<Regulation> = (await regulationRepository.find()) ?? [];
  return regulations;
}

export async function getRegulationsCount() {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(Regulation);
  const regulationsCount: number = await regulationRepository
    .createQueryBuilder('allregulations')
    .getCount();
  console.log(regulationsCount);
  return regulationsCount;
}

export async function getRegulationsByPage(skip: number, take: number) {
  const connection = getConnection();
  const projects: Array<Regulation> = await connection
    .getRepository(Regulation)
    .createQueryBuilder('regulations')
    .skip(skip ?? 0)
    .take(take ?? regulationsPerPage)
    .getMany();
  return projects;
}

export async function getRegulationById(regulationId: number) {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(Regulation);
  const regulation: Regulation | null =
    (await regulationRepository.findOne({
      id: regulationId,
    })) ?? null;
  return regulation;
}
