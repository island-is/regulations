import {
  RegQueryName,
  Regulation,
  RegulationRedirect,
  Appendix,
  InputRegulation,
  RegName,
  HTMLText,
} from 'routes/types';
import html_pdf_node from 'html-pdf-node';
import { getRegulation } from './Regulation';
import { slugToName, nameToSlug, assertISODate } from '../utils/misc';
import { cleanupAllEditorOutputs } from '@hugsmidjan/regulations-editor/cleanupEditorOutput';
import fs from 'fs';
import { HOUR } from '@hugsmidjan/qj/time';

export const shouldMakePdf = (fileName: string) => {
  if (!fs.existsSync(fileName)) {
    return true;
  }
  const age = Date.now() - fs.statSync(fileName).mtimeMs;
  return age > 1 * HOUR;
};

// ===========================================================================

const CSS = fs.readFileSync('./dist/RegulationPdf.css');

const pdfTmplate = (regulation: Regulation | InputRegulation) => {
  const {
    name,
    title,
    lastAmendDate,
    effectiveDate,
    text,
    appendixes,
    comments = '',
  } = regulation;
  const prettyName = name ? name.replace(/^0+/, '') : '';

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
          ? `<div class="regulation__name">Reglugerð nr. ${prettyName}</div>`
          : ''
      }
      <div class="regulation__date">${
        lastAmendDate
          ? `Síðast breytt: ${lastAmendDate}`
          : effectiveDate
          ? `Tók gildi: ${effectiveDate}`
          : ''
      }</div>
    </div>
    <h1 class="regulation__title">${title}</h1>

    ${text}

    ${appendixes
      .map(
        (appendix) => `
    <section class="appendix">
      <h2 class="appendix__title">${appendix.title}</h2>
      ${appendix.text}
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

export async function makeRegulationPdf(
  name: RegQueryName,
  fileName: string,
  date?: Date,
  regulationInput?: InputRegulation,
): Promise<boolean> {
  const regulation =
    regulationInput ||
    ((await getRegulation(slugToName(name), {
      date: date || new Date(),
    })) as Regulation | RegulationRedirect);

  if (!regulation || !('text' in regulation)) {
    return false;
  }

  return html_pdf_node
    .generatePdf(
      { content: pdfTmplate(regulation) },
      {
        preferCSSPageSize: true,
        printBackground: true,
      },
    )
    .then((buffer) => {
      fs.writeFileSync(fileName, buffer, { encoding: 'binary' });
      return true;
    })
    .catch((err) => {
      console.error(err);
      return false;
    });
}

// ===========================================================================

export function getRegulationNames(name: string) {
  const fileNameWithExtension = `${name}.pdf`;
  const dirName = `${__dirname}/regulation-pdf`;
  const fileName = `${dirName}/${fileNameWithExtension}`;

  !fs.existsSync(dirName) && fs.mkdirSync(dirName, { recursive: true });

  return { fileNameWithExtension, fileName };
}

// ===========================================================================

export function cleanUpRegulationBodyInput(regBody: InputRegulation) {
  const name = regBody.name
    ? regBody.name
    : (`temp_${new Date().getTime().toString()}` as RegName);

  const simpleHtmlCleanRegex = /(&nbsp;|<([^>]+)>)/gi;

  const lastAmendDate = assertISODate(regBody.lastAmendDate || '');
  const effectiveDate = assertISODate(regBody.effectiveDate || '');

  const cleanHTML = cleanupAllEditorOutputs({
    text: regBody.text,
    appendixes: regBody.appendixes as Appendix[],
    comments: regBody.comments,
  });

  const cleanInputRegulation = {
    name,
    title: regBody.title.replace(simpleHtmlCleanRegex, ''),
    text: cleanHTML.text as HTMLText,
    appendixes: cleanHTML.appendixes as Appendix[],
    comments: cleanHTML.comments as HTMLText,
    lastAmendDate,
    effectiveDate,
  };

  return cleanInputRegulation;
}
