import { IntPositive, ISODate, RegName, RegQueryName, Year } from '../types';

// ---------------------------------------------------------------------------

const reRegQueryNameFlex = /^\d{1,4}-\d{4}$/;

/** Returns a fully zero-padded RegQueryName.
 *
 * Returns `undefined` if the slug doesn't roughly look like a valid regulation number
 *
 *  Example: '23-2020' --> '0023-2020'
 *  Example: '0123-202' --> undefined
 */
export const ensureNameSlug = (cand: unknown): RegQueryName | undefined => {
  if (cand && typeof cand === 'string' && reRegQueryNameFlex.test(cand)) {
    return (
      cand.length === 9 ? cand : ('000' + cand).slice(-9)
    ) as RegQueryName;
  }
};

// ---------------------------------------------------------------------------

/** Returns a fully zero-padded RegName.
 *
 * Returns `undefined` if the slug doesn't roughly look like a valid regulation number
 *
 *  Example: '23-2020' --> '0023/2020'
 *  Example: '23/2020' --> '0023/2020'
 *  Example: '0123-202' --> undefined
 */
export const ensureRegName = (cand: unknown): RegName | undefined => {
  const maybeName =
    !!cand && typeof cand === 'string' && cand.replace('-', '/');
  if (maybeName && /^\d{1,4}\/\d{4}$/.test(maybeName)) {
    return (
      maybeName.length === 9 ? maybeName : ('000' + maybeName).slice(-9)
    ) as RegName;
  }
};

// ---------------------------------------------------------------------------

const smellsLikeISODate = (maybeISODate: string): maybeISODate is string =>
  /^\d{4}-\d{2}-\d{2}$/.test(maybeISODate || '');

/** Asserts that the incoming value is a valid ISODate.
 *
 * Returns undefined otherwise.
 *
 * Example: `2012-09-30` --> `2012-09-30`
 * Example: `2012-09-31` --> undefined
 */
export const ensureISODate = (cand: unknown): ISODate | undefined => {
  if (typeof cand === 'string' && smellsLikeISODate(cand)) {
    const date = new Date(cand).toISOString().slice(0, 10) as ISODate;
    if (date === cand) {
      return date;
    }
  }
};

/** Asserts that a value is evaluates to a positive integer
 *
 * Guards against NaN and "Infinity"
 *
 *  Example: `1` --> `1`
 *  Example: `10000` --> `10000`
 *
 *  Example: `0` --> `undefined`
 *  Example: `-1` --> `undefined`
 *  Example: `1.1` --> `undefined`
 *  Example: `Infinity` --> `undefined`
 *  Example: `foobar` --> `undefined`
 */
export const ensurePosInt = (cand: unknown): IntPositive | undefined => {
  const num = Number(cand);
  return num && num > 0 && num < Infinity && num === Math.floor(num)
    ? (num as IntPositive)
    : undefined;
};

/** Asserts that string|number evaluates to a number between 1900 and 2150
 *
 * Additionally, if the input evaluates to a positive integer,
 * the value is boxed inside the above year-range
 *
 * Guards against "Infinity" and unreasonably off-sized values
 *
 *  Example: `2012` --> `2012`
 *  Example: `1912` --> `1912`
 *  Example: `1` --> `1900`
 *  Example: `10000` --> `2150`
 *
 *  Example: `0` --> `undefined`
 *  Example: `-1` --> `undefined`
 *  Example: `2012.1` --> `undefined`
 *  Example: `Infinity` --> `undefined`
 *  Example: `foobar` --> `undefined`

*/
export const ensureReasonableYear = (cand: unknown): Year | undefined => {
  const yearCand = ensurePosInt(cand);
  return yearCand
    ? (Math.max(1900, Math.min(2150, yearCand)) as Year)
    : undefined;
};

// ---------------------------------------------------------------------------

/** @deprecated use `ensureNameSlug` instead  (Will be removed in v0.6) */
export const assertNameSlug = ensureNameSlug;
/** @deprecated use `ensureRegName` instead  (Will be removed in v0.6) */
export const assertRegName = ensureRegName;
/** @deprecated use `ensureISODate` instead  (Will be removed in v0.6) */
export const assertISODate = ensureISODate;
/** @deprecated use `ensurePosInt` instead  (Will be removed in v0.6) */
export const assertPosInt = ensurePosInt;
