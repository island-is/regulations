import { getRegulation } from '../db/Regulation';
import { assertISODate, assertNameSlug, slugToName } from '../utils/misc';

import { DB_Regulation } from '../entity/Regulation';
import { ISODate, RegQueryName } from './types';

type Request = any;
type Response = any;

const handleRequest = async (
  res: Response,
  opts: { name?: RegQueryName; date?: ISODate | Date; diff?: boolean },
) => {
  const { name, date, diff } = opts;
  const dateMissing = 'date' in opts && !date;

  if (name && !dateMissing) {
    const data = await getRegulation(slugToName(name), {
      date: date && new Date(date),
      diff,
    });
    if (data) {
      res.send(data);
    } else {
      res.code(400).send('Regulation not found!');
    }
  } else {
    res
      .code(400)
      .send(
        !name
          ? 'Invalid Regulation name'
          : dateMissing
          ? 'Invalid historic date'
          : undefined,
      );
  }
};

export const regulationRoutes = (fastify: any, opts: any, done: any) => {
  /**
   * Returns original version of a regulation
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {DB_Regulation}
   */
  fastify.get(
    '/regulation/:name/original',
    opts,
    function (request: Request, reply: Response) {
      const name = assertNameSlug(request.params.name);
      return handleRequest(reply, {
        name,
      });
    },
  );

  /**
   * Returns current version of a regulation with all changes applied
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {DB_Regulation}
   */
  fastify.get(
    '/regulation/:name/current',
    opts,
    function (request: Request, reply: Response) {
      const name = assertNameSlug(request.params.name);
      return handleRequest(reply, {
        name,
        date: new Date(),
      });
    },
  );

  /**
   * Returns current version of a regulation with all changes applied, showing
   * the total changes the "original" verion.
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {DB_Regulation}
   */
  fastify.get(
    '/regulation/:name/diff',
    opts,
    function (request: Request, reply: Response) {
      const name = assertNameSlug(request.params.name);
      return handleRequest(reply, {
        name,
        date: new Date(),
        diff: true,
      });
    },
  );

  /**
   * Returns a version of a regulation as it was on a specific date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {DB_Regulation}
   */
  fastify.get(
    '/regulation/:name/d/:date',
    opts,
    function (request: Request, reply: Response) {
      const name = assertNameSlug(request.params.name);
      const date = assertISODate(request.params.date);
      return handleRequest(reply, {
        name,
        date,
      });
    },
  );

  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {DB_Regulation}
   */
  fastify.get(
    '/regulation/:name/d/:date/diff',
    opts,
    function (request: Request, reply: Response) {
      const name = assertNameSlug(request.params.name);
      const date = assertISODate(request.params.date);
      handleRequest(reply, {
        name,
        date,
        diff: true,
      });
    },
  );

  done();
};
