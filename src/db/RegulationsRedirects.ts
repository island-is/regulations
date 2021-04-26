import { RegName, RegQueryName } from '../routes/types';
import { db } from '../utils/sequelize';
import { QueryTypes } from 'sequelize';
import { nameToSlug } from '../utils/misc';

type SQLRedirectList = Array<{
  id: number;
  name: RegName;
}>;

type Redirects = Array<{
  name: RegQueryName;
  to: string;
}>;

export async function getRegulationsRedirects() {
  const sql = `
    select
      r.id,
      r.name
    from Regulation as r
    where
      (select done from Task where regulationId = r.id) = true
    order by id DESC
    ;`;

  const redirectsData = <SQLRedirectList>(
    ((await db.query(sql, { type: QueryTypes.SELECT })) ?? [])
  );

  const redirects: Redirects = redirectsData.map((itm) => {
    return {
      name: nameToSlug(itm.name),
      to: 'https://island.is/reglugerdir/nr/' + nameToSlug(itm.name),
    };
  });

  return redirects;
}
