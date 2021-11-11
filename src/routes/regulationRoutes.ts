import { FastifyRedis } from 'fastify-redis';
import { get, set } from 'utils/cache';
import { fetchModifiedDate, getRegulation } from '../db/Regulation';
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
  Regulation,
  RegulationDiff,
  RegulationRedirect,
} from './types';
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import { getQueue, handleWorker } from 'utils/bullQueue';
import {
  doGeneratePdf,
  getPrettyPdfFilename,
  getPublishedPdf,
} from 'db/RegulationPdf';

const REGULATION_TTL = 0.1;
const PDF_FILE_TTL = 1;
const REGULATION_REDIS_TTL = REGULATION_TTL * 60 * 60;

export type PdfQueueItem = {
  routePath: string;
  opts: RefinedRegHandlerOpts<'new'>;
  body?: unknown;
};

const pdfQueue = getQueue<PdfQueueItem>();

// ---------------------------------------------------------------------------

type EarlierDate = ISODate | 'original';

type RegHandlerOpts<N extends string = RegQueryName> = {
  name?: RegQueryName | N;
  date?: ISODate;
  diff?: boolean;
  earlierDate?: EarlierDate;
};
type RefinedRegHandlerOpts<N extends string = RegQueryName> = {
  name: RegQueryName | N;
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
  const { name, date, diff, earlierDate } = opts;
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

const returnRefresh = (res: FastifyReply) => {
  // always return the refresh page
  res
    .code(202)
    .type('text/html')
    .send(
      '<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="1"></head><body>Augnablik, PDF er í vinnslu. Þessi síða mun uppfærast.</body></html>',
    );
};

// ===========================================================================

const handlePdfRequest = (
  req: FastifyRequest,
  res: FastifyReply,
  opts: RegHandlerOpts<'new'>,
  body?: unknown,
) =>
  handleRequest(req, res, opts, async (res, opts, routePath) => {
    let pdfContents: Buffer | undefined | false;
    let fileName: string | undefined;
    if (opts.name !== 'new') {
      const regName = slugToName(opts.name);
      const [pdf, regModified] = await Promise.all([
        getPublishedPdf(routePath),
        fetchModifiedDate(regName, opts.date),
      ]);

      if (regModified) {
        if (pdf) {
          if (doGeneratePdf(pdf, regModified)) {
            const workerPDf = await handleWorker(routePath, pdfQueue, {
              routePath,
              opts,
              body,
            });

            if (workerPDf.working) {
              returnRefresh(res);
              return true;
            } else {
              fileName = workerPDf.fileName;
              pdfContents = workerPDf.pdfContents;
            }
          } else {
            // pdf exists and is up to date
            // @ts-expect-error silly typescript does not realize `opts.name` can not be `new`
            fileName = getPrettyPdfFilename(opts, regModified);
            pdfContents = pdf.contents;
          }
        }

        // skip if still working
        if (!fileName || !pdfContents) {
          return false;
        }

        cacheControl(res, PDF_FILE_TTL);
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
      } else {
        // Regulation not found.
        return false;
      }
    } else {
      // Generate
      const workerPDf = await handleWorker(routePath, pdfQueue, {
        routePath,
        opts,
        body,
      });

      if (workerPDf.working) {
        returnRefresh(res);
        return true;
      } else {
        fileName = workerPDf.fileName;
        pdfContents = workerPDf.pdfContents;
      }

      if (!fileName || !pdfContents) {
        return false;
      }

      cacheControl(res, PDF_FILE_TTL);
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
    }
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
