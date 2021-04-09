import { ISODate, RegName, RegQueryName } from 'db/types';

/** Converts a Regulation `name` into a URL path segment
 *
 *  Example: '0123/2020' --> '0123-2020'
 */
export const nameToSlug = (regulationName: RegName): RegQueryName =>
  regulationName.replace('/', '-') as RegQueryName;

/** Converts a RegQueryName to Regulation `name` into a URL path segment
 *
 *  Example: '0123-2020' --> '0123/2020'
 */
export const slugToName = (regulationName: RegQueryName): RegName =>
  regulationName.replace('-', '/') as RegName;

// ---------------------------------------------------------------------------

/** Returns a fully zero-padded RegQueryName.
 *
 * Returns `undefined` if the slug doesn't roughly look like a valid regulation number
 *
 *  Example: '23-2020' --> '0023-2020'
 *  Example: '0123-202' --> undefined
 */
export const assertNameSlug = (slug: string): RegQueryName | undefined => {
  if (/\d{1,4}-\d{4}/.test(slug)) {
    return (slug.length === 9 ? slug : ('000' + slug).substr(-9)) as RegQueryName;
  }
};

// ---------------------------------------------------------------------------

export function toISODate(date: Date | string | null | undefined) {
  if (typeof date === 'string') {
    date = new Date(date);
    if (isNaN(date.getTime())) {
      date = undefined;
    }
  }
  return date ? (date.toISOString().substr(0, 10) as ISODate) : undefined;
}

// ---------------------------------------------------------------------------

const smellsLikeISODate = (maybeISODate: string): boolean =>
  /\d{4}-\d{2}-\d{2}/.test(maybeISODate);

/** Asserts that the incoming string is a valid ISODate.
 *
 * Returns undefined otherwise.
 *
 * Example: `2012-09-30` --> `2012-09-30`
 * Example: `2012-09-31` --> undefined
 */
export const assertISODate = (maybeISODate: string): ISODate | undefined => {
  if (smellsLikeISODate(maybeISODate)) {
    const date = new Date(maybeISODate).toISOString().substr(0, 10) as ISODate;
    if (date === maybeISODate) {
      return date;
    }
  }
};
