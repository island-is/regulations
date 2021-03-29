import { JSDOM } from 'jsdom';
import _E from 'qj/E';

const jsdomWindow = new JSDOM(
  `<!DOCTYPE html><html><head><meta charset="utf-8"/></html><body></body></html>`,
).window;

export const { Node, Text, DocumentFragment, document } = jsdomWindow;

export const asDiv = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};

// HyperScript function that produces DOM elements
export const E = _E.make(jsdomWindow);
