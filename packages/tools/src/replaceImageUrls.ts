// FIXME: Move this logic into the api-server, where it belongs,
// and thus make the ENV variable resolution simpler

import qq from '@hugsmidjan/qj/qq';

import { asDiv } from './_cleanup/serverDOM';
import { FILE_SERVER } from './constants';
import { HTMLText, RegName } from './types';

const { FILE_UPLOAD_KEY_PUBLISH, REGULATIONS_API_URL } = process.env;

type SourcesMap = Array<{ oldUrl: string; newUrl: string }>;

export const replaceImageUrls = async (html: HTMLText, regName: RegName) => {
  if (!REGULATIONS_API_URL || !FILE_UPLOAD_KEY_PUBLISH) {
    throw new Error(
      'REGULATIONS_API_URL and/or FILE_UPLOAD_KEY_PUBLISH not configured',
    );
  }

  const root = asDiv(html);

  try {
    const urls: Array<string> = [];

    qq('img', root).forEach((img) => {
      // Collect all image src URLs as those are an intrinsic part of
      // the regulation's content and need to be "burned into" the
      // regulation as hard as possible, to avoid images rotting/breaking
      const src = img.getAttribute('src');
      src && urls.push(src);
    });

    qq('a', root).forEach((link) => {
      const href = link.getAttribute('href');
      // Collect link hrefs that point to the file-server,
      // as those might have been uploaded during regulation draft authoring.
      // Those resources need to be moved to a public path on the file-server
      if (href && FILE_SERVER.endsWith('//' + link.host)) {
        urls.push(href);
      }
    });

    const sourcesMap: SourcesMap = await fetch(
      REGULATIONS_API_URL + '/file-upload-urls',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-APIKey': FILE_UPLOAD_KEY_PUBLISH,
        },
        body: JSON.stringify({ urls, regName }),
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
