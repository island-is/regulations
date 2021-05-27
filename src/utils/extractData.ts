import qq from 'qj/qq';
import { asDiv } from './serverDOM';
import { HTMLText, Regulation } from '../routes/types';

// This function is copy-pasted from https://github.com/hugsmidjan-is/reglugerd-admin-www/
// Both copies should behave the same
export const extractAppendixesAndComments = (
  text: HTMLText | '',
): Pick<Regulation, 'text' | 'appendixes' | 'comments'> => {
  const root = asDiv(text);
  const appendixElms = qq('.appendix', root);
  appendixElms.forEach((elm) => elm.remove());
  const commentsElms = qq('.comments', root);
  commentsElms.forEach((elm) => elm.remove());

  return {
    text: root.innerHTML as HTMLText,
    appendixes: appendixElms.map((elm) => {
      const titleElm = elm.querySelector('.appendix__title');
      const title = titleElm?.textContent || '';
      titleElm?.remove();
      return {
        title,
        text: elm.innerHTML as HTMLText,
      };
    }),
    comments: (commentsElms.length ? commentsElms[0].innerHTML : '') as HTMLText,
  };
};

export const extractComments = (
  text: HTMLText | '',
): Pick<Regulation, 'text' | 'comments'> => {
  const root = asDiv(text);
  const commentsElms = qq('.comments', root);
  commentsElms.forEach((elm) => elm.remove());

  return {
    text: root.innerHTML as HTMLText,
    comments: (commentsElms.length ? commentsElms[0].innerHTML : '') as HTMLText,
  };
};
