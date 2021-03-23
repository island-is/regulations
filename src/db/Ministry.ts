import { Ministry } from '../entity/Ministry';
import { getConnection } from 'typeorm';

export async function getAllMinistries() {
  const connection = getConnection();
  const ministryRepository = connection.getRepository(Ministry);
  const ministries: Array<Ministry> = (await ministryRepository.find()) ?? [];
  return ministries;
}
