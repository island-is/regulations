import { RegName, RegQueryName } from '../types';

/** Converts a Regulation `name` into a URL path segment
 *
 *  Example: '0123/2020' --> '2020/0123'
 */
export const nameToPath = (regulationName: string, seperator?: string) => {
  const [number, year] = regulationName.split('/');
  return year + (seperator || '/') + number;
};

/** Creates a bare task URL for a given Regulation `name`
 *
 *  Example: '0123/2020' --> '/task/2020/0123'
 */
export const taskUrl = (regulationName: string) =>
  '/task/' + nameToPath(regulationName);

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

/**
 * Wraps the URL constructor to catch its errors. Ack!
 */
export const newURL = (maybeUrl = ''): URL | undefined => {
  try {
    return new URL(maybeUrl);
  } catch (_) {
    return undefined;
  }
};
