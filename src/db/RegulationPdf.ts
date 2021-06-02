import { RegQueryName, Regulation, RegulationRedirect } from 'routes/types';
import html_pdf_node from 'html-pdf-node';
import { getRegulation } from './Regulation';
import { slugToName } from '../utils/misc';
import fs from 'fs';
import { HOUR } from 'qj/time';

export const shouldMakePdf = (fileName: string) => {
  if (!fs.existsSync(fileName)) {
    return true;
  }
  const age = Date.now() - fs.statSync(fileName).mtimeMs;
  return age > 1 * HOUR;
};

// ===========================================================================

const CSS = `
* {
  font-size: inherit;
  line-height: inherit;
  margin: 0;
  padding: 0;
}
html {
  font-family: 'Times New Roman', 'Times', serif;
  font-weight: 400;
  line-height: 1.33;
  font-size: 10pt;
  background: #fff;
  -webkit-print-color-adjust: exact;
  box-sizing: border-box;
}
ul,ol,table,blockquote {
  margin: 6pt 0;
}
p {
  text-indent: 18pt;
}
ul, ol, blockquote {
  margin-left: 18pt;
}
ul {
  list-style: disc;
}
ul[type="circle"] {
  list-style: circle;
}
ul[type="square"] {
  list-style: square;
}

p:last-child,
ul:last-child,
ol:last-child,
table:last-child {
  margin-bottom: 0;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 6pt 0;
}

th,td {
  padding: 2pt 5pt;
  min-width: 18pt;
  text-align: left;
  vertical-align: top;
  width: auto;
}
table:not(.layout) th,
table:not(.layout) td {
  border: 1px solid #000;
}

tr:not(:first-child) > th,
tr:not(:first-child) > td {
  border-top: 0,
}

tr > th:not(:first-child),
tr > td:not(:first-child) {
  border-left: 0,
}

th {
  font-weight: bold;
}

thead tr:last-child th {
  border-bottom-width: 2pt;
}
tfoot tr:first-child td,
tfoot tr:first-child th {
  border-top: 1px solid #000;
}

ol:not([type]) {
  list-style: decimal;
}

[align="right"] {
  text-align: right;
}
[align="center"] {
  text-align: center;
}

.regulation__meta {
  display: flex;
  justify-content: space-between;
  font-size: 9pt;
}
.regulation__name {
  font-weight: bold;
}
.regulation__date {
}

.regulation__title {
  font-size: 18pt;
  line-height: 1.1;
  text-align: center;
}

.chapter__title {
  text-align: center;
  font-size: 10pt;
}
.chapter__title > em {
  display: block;
  font-style: inherit;
}

.chapter__title {
  margin-top: 15pt;
  text-align: center;
  font-size: 10pt;
  line-height: 15pt;
}
.chapter__title:first-child {
  margin-top: 0;
}
.chapter__name {
  display: block;
  font-style: inherit;
  font-weight: 700;
}

.article__title {
  margin-top: 15pt;
  margin-bottom: 0;
  text-align: center;
  font-size: 10pt;
  line-height: 15pt;
  font-weight: 700;
}
.article__title:first-child,
.chapter__title + .article__title {
  margin-top: 0;
}
.article__name {
  display: block;
  font-style: italic;
}
`;

const pdfTmplate = (regulation: Regulation) => {
  const {
    name,
    title,
    lastAmendDate,
    effectiveDate,
    text,
    appendixes,
    comments = '',
  } = regulation;
  const prettyName = name.replace(/^0+/, '');

  return `
  <html>
  <head>
    <meta charset="utf8">
    <title>${title}</title>
    <style>${CSS}</style>
  </head>
  <body>
    <div class="regulation__meta">
      <div class="regulation__name">Reglugerð nr. ${prettyName}</div>
      <div class="regulation__date">${
        lastAmendDate ? `Síðast breytt: ${lastAmendDate}` : `Tók gildi: ${effectiveDate}`
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
      <h2 class="appendix__title">Athugasemdir ritstjóra</h2>
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
): Promise<boolean> {
  const regulation = (await getRegulation(slugToName(name), {
    date: new Date(),
  })) as Regulation | RegulationRedirect;

  if (!regulation || !('text' in regulation)) {
    return false;
  }

  return html_pdf_node
    .generatePdf(
      { content: pdfTmplate(regulation) },
      {
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
      },
    )
    .then((buffer) => {
      // TODO: write buffer to file
      console.log(fileName, buffer);
    })
    .then(() => true)
    .catch((err) => {
      console.error(err);
      return false;
    });
}
