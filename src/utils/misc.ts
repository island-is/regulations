import { ISODate, RegName, RegQueryName } from '../routes/types';
import { FastifyReply } from 'fastify';
import fs from 'fs';
import { parse } from 'path';
import { HOUR } from '@hugsmidjan/qj/time';

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

const reRegQueryNameFlex = /^\d{1,4}-\d{4}$/;

/** Returns a fully zero-padded RegQueryName.
 *
 * Returns `undefined` if the slug doesn't roughly look like a valid regulation number
 *
 *  Example: '23-2020' --> '0023-2020'
 *  Example: '0123-202' --> undefined
 */
export const assertNameSlug = (slug: string): RegQueryName | undefined => {
  if (reRegQueryNameFlex.test(slug)) {
    return (
      slug.length === 9 ? slug : ('000' + slug).substr(-9)
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
export const assertRegName = (slug: string): RegName | undefined => {
  slug = slug.replace('-', '/');
  if (/^\d{1,4}\/\d{4}$/.test(slug)) {
    return (slug.length === 9 ? slug : ('000' + slug).substr(-9)) as RegName;
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
  /^\d{4}-\d{2}-\d{2}$/.test(maybeISODate);

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

// ---------------------------------------------------------------------------

declare const IntPositive__Brand: unique symbol;
/** Positive integer (>1) */
export type IntPositive = number & { [IntPositive__Brand]: true };

// ---------------------------------------------------------------------------

/** Generates URL Params type declaration for Fastify's .get() method */
export type Pms<keys extends string> = {
  Params: { [x in keys]: string };
};
/** Generates Querystring type declaration for Fastify's .get() method */
export type QStr<keys extends string> = {
  Querystring: { [x in keys]?: string };
};

// ---------------------------------------------------------------------------

export const assertPosInt = (maybeNumber: string): IntPositive | undefined => {
  const num = Number(maybeNumber);
  return num && num > 0 && num === Math.floor(num)
    ? (num as IntPositive)
    : undefined;
};

// ---------------------------------------------------------------------------

const HOURS = 60 * 60;
export const cache = (res: FastifyReply, ttl_hrs: number): void => {
  res.headers({
    'Cache-Control':
      'public, max-age=' + ttl_hrs * HOURS + (ttl_hrs ? ', immutable' : ''),
  });
};

// ---------------------------------------------------------------------------

const JSONFILE_MAXAGE = 6 * HOUR;

/* write json data to disk */
export const storeData = (data: unknown, path: string) => {
  try {
    const dirName = parse(path).dir;
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
    }
    fs.writeFileSync(path, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
};

export const loadData = <T>(path: string): T | false => {
  if (!fs.existsSync(path)) {
    return false;
  }
  try {
    const lastModified = fs.statSync(path).mtimeMs;

    // return file if it's available and fresh
    if (Date.now() - lastModified <= JSONFILE_MAXAGE) {
      const data = fs.readFileSync(path, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(err);
  }
  return false;
};
