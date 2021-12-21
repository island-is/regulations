import { HOUR } from '@hugsmidjan/qj/time';
import { format as _formatDate } from 'date-fns';
import { is as locale } from 'date-fns/locale';
import { FastifyReply } from 'fastify';
import fs from 'fs';
import { parse } from 'path';

import { ISODate } from '../routes/types';

// ---------------------------------------------------------------------------

export const formatDate = (date: ISODate, format = 'd. MMM yyyy'): string =>
  _formatDate(new Date(date), format, { locale });

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

const HOURS = 60 * 60;
export const cacheControl = (res: FastifyReply<any>, ttl_hrs: number): void => {
  res.headers({
    'Cache-Control':
      'public, max-age=' + ttl_hrs * HOURS + (ttl_hrs ? ', immutable' : ''),
  });
};

// ---------------------------------------------------------------------------

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
