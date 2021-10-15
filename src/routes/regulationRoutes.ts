import { getRegulation } from '../db/Regulation';
import {
  assertISODate,
  assertNameSlug,
  slugToName,
  Pms,
  cache,
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
import { FastifyPluginCallback, FastifyReply } from 'fastify';
import {
  getPdfFileName,
  makeRegulationPdf,
  shouldMakePdf,
  cleanUpRegulationBodyInput,
  PDF_FILE_TTL,
} from '../db/RegulationPdf';
import fs from 'fs';

const REGULATION_TTL = 0.1;

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
  res: FastifyReply,
  opts: RegHandlerOpts<N>,
  handler: (
    res: FastifyReply,
    opts: RefinedRegHandlerOpts<N>,
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
    const success = await handler(res, handlerOpts);

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

const handleDataRequest = (res: FastifyReply, opts: RegHandlerOpts) =>
  handleRequest(res, opts, async (res, opts) => {
    const { name, date, diff, earlierDate } = opts;
    const regulation = await getRegulation(slugToName(name), {
      date,
      diff,
      earlierDate,
    });
    if (!regulation) {
      return false;
    }
    cache(res, REGULATION_TTL);
    res.send(regulation);
    return true;
  });

// ===========================================================================

const handlePdfRequest = (
  res: FastifyReply,
  opts: RegHandlerOpts<'new'>,
  body?: unknown,
) =>
  handleRequest(res, opts, async (res, opts) => {
    const { date, diff, earlierDate } = opts;

    const name = opts.name !== 'new' ? opts.name : undefined;

    const fileName = getPdfFileName(name || 'new_' + toISODate(new Date()));

    if (body || shouldMakePdf(fileName)) {
      const regulation = body
        ? cleanUpRegulationBodyInput(body)
        : name
        ? await getRegulation(slugToName(name), {
            date,
            diff,
            earlierDate,
          })
        : undefined;

      if (!regulation) {
        return false;
      }

      const success = await makeRegulationPdf(fileName, regulation);

      if (!success) {
        return false;
      }
    }
    const pdfContents = fs.readFileSync(fileName);
    body && fs.unlinkSync(fileName); // This is a temporary file

    cache(res, PDF_FILE_TTL);
    res.status(200).type('application/pdf').send(pdfContents);
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
    handleDataRequest(res, {
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
      handlePdfRequest(res, {
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
    handleDataRequest(res, {
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
      handlePdfRequest(res, {
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
    handleDataRequest(res, {
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
    handlePdfRequest(res, {
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
      handleDataRequest(res, {
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
      handlePdfRequest(res, {
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
      handleDataRequest(res, {
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
      handlePdfRequest(res, {
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
      handleDataRequest(res, {
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
      handlePdfRequest(res, {
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
    handlePdfRequest(res, { name: 'new' }, req.body);
  });

  done();
};
