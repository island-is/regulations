import { Regulation } from '../entity/Regulation';
import { getConnection, getManager } from 'typeorm';

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
  return regulation;
}
