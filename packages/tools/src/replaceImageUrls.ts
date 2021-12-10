import qq from '@hugsmidjan/qj/qq';
import { HTMLText } from './types';
import { asDiv } from './_cleanup/serverDOM';

const { FILE_UPLOAD_KEY_PUBLISH, REGULATIONS_API_SERVER } = process.env;

type SourcesMap = Array<{ oldUrl: string; newUrl: string }>;

export const replaceImageUrls = async (html: HTMLText) => {
  if (!REGULATIONS_API_SERVER || !FILE_UPLOAD_KEY_PUBLISH) {
    throw new Error(
      'REGULATIONS_API_SERVER and/or FILE_UPLOAD_KEY_PUBLISH not configured',
    );
  }

  const root = asDiv(html);

  try {
    const sources: Array<string> = [];

    qq('img', root).forEach((img) => {
      const src = img.getAttribute('src');
      src && sources.push(src);
    });

    const sourcesMap: SourcesMap = await fetch(
      REGULATIONS_API_SERVER + '/file-upload-urls',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-APIKey': FILE_UPLOAD_KEY_PUBLISH,
        },
        body: JSON.stringify({ urls: sources }),
      },
    ).then((res) => res.json());

    sourcesMap.forEach((src) => {
      qq(`img[src="${src.oldUrl}"]`, root).forEach((img) => {
        img.setAttribute('src', src.newUrl);
      });
      qq(`a[href="${src.oldUrl}"]`, root).forEach((img) => {
        img.setAttribute('href', src.newUrl);
      });
    });
  } catch (e) {
    console.error('Error replacing image urls: ' + e);
  }

  return root.innerHTML as HTMLText;
};