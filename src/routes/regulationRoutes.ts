import { getRegulation } from '../db/Regulation';
import { assertISODate, assertNameSlug, slugToName } from '../utils/misc';

import { DB_Regulation } from '../entity/Regulation';
import { ISODate, RegQueryName } from './types';

type Request = any;
type Response = any;

// eslint-disable-next-line complexity
const handleRequest = async (
  res: Response,
  opts: {
    name?: RegQueryName;
    date?: ISODate | Date;
    diff?: boolean;
    earlierDate?: ISODate | 'original';
  },
) => {
  const { name, date, diff, earlierDate } = opts;
  const dateMissing = 'date' in opts && !date;
  const validEarlierDate =
    !date || !diff || !earlierDate || earlierDate === 'original' || earlierDate <= date;

  if (name && !dateMissing && validEarlierDate) {
    const data = await getRegulation(slugToName(name), {
      date: date && new Date(date),
      diff,
      earlierDate:
        earlierDate === 'original' ? 'original' : earlierDate && new Date(earlierDate),
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
          : !validEarlierDate
          ? 'Invalid diffing date'
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
  fastify.get('/regulation/:name/original', opts, (req: Request, res: Response) => {
    const name = assertNameSlug(req.params.name);
    return handleRequest(res, {
      name,
    });
  });

  /**
   * Returns current version of a regulation with all changes applied
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {DB_Regulation}
   */
  fastify.get('/regulation/:name/current', opts, (req: Request, res: Response) => {
    const name = assertNameSlug(req.params.name);
    return handleRequest(res, {
      name,
      date: new Date(),
    });
  });

  /**
   * Returns current version of a regulation with all changes applied, showing
   * the total changes the "original" verion.
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {DB_Regulation}
   */
  fastify.get('/regulation/:name/diff', opts, (req: Request, res: Response) => {
    const name = assertNameSlug(req.params.name);
    return handleRequest(res, {
      name,
      date: new Date(),
      diff: true,
      earlierDate: 'original',
    });
  });

  /**
   * Returns a version of a regulation as it was on a specific date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {DB_Regulation}
   */
  fastify.get('/regulation/:name/d/:date', opts, (req: Request, res: Response) => {
    const name = assertNameSlug(req.params.name);
    const date = assertISODate(req.params.date);
    return handleRequest(res, {
      name,
      date,
    });
  });

  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {DB_Regulation}
   */
  fastify.get('/regulation/:name/d/:date/diff', opts, (req: Request, res: Response) => {
    const name = assertNameSlug(req.params.name);
    const date = assertISODate(req.params.date);
    handleRequest(res, {
      name,
      date,
      diff: true,
    });
  });

  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @param {string} earlierDate - ISODate (`YYYY-MM-DD`) or 'original'
   * @returns {DB_Regulation}
   */
  fastify.get(
    '/regulation/:name/d/:date/diff/:earlierDate',
    opts,
    (req: Request, res: Response) => {
      const p = req.params;
      const name = assertNameSlug(p.name);
      const date = assertISODate(p.date);
      const earlierDate =
        p.earlierDate === 'original' ? 'original' : assertISODate(p.earlierDate);
      handleRequest(res, {
        name,
        date,
        diff: true,
        earlierDate,
      });
    },
  );

  done();
};
