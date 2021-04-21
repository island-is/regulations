import {
  Ministry as DB_Ministry,
  Regulation_Ministry as DB_RegulationMinistry,
} from '../models';
import { Ministry } from '../routes/types';

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

export async function getMinistryById(id?: number) {
  if (!id) {
    return;
  }
  const ministry = (await DB_Ministry.findOne({ where: { id } })) ?? undefined;
  return ministry;
}

export async function getRegulationMinistry(regulationId: number | undefined) {
  if (!regulationId) {
    return;
  }
  const con = await DB_RegulationMinistry.findOne({ where: { regulationId } });
  if (!con?.ministryId) {
    return;
  }
  const ministry =
    (await DB_Ministry.findOne({
      where: { id: con?.ministryId },
      attributes: ['name', 'slug', 'current'],
    })) ?? undefined;

  return ministry;
}
