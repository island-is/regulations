import qq from '@hugsmidjan/qj/qq';
import { asDiv } from './serverDOM';
import { HTMLText, Regulation as UiRegulation } from '../routes/types';

// This function is copy-pasted from https://github.com/hugsmidjan-is/reglugerd-admin-www/
// Both copies should behave the same
export const extractAppendixesAndComments = (
  text: HTMLText,
): Pick<UiRegulation, 'text' | 'appendixes' | 'comments'> => {
  const root = asDiv(text);
  const appendixElms = qq('.appendix', root);
  appendixElms.forEach((elm) => elm.remove());
  const commentsElms = qq('.comments', root);
  commentsElms.forEach((elm) => elm.remove());
  return {
    text: root.innerHTML.trim() as HTMLText,
    appendixes: appendixElms.map((elm) => {
      const titleElm = elm.querySelector('.appendix__title');
      const title = (titleElm?.textContent || '').replace(/\n/g, ' ').trim();
      titleElm?.remove();
      return {
        title,
        text: elm.innerHTML.trim() as HTMLText,
      };
    }),
    comments: (commentsElms.length
      ? commentsElms[0].innerHTML.trim()
      : '') as HTMLText,
  };
};

// ---------------------------------------------------------------------------

export const eliminateComments = (text: HTMLText): HTMLText =>
  text.replace(/<section class="comments">[^]+?<\/section>/g, '') as HTMLText;
