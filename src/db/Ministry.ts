import { DB_Ministry, DB_Regulation } from '../models';
import { Ministry } from 'routes/types';

export async function getAllMinistries() {
  const ministries =
    (await DB_Ministry.findAll({
      order: [
        ['current', 'DESC'],
        ['`order`', 'ASC'],
        ['name', 'ASC'],
        ['slug', 'DESC'],
      ],
    })) ?? [];

  return ministries;
}

export const getMinistry = (regOrChange: Pick<DB_Regulation, 'ministryId'>) =>
  (
    DB_Ministry.findOne({
      where: { id: regOrChange.ministryId },
    }) as Promise<DB_Ministry>
  ).then(
    (m): Ministry => ({
      slug: m.slug,
      name: m.name,
      current: m.current,
    }),
  );
