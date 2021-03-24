import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';

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
    // .where({ status: 'text_locked' || 'migrated' })
    .getCount();
  return regulationsCount;
}

export async function getRegulationsYears() {
  const connection = getManager();
  const years: Array<{ year: number }> = await connection.query(
    'SELECT DISTINCT YEAR(publishedDate) as `year` from Regulation order by `year`',
  );
  return years.map((y) => y.year);
}

export async function getLatestRegulations(skip: number, take: number) {
  const connection = getConnection();
  const regulations: Array<Regulation> = await connection
    .getRepository(Regulation)
    .createQueryBuilder('regulations')
    .select(['name', 'title', 'publishedDate'])
    // .where({ status: 'text_locked' || 'migrated' })
    .orderBy('publishedDate', 'DESC')
    .skip(skip ?? 0)
    .take(take ?? regulationsPerPage)
    .getMany();
  return regulations;
}

export async function getRegulationByName(regulationName: string) {
  const connection = getConnection();
  const regulationRepository = connection.getRepository(Regulation);
  const regulation =
    (await regulationRepository.findOne({
      where: { name: regulationName },
      select: [
        'id',
        'name',
        'title',
        'text',
        'signatureDate',
        'publishedDate',
        'effectiveDate',
      ],
    })) ?? null;
  if (regulation) {
    const extraData = Promise.all([]);
  }
  return { regulation };
}
