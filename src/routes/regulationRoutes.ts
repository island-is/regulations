import { FastifyRedis } from 'fastify-redis';
import { get, set } from 'utils/cache';
import { getRegulation } from '../db/Regulation';
import {
  assertISODate,
  assertNameSlug,
  slugToName,
  Pms,
  cacheControl,
  toISODate,
} from '../utils/misc';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  ISODate,
  RegQueryName,
  RegulationRedirect,
  Regulation,
  RegulationDiff,
} from './types';
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import { makePublishedPdf, makeDraftPdf } from '../db/RegulationPdf';

const REGULATION_TTL = 0.1;
const PDF_FILE_TTL = 1;
const REGULATION_REDIS_TTL = REGULATION_TTL * 60 * 60;

// ---------------------------------------------------------------------------

type EarlierDate = ISODate | 'original';

type RegHandlerOpts<N extends string = RegQueryName> = {
  name?: RegQueryName | N;
  date?: ISODate;
  diff?: boolean;
  earlierDate?: EarlierDate;
  current?: true;
};
type RefinedRegHandlerOpts<N extends string = RegQueryName> = {
  name: RegQueryName | N;
  current: boolean;
  date?: Date;
} & (
  | {
      diff: true;
      earlierDate?: Date | 'original';
    }
  | {
      diff?: false;
      earlierDate?: undefined;
    }
);

// ===========================================================================

const assertEarlierDate = (maybeEDate?: string): EarlierDate | undefined =>
  maybeEDate === 'original' ? 'original' : assertISODate(maybeEDate);

// ---------------------------------------------------------------------------

// eslint-disable-next-line complexity
const handleRequest = async <N extends string = RegQueryName>(
  req: FastifyRequest,
  res: FastifyReply,
  opts: RegHandlerOpts<N>,
  handler: (
    res: FastifyReply,
    opts: RefinedRegHandlerOpts<N>,
    routePath: string,
  ) => Promise<boolean>,
) => {
  const { name, date, diff, earlierDate, current = false } = opts;
  const dateMissing = 'date' in opts && !date;
  const validEarlierDate =
    !date ||
    !diff ||
    !earlierDate ||
    earlierDate === 'original' ||
    earlierDate <= date;

  if (name && !dateMissing && validEarlierDate) {
    const earlierDateDate =
      earlierDate === 'original'
        ? 'original'
        : earlierDate && new Date(earlierDate);

    const handlerOpts: RefinedRegHandlerOpts<N> = {
      name,
      date: date && new Date(date),
      ...(earlierDateDate
        ? { earlierDate: earlierDateDate, diff: true }
        : { diff }),
      current,
    };

    // NOTE: Is there a better/cleaner/more robust way to
    // provide this info?
    const routePath = req.url
      .replace(/^\/api\/v[0-9]+\/regulation\//, '')
      .split('?')[0] // remove any potential query strings
      .replace(/\/pdf$/, ''); // and chop off pdf suffixes, if present

    const success = await handler(res, handlerOpts, routePath);

    if (!success) {
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

// ===========================================================================

const handleDataRequest = (
  req: FastifyRequest,
  res: FastifyReply,
  redis: FastifyRedis,
  opts: RegHandlerOpts,
) =>
  handleRequest(req, res, opts, async (res, opts, routePath) => {
    const { name, date, diff, earlierDate } = opts;

    const cacheKey = routePath;

    const cached = await get<
      RegulationRedirect | Regulation | RegulationDiff | null
    >(redis, cacheKey);

    let regulation;

    if (cached) {
      regulation = cached;
    } else {
      try {
        regulation = await getRegulation(
          slugToName(name),
          {
            date,
            diff,
            earlierDate,
          },
          routePath,
        );
      } catch (e) {
        console.error('unable to get regulation', cacheKey, e);
        return res.status(500).send();
      }
      set(redis, cacheKey, regulation, REGULATION_REDIS_TTL);
    }

    if (!regulation) {
      return false;
    }
    cacheControl(res, REGULATION_TTL);
    res.send(regulation);
    return true;
  });

// ===========================================================================

const handlePdfRequest = (
  req: FastifyRequest,
  res: FastifyReply,
  opts: RegHandlerOpts<'new'>,
  body?: unknown,
) =>
  handleRequest(req, res, opts, async (res, opts, routePath) => {
    const job =
      opts.name !== 'new'
        ? makePublishedPdf(
            routePath,
            // @ts-expect-error  (TS doesn't realize opts.name can't be 'new' at this point)
            opts,
          )
        : body
        ? makeDraftPdf(body)
        : undefined;

    // TODO: return 304 when possible for conditional (If-Modified-Since:) request.

    const { fileName, pdfContents } = (await job) || {};

    if (!fileName || !pdfContents) {
      return false;
    }

    cacheControl(res, PDF_FILE_TTL);

    if (!opts.current) {
      res.header('X-Robots-Tag', 'noindex');
    }

    res
      .code(200)
      // .header('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
      .header(
        'Content-Disposition',
        `inline; filename="${encodeURI(fileName)}.pdf"`,
      )
      .type('application/pdf')
      .send(pdfContents);

    return true;
  });

// ===========================================================================

//

// ===========================================================================

export const regulationRoutes: FastifyPluginCallback = (
  fastify,
  opts,
  done,
) => {
  /**
   * Returns original version of a regulation
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {Regulation | RegulationRedirect}
   */
  fastify.get<Pms<'name'>>('/regulation/:name/original', opts, (req, res) => {
    handleDataRequest(req, res, fastify.redis, {
      name: assertNameSlug(req.params.name),
    });
  });
  /**
   * Returns original version of a regulation in PDF format
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns pdf file
   */
  fastify.get<Pms<'name'>>(
    '/regulation/:name/original/pdf',
    opts,
    (req, res) => {
      handlePdfRequest(req, res, {
        name: assertNameSlug(req.params.name),
      });
    },
  );

  /**
   * Returns current version of a regulation with all changes applied
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {Regulation | RegulationRedirect}
   */
  fastify.get<Pms<'name'>>('/regulation/:name/current', opts, (req, res) => {
    handleDataRequest(req, res, fastify.redis, {
      name: assertNameSlug(req.params.name),
      date: toISODate(new Date()),
      current: true,
    });
  });
  /**
   * Returns current version of a regulation with all changes applied in PDF format
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns pdf file
   */
  fastify.get<Pms<'name'>>(
    '/regulation/:name/current/pdf',
    opts,
    (req, res) => {
      handlePdfRequest(req, res, {
        name: assertNameSlug(req.params.name),
        date: toISODate(new Date()),
        current: true,
      });
    },
  );

  /**
   * Returns current version of a regulation with all changes applied, showing
   * the total changes the "original" verion.
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {RegulationDiff | RegulationRedirect}
   */
  fastify.get<Pms<'name'>>('/regulation/:name/diff', opts, (req, res) => {
    handleDataRequest(req, res, fastify.redis, {
      name: assertNameSlug(req.params.name),
      date: toISODate(new Date()),
      diff: true,
      earlierDate: 'original',
    });
  });
  /**
   * Returns current version of a regulation with all changes applied, showing
   * the total changes the "original" verion in PDF format
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns pdf file
   */
  fastify.get<Pms<'name'>>('/regulation/:name/diff/pdf', opts, (req, res) => {
    handlePdfRequest(req, res, {
      name: assertNameSlug(req.params.name),
      date: toISODate(new Date()),
      diff: true,
      earlierDate: 'original',
    });
  });

  /**
   * Returns a version of a regulation as it was on a specific date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {Regulation | RegulationRedirect}
   */
  fastify.get<Pms<'name' | 'date'>>(
    '/regulation/:name/d/:date',
    opts,
    (req, res) => {
      handleDataRequest(req, res, fastify.redis, {
        name: assertNameSlug(req.params.name),
        date: assertISODate(req.params.date),
      });
    },
  );
  /**
   * Returns a version of a regulation as it was on a specific date in PDF format
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns pdf file
   */
  fastify.get<Pms<'name' | 'date'>>(
    '/regulation/:name/d/:date/pdf',
    opts,
    (req, res) => {
      handlePdfRequest(req, res, {
        name: assertNameSlug(req.params.name),
        date: assertISODate(req.params.date),
      });
    },
  );

  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {RegulationDiff | RegulationRedirect}
   */
  fastify.get<Pms<'name' | 'date'>>(
    '/regulation/:name/d/:date/diff',
    opts,
    (req, res) => {
      handleDataRequest(req, res, fastify.redis, {
        name: assertNameSlug(req.params.name),
        date: assertISODate(req.params.date),
        diff: true,
      });
    },
  );
  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date in PDF format
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns pdf file
   */
  fastify.get<Pms<'name' | 'date'>>(
    '/regulation/:name/d/:date/diff/pdf',
    opts,
    (req, res) => {
      handlePdfRequest(req, res, {
        name: assertNameSlug(req.params.name),
        date: assertISODate(req.params.date),
        diff: true,
      });
    },
  );

  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @param {string} earlierDate - ISODate (`YYYY-MM-DD`) or 'original'
   * @returns {RegulationDiff | RegulationRedirect}
   */
  fastify.get<Pms<'name' | 'date' | 'earlierDate'>>(
    '/regulation/:name/d/:date/diff/:earlierDate',
    opts,
    (req, res) => {
      handleDataRequest(req, res, fastify.redis, {
        name: assertNameSlug(req.params.name),
        date: assertISODate(req.params.date),
        diff: true,
        earlierDate: assertEarlierDate(req.params.earlierDate),
      });
    },
  );
  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date in PDF format
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @param {string} earlierDate - ISODate (`YYYY-MM-DD`) or 'original'
   * @returns pdf file
   */
  fastify.get<Pms<'name' | 'date' | 'earlierDate'>>(
    '/regulation/:name/d/:date/diff/:earlierDate/pdf',
    opts,
    (req, res) => {
      handlePdfRequest(req, res, {
        name: assertNameSlug(req.params.name),
        date: assertISODate(req.params.date),
        diff: true,
        earlierDate: assertEarlierDate(req.params.earlierDate),
      });
    },
  );

  // ---------------------------------------------------------------------------

  /**
   * Accepts regulation data
   * Returns the regulation data as a regulation, in PDF format
   * @body {Regulation} Regulation object with optional name
   * @returns pdf file
   */
  fastify.post('/regulation/generate-pdf', opts, (req, res) => {
    handlePdfRequest(req, res, { name: 'new' }, req.body);
  });

  done();
};
