import qq from 'qj/qq';
import { asDiv } from './serverDOM';
import { Regulation } from '../routes/types';

export const extractAppendixesAndComments = (
  text: string,
): Pick<Regulation, 'text' | 'appendixes' | 'comments'> => {
  const root = asDiv(text);
  const appendixElms = qq('.appendix', root);
  appendixElms.forEach((elm) => elm.remove());
  const commentsElms = qq('.comments', root);
  commentsElms.forEach((elm) => elm.remove());
  return {
    text: root.innerHTML,
    appendixes: appendixElms.map((elm) => {
      const titleElm = elm.querySelector('.appendix__title');
      const title = titleElm?.textContent || '';
      titleElm?.remove();
      return {
        title,
        text: elm.innerHTML,
      };
    }),
    comments: commentsElms.length ? commentsElms[0].innerHTML : '',
  };
};
