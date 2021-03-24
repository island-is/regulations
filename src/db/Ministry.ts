import { Ministry } from '../entity/Ministry';
import { getConnection } from 'typeorm';
import { RegulationMinistry } from '../entity/RegulationMinistry';

export async function getAllMinistries() {
  const ministryRepository = getConnection().getRepository(Ministry);
  const ministries: Array<Ministry> =
    (await ministryRepository
      .createQueryBuilder('regulations')
      .orderBy('current', 'DESC')
      .addOrderBy('`order`', 'ASC')
      .addOrderBy('name', 'ASC')
      .getMany()) ?? [];
  return ministries;
}

export async function getMinistryById(id: number) {
  const ministryRepository = getConnection().getRepository(Ministry);
  return await ministryRepository.findOne({ where: { id } });
}

export async function getRegulationMinistry(regulationId: number) {
  const ministryRepository = getConnection().getRepository(Ministry);
  const ministryRegRepository = getConnection().getRepository(RegulationMinistry);
  const con = await ministryRegRepository.findOne({ where: { regulationId } });
  const ministry: Ministry | null = await ministryRepository
    .createQueryBuilder('changes')
    .where('id = :ministryId', { ministryId: con?.ministryId })
    .select(['name', 'slug'])
    .getRawOne();
  return ministry;
}
