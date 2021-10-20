import {
  Regulation,
  Appendix,
  HTMLText,
  PlainText,
  RegulationMaybeDiff,
  RegulationRedirect,
  RegulationDiff,
} from 'routes/types';
import {
  assertISODate,
  assertRegName,
  isNonNull,
  prettyName,
} from '../utils/misc';
import { cleanupAllEditorOutputs } from '@hugsmidjan/regulations-editor/cleanupEditorOutput';
import { cleanTitle } from '@hugsmidjan/regulations-editor/cleanTitle';
import fs from 'fs';
import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { HOUR } from '@hugsmidjan/qj/time';

export type InputRegulation = Pick<
  Regulation,
  'title' | 'text' | 'appendixes' | 'comments'
> & {
  name?: Regulation['name'];
  showingDiff?: undefined;
  lastAmendDate?: undefined;
  timelineDate?: undefined;
  repealedDate?: undefined;
  signatureDate?: Regulation['signatureDate'];
  publishedDate?: Regulation['publishedDate'];
  effectiveDate?: Regulation['effectiveDate'];
};

// ---------------------------------------------------------------------------

export const PDF_FILE_TTL = 1 * HOUR;

export const shouldMakePdf = (fileName: string) => {
  return true;
  // FIXME: Write to S3 instead of Heroku's fickle fs.
  if (!fs.existsSync(fileName)) {
    return true;
  }
  const age = Date.now() - fs.statSync(fileName).mtimeMs;
  return age > PDF_FILE_TTL;
};

// ===========================================================================

const sanitizeTextContent = (text: PlainText): HTMLText =>
  text.replace(/&/, '&amp;').replace(/</g, '&lt;') as HTMLText;

const CSS = fs.readFileSync('./dist/RegulationPdf.css');

const pdfTmplate = (regulation: RegulationMaybeDiff | InputRegulation) => {
  const {
    name,
    lastAmendDate,
    timelineDate,
    effectiveDate,
    text,
    appendixes,
    comments = '',
    // signatureDate,
    publishedDate,
  } = regulation;

  const title = regulation.showingDiff
    ? regulation.title
    : sanitizeTextContent(regulation.title);
  const nameStr = name && prettyName(name);

  const statusText =
    !timelineDate && lastAmendDate
      ? `Með breytingum fram til `
      : lastAmendDate
      ? `Síðast breytt: ${lastAmendDate}`
      : `Tók gildi: ${effectiveDate}`;

  const footerStr = '';

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
  </body>
</html>`;
};

// ===========================================================================

export function makeRegulationPdf(
  fileName: string,
  regulation?:
    | InputRegulation
    | Regulation
    | RegulationDiff
    | RegulationRedirect,
): Promise<boolean> {
  if (!regulation || 'redirectUrl' in regulation) {
    return Promise.resolve(false);
  }

  const htmlFile = fileName + '.html';

  return writeFile(htmlFile, pdfTmplate(regulation))
    .then(
      () =>
        new Promise<boolean>((resolve, reject) => {
          exec(
            // Increasing context to 5 lines (effectively: words) seems reasonable
            // since each line is so short (contains so little actual context)
            `pagedjs-cli ${htmlFile}  --browserArgs --no-sandbox,--font-render-hinting=none  --output ${fileName}`,
            (err) => {
              unlink(htmlFile);
              if (!err) {
                resolve(true);
              } else {
                reject(err);
              }
            },
          );
        }),
    )
    .catch((err) => {
      console.error(err);
      return false;
    });
}

// ===========================================================================

export function getPdfFileName(name: string) {
  const dirName = './regulation-pdf';
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }
  return `${dirName}/${name}.pdf`;
}

// ===========================================================================

export function cleanUpRegulationBodyInput(
  reqBody: unknown,
): InputRegulation | undefined {
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
}
