import { DB_Ministry, DB_Regulation_Ministry } from '../models';
import { Ministry } from 'routes/types';

export async function getAllMinistries() {
  const ministries =
    (await DB_Ministry.findAll({
      order: [
        ['current', 'DESC'],
        ['`order`', 'ASC'],
        ['name', 'ASC'],
      ],
    })) ?? [];

  return ministries;
}

export const getMinistryById = async (id: number): Promise<Ministry | undefined> =>
  (await DB_Ministry.findOne({
    where: { id },
    attributes: ['slug', 'name', 'current'],
  })) || undefined;

export async function getRegulationMinistry(regulationId: number) {
  const con = await DB_Regulation_Ministry.findOne({ where: { regulationId } });
  if (!con) {
    return;
  }
  return getMinistryById(con.ministryId);
}
