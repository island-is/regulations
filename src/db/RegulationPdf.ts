import {
  Regulation,
  Appendix,
  HTMLText,
  PlainText,
  RegulationMaybeDiff,
  RegulationRedirect,
  RegulationDiff,
  RegName,
  RegQueryName,
  ISODateTime,
} from 'routes/types';
import {
  assertISODate,
  assertRegName,
  formatDate as fmt,
  isNonNull,
  nameToSlug,
  prettyName,
  slugToName,
  toISODate,
  toISODateTime,
} from '../utils/misc';
import { cleanupAllEditorOutputs } from '@hugsmidjan/regulations-editor/cleanupEditorOutput';
import { cleanTitle } from '@hugsmidjan/regulations-editor/cleanTitle';
import fs from 'fs';
import { exec } from 'child_process';
import { writeFile, unlink, readFile } from 'fs/promises';
import arrayToObject from '@hugsmidjan/qj/arrayToObject';
import {
  AWS_BUCKET_NAME,
  AWS_REGION_NAME,
  MEDIA_BUCKET_FOLDER,
  PDF_TEMPLATE_UPDATED,
} from '../constants';
import { fetchModifiedDate, getRegulation } from './Regulation';
import S3 from 'aws-sdk/clients/s3';
import fetch from 'node-fetch';
import { SECOND } from '@hugsmidjan/qj/time';

export type InputRegulation = Pick<
  Regulation,
  'title' | 'text' | 'appendixes' | 'comments'
> & {
  name?: Regulation['name'];
  showingDiff?: undefined;
  lastAmendDate?: undefined;
  timelineDate?: undefined;
  repealedDate?: undefined;
  repealed?: undefined;
  signatureDate?: Regulation['signatureDate'];
  publishedDate?: Regulation['publishedDate'];
  effectiveDate?: Regulation['effectiveDate'];
  history?: undefined;
  pdfVersion?: undefined;
};

// ---------------------------------------------------------------------------

const sanitizeTextContent = (text: PlainText): HTMLText =>
  text.replace(/&/, '&amp;').replace(/</g, '&lt;') as HTMLText;

// ---------------------------------------------------------------------------

const getStatusText = (regulation: RegulationMaybeDiff): string => {
  const {
    timelineDate,
    lastAmendDate,
    effectiveDate,
    // publishedDate,
    history,
    showingDiff,
    repealed,
    repealedDate,
  } = regulation;
  const today = toISODate(new Date());
  const printoutDateStr =
    ' <small class="printoutdate">(prentað ' + fmt(today) + ')</small>';

  if (showingDiff) {
    const { from: dateFrom, to: dateTo } = showingDiff;

    const affectingRegulations = Object.values(
      arrayToObject(
        history.filter(
          ({ effect, date }) =>
            effect === 'amend' && dateFrom <= date && date <= dateTo,
        ),
        'name',
      ),
    );
    const affectingNames = affectingRegulations
      .map((affectingReg, i, arr) => {
        const separator = i === 0 ? '' : i < arr.length - 1 ? ', ' : ' og ';
        return separator + prettyName(affectingReg.name);
      })
      .join('');

    const isFuture = today < dateTo;

    return (
      'Sýnir breytingar ' +
      (isFuture ? 'væntanlegar' : 'gerðar') +
      (affectingRegulations.length === 1
        ? ` þann ${fmt(dateTo)}`
        : ` á tímabilinu ${fmt(dateFrom)} – ${fmt(dateTo)}`) +
      `\n<small class="affecting">af rg.nr. ${affectingNames}</small>` +
      ' ' +
      printoutDateStr +
      (isFuture ? ' ' + printoutDateStr : '')
    );
  }

  if (!timelineDate || timelineDate === lastAmendDate) {
    const fmtLastModified = fmt(lastAmendDate || effectiveDate);

    if (repealed) {
      return (
        `Útgáfa sem gilti frá ${fmtLastModified} fram að ` +
        (repealedDate ? ` brottfellingu ${fmt(repealedDate)}` : 'ógildingu')
      );
    }
    return `Útgáfa í gildi frá ${fmtLastModified}` + printoutDateStr;
  }

  const nextTimelineDate = (() => {
    const idx = [{ date: effectiveDate }]
      .concat(history)
      .findIndex((item) => item.date === timelineDate);
    const nextItem = idx > -1 && history[idx];
    return nextItem ? nextItem.date : undefined;
  })();
  const fmtDateFrom = fmt(timelineDate);
  const fmtDateTo = fmt(nextTimelineDate || today);

  if (today < timelineDate) {
    if (nextTimelineDate) {
      return (
        `Væntanleg útgáfa sem á að gilda frá ${fmtDateFrom} – ${fmtDateTo}` +
        printoutDateStr
      );
    }
    return (
      `Væntanleg útgáfa sem á að taka gildi ${fmtDateFrom}` + printoutDateStr
    );
  }

  return `Útgáfa sem gilti á tímabilinu ${fmtDateFrom} – ${fmtDateTo}`;
};

// ---------------------------------------------------------------------------
const CSS = fs.readFileSync('./dist/RegulationPdf.css');

const pdfTmplate = (regulation: RegulationMaybeDiff | InputRegulation) => {
  const {
    name,
    text,
    appendixes,
    comments = '',
    // effectiveDate,
    // signatureDate,
    publishedDate,
    pdfVersion,
  } = regulation;

  const title = regulation.showingDiff
    ? regulation.title
    : sanitizeTextContent(regulation.title);
  const nameStr = name && prettyName(name);

  let statusText: string | undefined;

  if (!regulation.history) {
    statusText = publishedDate && `Útgáfudagur ${fmt(publishedDate)}`;
  } else {
    statusText = getStatusText(regulation);
  }

  const footerStr = pdfVersion
    ? `<a class="pdfurl" href="${pdfVersion}">${pdfVersion}</a>`
    : '';

  return `
<html>
  <head>
    <meta charset="utf8">
    <title>${title}</title>
    <style>${CSS}</style>
  </head>
  <body>
    <div class="regulation__meta">
      ${
        name
          ? `<div class="regulation__name">Nr. <strong>${nameStr}</strong></div>`
          : ''
      }
      ${statusText ? `<div class="regulation__status">${statusText}</div>` : ''}
      ${footerStr ? `<div class="regulation__footer">${footerStr}</div>` : ''}
      </div>
    <h1 class="regulation__title">${title}</h1>

    ${text}

    ${appendixes
      .map(
        ({ title, text }) => `
    <section class="appendix">
      <h2 class="appendix__title">${
        regulation.showingDiff ? title : sanitizeTextContent(title as PlainText)
      }</h2>
      ${text}
    </section>
    `,
      )
      .join('')}

    ${
      comments &&
      `
    <section class="comments">
      <h2 class="comments__title">Athugasemdir ritstjóra</h2>
      ${comments}
    </section>
    `
    }

    <section class="disclaimer">
      <h2 class="disclaimer__title">Fyrirvari</h2>
      <div class="disclaimer__text">
        <p>Reglugerðir eru birtar í B-deild Stjórnartíðinda skv. 3. gr. laga um Stjórnartíðindi og Lögbirtingablað, nr. 15/2005, sbr. reglugerð um útgáfu Stjórnartíðinda nr. 958/2005.</p>
        <p>Sé misræmi milli þess texta sem birtist hér í safninu og þess sem birtur er í útgáfu B-deildar Stjórnartíðinda skal sá síðarnefndi ráða.</p>
      </div>
    </section>

  </body>
</html>`;
};

// ===========================================================================

let guid = 1;
const guid_prefix = 'temp_' + Date.now() + '_';

const makeRegulationPdf = (
  regulation?:
    | InputRegulation
    | Regulation
    | RegulationDiff
    | RegulationRedirect,
): Promise<Buffer | false> => {
  if (!regulation || 'redirectUrl' in regulation) {
    return Promise.resolve(false);
  }

  const tmpFileName = guid_prefix + guid++;

  const htmlFile = tmpFileName + '.html';

  return writeFile(htmlFile, pdfTmplate(regulation))
    .then(
      () =>
        new Promise<Buffer>((resolve, reject) => {
          exec(
            // Increasing context to 5 lines (effectively: words) seems reasonable
            // since each line is so short (contains so little actual context)
            `pagedjs-cli ${htmlFile}` +
              `  --browserArgs --no-sandbox,--font-render-hinting=none` +
              `  --timeout ${90 * SECOND}` +
              `  --output ${tmpFileName}`,
            (err) => {
              unlink(htmlFile);
              if (err) {
                reject(err);
              }
              resolve(
                readFile(tmpFileName).then((file) => {
                  unlink(tmpFileName);
                  return file;
                }),
              );
            },
          );
        }),
    )
    .catch((err: unknown) => {
      console.error(err);
      return false;
    });
};

// ---------------------------------------------------------------------------

const cleanUpRegulationBodyInput = (
  reqBody: unknown,
): InputRegulation | undefined => {
  if (typeof reqBody !== 'object' || reqBody == null) {
    return;
  }
  const body = reqBody as Record<string, unknown>;

  const name = assertRegName(String(body.name));
  const effectiveDate = assertISODate(String(body.effectiveDate));
  const publishedDate = assertISODate(String(body.publishedDate));
  const signatureDate = assertISODate(String(body.signatureDate));

  const dirtyTitle = String(body.title);
  const dirtyText = String(body.text) as HTMLText;
  const dirtyCommments = String(body.comments || '') as HTMLText;
  const dirtyAppendixes = (
    Array.isArray(body.appendixes) ? body.appendixes : []
  )
    .map((wat: unknown): Appendix | undefined => {
      if (typeof wat !== 'object' || wat == null) {
        return;
      }
      const appendix = wat as Record<string, unknown>;
      return {
        title: cleanTitle(String(appendix.title)),
        text: String(appendix.text) as HTMLText,
      };
    })
    .filter(isNonNull);

  const title = cleanTitle(dirtyTitle);
  const { text, appendixes, comments } = cleanupAllEditorOutputs({
    text: dirtyText,
    appendixes: dirtyAppendixes,
    comments: dirtyCommments,
  }) as Pick<Regulation, 'text' | 'appendixes' | 'comments'>;

  if (title && text) {
    return {
      title,
      text,
      appendixes,
      comments,
      name,
      signatureDate,
      publishedDate,
      effectiveDate,
    };
  }
};

// ---------------------------------------------------------------------------

const fetchPdf = (fileKey: string) =>
  fetch(
    `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION_NAME}.amazonaws.com/${fileKey}`,
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Error fetching '${res.url}' (${res.status})`);
      }
      return res.buffer().then((contents) => ({
        contents: contents,
        modifiedDate:
          toISODateTime(res.headers.get('Last-Modified')) || ('' as const),
      }));
    })
    .catch(() => ({ contents: false, modifiedDate: '' } as const));

const s3 = new S3({ region: AWS_REGION_NAME });
const doLog = !!MEDIA_BUCKET_FOLDER;

const uploadPdf = (fileKey: string, pdfContents: Buffer) =>
  s3
    .upload({
      Bucket: AWS_BUCKET_NAME,
      Key: fileKey,
      ACL: 'public-read',
      ContentType: 'application/pdf',
      Body: pdfContents,
    })
    .promise()
    .then((data) => {
      doLog && console.info('🆗 Uploaded', data.Key);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : error;
      console.info('⚠️ ', message);
    });

type RegOpts = {
  name: RegQueryName;
  date?: Date;
  diff?: boolean;
  earlierDate?: Date | 'original';
};

const getPrettyPdfFilename = (
  opts: RegOpts,
  name: RegName,
  lastÞModified: ISODateTime,
) => {
  const { date, diff, earlierDate } = opts;

  const nameTxt = nameToSlug(name);
  const dateTxt = toISODate(date ? date : lastÞModified);
  const diffTxt = diff ? ' breytingar' : '';
  const earlierDateTxt = !earlierDate
    ? ''
    : earlierDate === 'original'
    ? ' frá upphafi'
    : ` síðan ${toISODate(earlierDate)}`;

  return `Reglugerð ${nameTxt} (${dateTxt + diffTxt + earlierDateTxt})`;
};

const _keyPrefix = MEDIA_BUCKET_FOLDER ? MEDIA_BUCKET_FOLDER + '/' : '';

const getPdfFileKey = (routePath: string) =>
  `${_keyPrefix}pdf/${routePath.replace(/\//g, '--')}.pdf`;

// ===========================================================================

export const makeDraftPdf = async (body: unknown) => {
  const unpublishedReg = cleanUpRegulationBodyInput(body);
  if (unpublishedReg) {
    const fileName =
      'Reglugerð ' + toISODate(new Date()) + ' – ' + unpublishedReg.name;
    const pdfContents = await makeRegulationPdf(unpublishedReg);
    return { fileName, pdfContents };
  }
  return {};
};

// ===========================================================================

export const _makePublishedPdf = async (routePath: string, opts: RegOpts) => {
  const { name, date, diff, earlierDate } = opts;
  const regName = slugToName(name);
  const fileKey = getPdfFileKey(routePath);

  try {
    const [pdf, regModified] = await Promise.all([
      fetchPdf(fileKey),
      date && fetchModifiedDate(regName),
    ]);
    if (regModified) {
      let pdfContents = pdf.contents;

      // NOTE: regModified is really an ISODate with a faux timestamp appended.
      // this may cause some weird behavior sometimes.

      const doGeneratePdf =
        !pdfContents ||
        regModified > pdf.modifiedDate ||
        PDF_TEMPLATE_UPDATED > pdf.modifiedDate;

      if (doGeneratePdf) {
        const regulation =
          (await getRegulation(
            regName,
            { date, diff, earlierDate },
            routePath,
          )) || undefined;
        pdfContents = await makeRegulationPdf(regulation);
        pdfContents && uploadPdf(fileKey, pdfContents);
      }
      const fileName = getPrettyPdfFilename(opts, regName, regModified);
      return { fileName, pdfContents };
    }
  } catch (error) {
    console.log(error);
  }

  return {};
};

// ---------------------------------------------------------------------------

const pdfJobs: Record<
  string,
  ReturnType<typeof _makePublishedPdf> | undefined
> = {};

export const makePublishedPdf = (routePath: string, opts: RegOpts) => {
  let job = pdfJobs[routePath];
  if (!job) {
    job = _makePublishedPdf(routePath, opts);
    pdfJobs[routePath] = job;
    job.then(() => {
      delete pdfJobs[routePath];
    });
  }
  return job;
};
