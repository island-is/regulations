import { RegName, RegQueryName } from '../routes/types';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';
import { nameToSlug } from '@island.is/regulations-tools/utils';

type SQLRedirect = {
  id: number;
  name: RegName;
};

type Redirects = Array<RegQueryName>;

export async function getRegulationsRedirects() {
  const sql = `
  (select name from Regulation where type = 'amending' and status != 'draft')
  union all
  (select name from Regulation as r join Task as t on r.id = t.regulationId where t.migrated = true)
  ;`;

  const redirectsData = await db.query<SQLRedirect>(sql, {
    type: QueryTypes.SELECT,
  });

  const redirects: Redirects = redirectsData.map((itm) => nameToSlug(itm.name));

  return redirects;
}
