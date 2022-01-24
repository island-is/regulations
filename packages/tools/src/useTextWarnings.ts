import { useEffect, useState } from 'react';
import q from '@hugsmidjan/qj/q';
import qq from '@hugsmidjan/qj/qq';

import { inlineSelfClosingElms } from './_cleanup/cleanup-consts';
import { HTMLText } from './types';
import { asDiv, getTexts, isNonNull } from './utils';

let _strictMode = true;

/** Run `setStrictMode(false)` to opt-in to more relaxed form of validations
 *
 * "Relaxed" mode is mainly useful when migrating older regulations
 * that may potentially contain errors that can't easily be fixed.
 */
export const setStrictMode = (beStrict: boolean) => {
  _strictMode = beStrict;
};

// ===========================================================================

const t = getTexts({
  listTables: {
    s: '{n} tafla er í raun listi',
    p: '{n} töflur eru í raun listi',
  },
  fsImages: {
    s: '{n} mynd/tengill með "file:///" slóð',
    p: '{n} myndir/tenglar með "file:///" slóðir',
  },
  noAltImages: {
    s: '{n} mynd vantar "alt" texta',
    p: '{n} myndir vantar "alt" texta',
  },
  insegureLinks: {
    s: '{n} tengill með óöruggu/gamaldags HTTP://',
    p: '{n} tenglar með óöruggum/gamaldags HTTP://',
  },
  localUrls: {
    s: '{n} slóð sem er ekki fullgilt URL',
    p: '{n} slóðir sem eru ekki fullgild URL',
  },
  articleNumbersWeird: 'Númerun greina er ekki samfelld',
  weirdArticleTitles: {
    s: '{n} greinatitill byrjar ekki á tölu',
    p: '{n} greinatitlar byrja ekki á tölu',
  },
  nonRootArticleTitles: {
    s: '{n} greinatitill er innan í töflu eða lista',
    p: '{n} greinatitlar eru innan í töflum eða listum',
  },
  nonRootChapterTitles: {
    s: '{n} kaflatitill er innan í töflu eða lista',
    p: '{n} kaflatitlar eru innan í töflum eða listum',
  },
  nonRootSectionTitles: {
    s: '{n} hlutatitill er innan í töflu eða lista',
    p: '{n} hlutatitlar eru innan í töflum eða listum',
  },
  inlineAppendix: {
    1: 'Fann viðauka í textanum',
    n: '{n} viðaukar fundust í textanum',
  },
  h1Titles: {
    1: 'Fann H1 fyrirsögn í textanum',
    n: '{n} stk. H1 fyrirsagnir fundust',
  },
  preBlocks: {
    s: 'Fann {n} PRE (ASCII-layout) blokk',
    p: '{n} PRE (ASCII-layout) blokkir fundust',
  },
  autoGeneratedLists: {
    s: '{n} "auto-generated" listi þarf yfirlestur',
    p: '{n} "auto-generated" listar þurfa yfirlestur',
  },
  cfEmailMarkers: {
    s: '{n} spam-varið netfang vantar',
    p: '{n} spam-varin netföng vantar',
  },
  legacyIndenters: {
    s: '{n} Tab-inndráttur fannst',
    p: '{n} Tab-indrættir fundust',
  },
  nonSpaceLegacyIndenters:
    'Tab-inndráttur má bara innihalda bil (öðrum táknum verður eytt)',
  hasMarginLeft: {
    s: '{n} málsgrein með vinstri-spássíu (margin-left)',
    p: '{n} málsgreinar með vinstri-spássíu (margin-left)',
  },
  nonEmTitleContent:
    'Kafla- og greinatitlar mega bara innihalda eitt samfellt skáleltrað "nafn"',
} as const);

// ===========================================================================

export const Angsts = {
  high: 'high',
  medium: 'medium',
  low: 'low',
} as const;

type WarningData = {
  warning: string;
  angst: keyof typeof Angsts;
  find?: (root: Element) => Array<Element> | undefined;
  // autoFix?: (root: Element) => void;
};

type WIP_WarningData = Omit<WarningData, 'angst'> & {
  angst?: WarningData['angst'];
};

export type WarningList = Array<WarningData>;

// eslint-disable-next-line complexity
export const makeWarnings = (
  text: HTMLText,
  isImpact?: boolean,
): WarningList => {
  const warnings: WarningList = [];

  const addWarning = (warning: WIP_WarningData) => {
    warning.angst = warning.angst || 'medium';
    warnings.push(warning as WarningData);
  };

  if (text) {
    const root = asDiv(text);

    const fsImageSelector = 'img[src^="file:///"], a[href^="file:///"]';
    const fsImages = root.qq(fsImageSelector);
    if (fsImages.length) {
      addWarning({
        warning: t('fsImages', fsImages.length),
        find: (root) => qq(fsImageSelector, root),
        angst: 'high',
      });
    }

    const localUrlSelector =
      'a' +
      // List allowed URL protocols to accept
      // **NB:** Intentionally disallowing protocol relative (//server.tld/path) URLs
      ':not([href^="https://"])' +
      ':not([href^="http://"])' +
      ':not([href^="mailto:"])' +
      // Also accept file:/// because it is Handled by fsImageSelector above
      ':not([href^="file:///"])';
    const localUrls = root.qq(localUrlSelector);
    if (localUrls.length) {
      addWarning({
        warning: t('localUrls', localUrls.length),
        find: (root) => qq(localUrlSelector, root),
        angst: 'high',
      });
    }

    // Warn about insecure HTTP links
    const insegureLinkSelector = 'a[href^="http://"]';
    const insegureLinks = root.qq(insegureLinkSelector);
    if (insegureLinks.length) {
      addWarning({
        warning: t('insegureLinks', insegureLinks.length),
        find: (root) => qq(insegureLinkSelector, root),
      });
    }

    const noAltImageSelector = 'img[alt=""], img:not([alt])';
    const noAltImages = root.qq(noAltImageSelector);
    if (noAltImages.length) {
      addWarning({
        warning: t('noAltImages', noAltImages.length),
        find: (root) => qq(noAltImageSelector, root),
        angst: 'high',
      });
    }

    const h1Titles = root.qq('h1');
    if (h1Titles.length) {
      addWarning({
        warning: t('h1Titles', h1Titles.length),
        find: (root) => qq('h1', root),
        angst: 'high',
      });
    }

    const preBlocks = root.qq('pre');
    if (preBlocks.length) {
      addWarning({
        warning: t('preBlocks', preBlocks.length),
        find: (root) => qq('pre', root),
      });
    }

    const autoGeneratedListSelector =
      'ul[data-autogenerated], ol[data-autogenerated]';
    const autoGeneratedLists = root.qq(autoGeneratedListSelector);
    if (autoGeneratedLists.length) {
      addWarning({
        warning: t('autoGeneratedLists', autoGeneratedLists.length),
        find: (root) => qq(autoGeneratedListSelector, root),
        angst: 'high',
      });
    }

    const cfEmailMarkerSelector = 'span[data-cfemail]';
    const cfEmailMarkers = root.qq(cfEmailMarkerSelector);
    if (cfEmailMarkers.length) {
      addWarning({
        warning: t('cfEmailMarkers', cfEmailMarkers.length),
        find: (root) => qq(cfEmailMarkerSelector, root),
        angst: 'high',
      });
    }

    const articleTitleSelector =
      'h3.article__title:not(.article__title--provisional)';
    const articleTitles = root.qq(articleTitleSelector);
    const numberArticleTitles = articleTitles
      .map((elm, idx) => ({ num: parseInt(elm.textContent), idx }))
      .filter(({ num }) => !isNaN(num));

    const surpriseArticleNumbers = numberArticleTitles.reduce<Array<number>>(
      (surprising, item, i, arr) => {
        const lastNum = i > 0 ? arr[i - 1]!.num : 0;
        const expected = lastNum + 1;

        if (item.num !== expected) {
          surprising.push(item.idx);
        }
        return surprising;
      },
      [],
    );
    if (surpriseArticleNumbers.length) {
      addWarning({
        warning: t('articleNumbersWeird'),
        find: (root) => {
          const titles = qq(articleTitleSelector, root);
          return surpriseArticleNumbers
            .map((idx) => titles[idx])
            .filter(isNonNull);
        },
        angst: _strictMode && !isImpact ? 'high' : 'medium',
      });
    }

    const weirdArticleTitlesCount =
      articleTitles.length - numberArticleTitles.length;
    if (weirdArticleTitlesCount) {
      addWarning({
        warning: t('weirdArticleTitles', weirdArticleTitlesCount),
        find: (root) =>
          qq(articleTitleSelector, root).filter(
            (elm) => !parseInt(elm.textContent),
          ),
      });
    }

    const nonRootArticleTitleCount = articleTitles.filter(
      (elm) => elm.parentNode !== root,
    ).length;
    if (nonRootArticleTitleCount) {
      addWarning({
        warning: t('nonRootArticleTitles', nonRootArticleTitleCount),
        find: (root) =>
          qq(articleTitleSelector, root).filter(
            (elm) => elm.parentNode !== root,
          ),
      });
    }

    const chapterTitleSelector = '.chapter__title';
    const nonRootChapterTitleCount = root
      .qq(chapterTitleSelector)
      .filter((elm) => elm.parentNode !== root).length;
    if (nonRootChapterTitleCount) {
      addWarning({
        warning: t('nonRootChapterTitles', nonRootChapterTitleCount),
        find: (root) =>
          qq(chapterTitleSelector, root).filter(
            (elm) => elm.parentNode !== root,
          ),
      });
    }

    const sectionTitleSelector = '.section__title';
    const nonRootSectionTitleCount = root
      .qq(sectionTitleSelector)
      .filter((elm) => elm.parentNode !== root).length;
    if (nonRootSectionTitleCount) {
      addWarning({
        warning: t('nonRootSectionTitles', nonRootSectionTitleCount),
        find: (root) =>
          qq(sectionTitleSelector, root).filter(
            (elm) => elm.parentNode !== root,
          ),
      });
    }

    const appendixTitleSelecctor =
      'h2.chapter__title--appendix, h2.appendix__title, section.appendix';
    const appendixTitles = root.qq(appendixTitleSelecctor);
    if (appendixTitles.length) {
      addWarning({
        warning: t('inlineAppendix', appendixTitles.length),
        find: (root) => qq(appendixTitleSelecctor, root),
      });
    }

    const legacyIndenterSelector = '[data-legacy-indenter]';
    const legacyIndenters = root.qq(legacyIndenterSelector);
    if (legacyIndenters.length) {
      addWarning({
        warning: t('legacyIndenters', legacyIndenters.length),
        find: (root) => qq(legacyIndenterSelector, root),
      });
    }

    const nonSpaceLegacyIndenters = legacyIndenters.filter(
      (elm) => elm.textContent.trim() || q(inlineSelfClosingElms, elm),
    );
    if (nonSpaceLegacyIndenters.length) {
      addWarning({
        warning: t('nonSpaceLegacyIndenters', legacyIndenters.length),
        angst: 'high',
        find: (root) =>
          qq(legacyIndenterSelector, root).filter(
            (elm) => elm.textContent.trim() || q(inlineSelfClosingElms, elm),
          ),
      });
    }

    const styleMarginLeftSelector = '[style*="margin-left"]';
    // const styleMarginLeftSelector = '[style*="margin-left"], [style*="text-indent"]';
    const hasMarginLeft = root.qq(styleMarginLeftSelector);
    if (hasMarginLeft.length) {
      addWarning({
        warning: t('hasMarginLeft', hasMarginLeft.length),
        find: (root) => qq(styleMarginLeftSelector, root),
      });
    }

    const hasWeirdContent = (elm: Element) =>
      qq('*:not(em):not(span)', elm)
        .concat(qq('em', elm).slice(1))
        .some((elm) => !!elm.textContent.trim());

    const nonEmTitleContent = root
      .qq('.chapter__title, .article__title, .section__title')
      .filter(hasWeirdContent);
    if (nonEmTitleContent.length) {
      addWarning({
        warning: t('nonEmTitleContent', nonEmTitleContent.length),
        find: (root) =>
          qq('.chapter__title, .article__title, .section__title', root).filter(
            hasWeirdContent,
          ),
        angst: 'high',
      });
    }
  }

  return warnings;
};

// ---------------------------------------------------------------------------

export const makeHighAngstWarnings = (baseText: HTMLText, isImpact?: boolean) =>
  makeWarnings(baseText, isImpact).filter(({ angst }) => angst === 'high');

// ===========================================================================

export const useTextWarnings = (
  baseText: HTMLText,
  isImpact?: boolean,
): WarningList => {
  const [warnings, setWarnings] = useState<WarningList>([]);

  useEffect(() => {
    setWarnings(makeWarnings(baseText, isImpact));
  }, [baseText, isImpact]);
  return warnings;
};
