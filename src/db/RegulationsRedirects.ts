import { RegName, RegQueryName } from '../routes/types';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';
import { nameToSlug } from '../utils/misc';

type SQLRedirect = {
  id: number;
  name: RegName;
};

type Redirects = Array<RegQueryName>;

export async function getRegulationsRedirects() {
  const sql = `
  (select name from Regulation where type = 'amending' and status in ('text_locked', 'migrated'))
  union all
  (select name from Regulation as r join Task as t on r.id = t.regulationId where t.done = true)
  ;`;

  const redirectsData = await db.query<SQLRedirect>(sql, {
    type: QueryTypes.SELECT,
  });

  const redirects: Redirects = redirectsData.map((itm) => nameToSlug(itm.name));

  return redirects;
}
