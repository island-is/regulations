import { ISODate, RegQueryName, Regulation } from 'routes/types';
import pdf from 'html-pdf';
import { getRegulation } from './Regulation';
import { checkRegulationFile, slugToName } from '../utils/misc';

export async function getRegulationPdf(name: RegQueryName) {
  const filename = `regulation-pdf/${name}.pdf`;
  const downloadLink = `/api/v1/regulation/${name}/pdf/download`;
  try {
    if (checkRegulationFile(name)) {
      return downloadLink;
    }

    const regulation = (await getRegulation(slugToName(name), {
      date: new Date(),
    })) as Regulation;
    if (!regulation || regulation.type !== 'base') {
      return '';
    }

    const regname = regulation.name.split('-');

    pdf
      .create(
        pdfTmplate(
          regulation.title,
          regname[0].replace(/0+/, ''),
          regulation.publishedDate,
          regulation.text,
        ),
        {
          format: 'A4',
          orientation: 'portrait',
          border: '2cm',
        },
      )
      .toFile(filename, (err, res) => {
        return res.filename;
      });
    return downloadLink;
  } catch (err) {
    console.error(err);
    return false;
  }
}

const pdfTmplate = (title: string, name: string, date: ISODate, body: string) => {
  return `<html>
  <head>
    <meta charset="utf8">
    <title>${title}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
      }
      html {
        font-family: 'Times New Roman', 'Times' serif;
        font-weight: 400;
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

      .regulation__title {
        font-size: 18pt;
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
      }
      .article__title:first-child,
      .chapter__title + .article__title {
        margin-top: 0;
      }
      .article__name {
        display: block;
        font-style: italic;
      }


    </style>
  </head>
  <body>
    <div class="regulation__meta">
      <div class="regulation__name">${name}</div>
      <div class="regulation__date">${date}</div>
    </div>
    <h1 class="regulation__title">${title}</h1>
    <div class="regulation__body">
      ${body}
    </div>
  </body>
</html>`;
};
