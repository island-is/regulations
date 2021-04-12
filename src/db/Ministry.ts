import { DB_Ministry } from '../entity/Ministry';
import { getConnection } from 'typeorm';
import { DB_RegulationMinistry } from '../entity/RegulationMinistry';
import { Ministry } from '../routes/types';

export async function getAllMinistries() {
  const ministryRepository = getConnection().getRepository(DB_Ministry);
  const ministries: Array<DB_Ministry> =
    (await ministryRepository
      .createQueryBuilder('regulations')
      .orderBy('current', 'DESC')
      .addOrderBy('`order`', 'ASC')
      .addOrderBy('name', 'ASC')
      .getMany()) ?? [];
  return ministries;
}

export async function getMinistryById(id?: number) {
  if (!id) {
    return;
  }
  const ministryRepository = getConnection().getRepository(DB_Ministry);
  return await ministryRepository.findOne({ where: { id } });
}

export async function getRegulationMinistry(regulationId: number) {
  const ministryRepository = getConnection().getRepository(DB_Ministry);
  const ministryRegRepository = getConnection().getRepository(DB_RegulationMinistry);
  const con = await ministryRegRepository.findOne({ where: { regulationId } });
  const ministry: Ministry | undefined =
    (await ministryRepository
      .createQueryBuilder('regulationministry')
      .where('id = :ministryId', { ministryId: con?.ministryId })
      .select(['name', 'slug', 'current'])
      .getRawOne()) ?? undefined;
  return ministry;
}
