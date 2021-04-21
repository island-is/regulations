import {
  Ministry as DB_Ministry,
  Regulation_Ministry as DB_Regulation_Ministry,
} from '../models';

export async function getAllMinistries() {
  const ministries =
    (await DB_Ministry.findAll({
      raw: true,
      order: [
        ['current', 'DESC'],
        ['`order`', 'ASC'],
        ['name', 'ASC'],
      ],
    })) ?? [];

  return ministries;
}

export const getMinistryById = async (id: number) =>
  (await DB_Ministry.findOne({ where: { id } })) || undefined;

export async function getRegulationMinistry(regulationId: number) {
  const con = await DB_Regulation_Ministry.findOne({ where: { regulationId } });
  if (!con) {
    return;
  }
  return getMinistryById(con.ministryId);
}
