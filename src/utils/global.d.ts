declare module 'htmldiff-js' {
  export const execute: (a: string, b: string) => string;
}

declare module 'html-pdf-node' {
  type FileInfo = { content: string } | { url: string };
  type Options = {
    format?: string;
    preferCSSPageSize?: boolean;
    printBackground?: boolean;
  };
  export const generatePdf: (file: FileInfo, options: Options) => Promise<Buffer>;
}
