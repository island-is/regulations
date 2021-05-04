import { DB_Ministry } from '../models';
import { Ministry } from 'routes/types';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';

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

export async function getRegulationMinistry(
  regulationId: number,
): Promise<Ministry | undefined> {
  const ministryQuery = `
    SELECT m.name, m.slug, m.current FROM Ministry AS m
    RIGHT JOIN Regulation_Ministry AS rm ON m.id = rm.ministryId
    WHERE rm.regulationId = :regulationId
  `;
  return (
    await db.query<Pick<DB_Ministry, 'name' | 'slug' | 'current'>>(ministryQuery, {
      replacements: { regulationId },
      type: QueryTypes.SELECT,
    })
  )?.[0];
}
