import React, {
  Fragment,
  MutableRefObject,
  Suspense,
  useMemo,
  useRef,
  useState,
} from 'react';
import debounce from '@hugsmidjan/qj/debounce';
import { useIsBrowserSide } from '@hugsmidjan/react/hooks';

import { EditorFileUploader, EditorFrameClasses } from './EditorFrame';
import { getDiff, HTMLDump } from './html';
import { TextWarnings, TextWarningsClasses } from './TextWarnings';
import { HTMLText } from './types';
import { useTextWarnings } from './useTextWarnings';
import {
  asDiv,
  document_base_url,
  getTexts,
  typeAttrToStyleValueMap,
} from './utils';

// ---------------------------------------------------------------------------

export type { EditorFileUploader } from './EditorFrame';

// ---------------------------------------------------------------------------

const EMPTY_HTML = '' as HTMLText;

const t = getTexts({
  comparisonTitle: {
    diff: 'Breytingar',
    base: 'Grunntexti',
  },
  button: {
    diff: 'Sjá breytingar',
    base: 'Sjá grunntexta',
  },
  diffNow: 'Endurreikna breytingar',
});

// ---------------------------------------------------------------------------

const EditorFrameInBrowser = React.lazy(() =>
  // Lazy-loaded the editorframe itself to ensure code-splitting as TinyMCE is pretty massive.
  import('./EditorFrame').then(({ EditorFrame }) => ({ default: EditorFrame })),
);

// ---------------------------------------------------------------------------

const modes = ['diff', 'base'] as const;
type DiffModes = typeof modes[number];

// ---------------------------------------------------------------------------

const stripLocalBaseUrlHost = (root: ReturnType<typeof asDiv>): string => {
  const baseUrlLength = document_base_url.length;
  root.qq(`img[src^="${document_base_url}"]`).forEach((elm) => {
    elm.setAttribute(
      'src',
      (elm.getAttribute('src') as string).substring(baseUrlLength),
    );
  });
  root.qq(`a[href^="${document_base_url}"]`).forEach((elm) => {
    elm.setAttribute(
      'href',
      (elm.getAttribute('href') as string).substring(baseUrlLength),
    );
  });
  return root.innerHTML;
};

// ---------------------------------------------------------------------------

/* Replace empty HTML with empty string ('') */
const _stripEmpty = (html: HTMLText) =>
  html.replace(/(<(?!\/)[^>]+>)+(<\/[^>]+>)+/, '') as HTMLText;

const importText = (text: HTMLText): HTMLText => {
  if (typeof document === 'undefined') {
    return text;
  }
  const root = asDiv(text);
  root.qq<HTMLElement & { align: string }>('[align]').forEach((elm) => {
    elm.style.textAlign = elm.align;
    elm.removeAttribute('align');
  });
  root
    .qq<HTMLUListElement | HTMLOListElement | HTMLLIElement>(
      'ol[type], ul[type], li[type]',
    )
    .forEach((elm) => {
      elm.style.listStyleType = typeAttrToStyleValueMap[
        elm.getAttribute('type') as string
      ] as string;
      elm.removeAttribute('type');
    });
  // fyrsta útgáfa af dirtyClean vistaði Undirritun1 og Undirritun2
  root.qq('.Undirritun1, .Undirritun2').forEach((elm) => {
    elm.className = 'Undirritun';
  });

  // root.qq('[data-autogenerated]').forEach((elm) => {
  //   elm.setAttribute('data-autogenerated', 'true');
  // });
  // root.qq('table.layout.layout--list').forEach((elm) => {
  //   elm.classList.remove('layout');
  // });
  return _stripEmpty(root.innerHTML as HTMLText);
};

const exportText = (text: HTMLText): HTMLText => {
  const root = asDiv(text);
  stripLocalBaseUrlHost(root);
  // root.qq('[data-autogenerated="false"]').forEach((elm) => {
  //   elm.removeAttribute('data-autogenerated');
  // });
  return _stripEmpty(root.innerHTML as HTMLText);
};

// ---------------------------------------------------------------------------

export type EditorClasses = {
  wrapper: string;
  editingpane: string;
  editorBooting: string;
  toolbar: string;
  editor: string;
  comparisonpane: string;
  comparisonpaneContainer: string;
  headline: string;
  diffmodes: string;
  modeButton: string;
  diffNowBtn: string;
  result: string;
  result_diff: string;
  result_base: string;
} & TextWarningsClasses &
  EditorFrameClasses;

const resultClasses: Record<DiffModes, keyof EditorClasses> = {
  diff: 'result_diff',
  base: 'result_base',
};

// ===========================================================================

export type EditorProps = {
  /** A simple getter ref that allows fetching the current value of the editor field. */
  valueRef: MutableRefObject<() => HTMLText>;
  /** The base HTML being modified.
   *
   * If a non-empty baseText is provided then a comparison pane is displayed
   * highlighting the difference from the baseText.
   *
   * Default: ''
   */
  baseText?: HTMLText;

  fileUploader?: EditorFileUploader;

  /** Flags the type of editing being performed.
   *
   * Impacts on/edits of older texts are validated slightly differently,
   * with certain warnings receiving different "angst" (severity) levels.
   */
  isImpact?: boolean;
  /** An element ref that eventually points to the editor's container Element. */
  elmRef?: MutableRefObject<HTMLElement | null>;
  /** A light-weight onChange callback that fires synchronously on EVERY
   * editor input/change event.
   *
   * To read the editor's current value, please refer to valueRef.current()
   */
  onChange?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  'aria-labelledby'?: string;
  'aria-describedBy'?: string;
};

export const Editor = (
  props: EditorProps & {
    classes: EditorClasses;
    fileUploader: EditorFileUploader; // required here
  },
) => {
  const s = props.classes;
  const { valueRef, elmRef, onChange } = props;
  const isBrowser = useIsBrowserSide();

  const [baseText, setBaseText] = useState(() =>
    importText(props.baseText || EMPTY_HTML),
  );
  const initialText = useMemo(() => importText(valueRef.current()), []);
  const currentValue = useRef(initialText);
  valueRef.current = () => exportText(currentValue.current);

  /*
    A recent (late 2021) change in TinyMCE's initialization life-cycle
    causes `onEditorChange` sometimes prematurely trigger during onInit
    Thus we add a 'pre-init' status to capture + ignore that event.
  */
  const editorStatus = useRef<'pre-init' | 'ready' | 'running'>('pre-init');

  const [debouncedCurrentText, setDebouncedCurrentText] = useState(baseText);
  const [diffText, setDiffText] = useState(EMPTY_HTML);
  const [updating, setUpdating] = useState<true | undefined>(true);
  const [needsUpdating, setNeedsUpdating] = useState<true | undefined>();
  const [diffMode, setDiffMode] = useState<DiffModes>('diff');
  const autoDiffModeRef = useRef(true);

  const diffDebouncer = useMemo(
    () => debounce((fn: () => void) => fn(), 1000),
    [],
  );

  const editorDivRef = useRef<HTMLElement>();
  const warnings = useTextWarnings(debouncedCurrentText, props.isImpact);

  const showComparisonPane = props.baseText != null; // if _rawBaseText is non-empty then show comparison

  return (
    <>
      <TextWarnings
        warnings={warnings}
        contentRoot={editorDivRef.current}
        classes={s}
      />

      <div className={s.wrapper}>
        <div className={s.editingpane}>
          {isBrowser && (
            <Suspense fallback={<div className={s.editorBooting} />}>
              <EditorFrameInBrowser
                containerRef={editorDivRef}
                classes={s}
                onReady={(baseTextEditorized, editor) => {
                  elmRef && (elmRef.current = editorDivRef.current || null);
                  setBaseText(baseTextEditorized);
                  setDebouncedCurrentText(baseTextEditorized);
                  setDiffText(baseTextEditorized);
                  setUpdating(undefined);
                  // once baseText has been established and editorized, then apply the actual initalText
                  editorStatus.current =
                    // we're about to trigger a "false" change event because
                    // we're applying an initialText that's different from the baseText
                    props.baseText && props.baseText !== initialText
                      ? 'ready'
                      : 'running';

                  editor.setContent(initialText);
                }}
                initialValue={baseText || initialText}
                onFocus={props.onFocus}
                onBlur={props.onBlur}
                aria-labelledby={props['aria-labelledby']}
                aria-describedBy={props['aria-describedBy']}
                onChange={(newText) => {
                  if (editorStatus.current === 'running') {
                    onChange && onChange();
                  } else if (editorStatus.current === 'ready') {
                    editorStatus.current = 'running';
                  } else {
                    /* } else if (editorStatus.current === 'pre-init') { */
                    return; // editor onReady has not run yet.
                  }
                  currentValue.current = newText;
                  autoDiffModeRef.current && setUpdating(true);
                  diffDebouncer(() => {
                    if (autoDiffModeRef.current) {
                      const { diff, slow } = getDiff(baseText, newText);
                      setDiffText(diff);
                      autoDiffModeRef.current = !slow;
                    } else {
                      setNeedsUpdating(true);
                    }
                    setDebouncedCurrentText(newText);
                    setUpdating(undefined);
                  });
                }}
                fileUploader={props.fileUploader}
              />
            </Suspense>
          )}
          {/* <textarea
            defaultValue={base}
            onChange={(e) => {
              setv(e.target.value);
              setDiff(diffStrings(base, e.target.value));
            }}
          /> */}
        </div>
        {showComparisonPane && (
          <div className={s.comparisonpane}>
            <div className={s.comparisonpaneContainer}>
              <h3 className={s.headline}>
                {t('comparisonTitle', diffMode)}
                <span className={s.diffmodes}>
                  {modes.map(
                    (mode) =>
                      mode !== diffMode && (
                        <Fragment key={mode}>
                          {' '}
                          <button
                            className={s.modeButton}
                            onClick={() => {
                              setDiffMode(mode);
                            }}
                          >
                            {t('button', mode)}
                          </button>
                        </Fragment>
                      ),
                  )}
                </span>
              </h3>

              <div
                className={s.result + ' ' + (s[resultClasses[diffMode]] || '')}
                data-updating={diffMode === 'diff' ? updating : undefined}
                data-needs-updating={
                  diffMode === 'diff' ? needsUpdating : undefined
                }
              >
                {needsUpdating && (
                  <button
                    className={s.diffNowBtn}
                    onClick={() => {
                      setNeedsUpdating(undefined);
                      setUpdating(true);
                      setTimeout(() => {
                        const { diff, slow } = getDiff(
                          baseText,
                          debouncedCurrentText,
                        );
                        setDiffText(diff);
                        autoDiffModeRef.current = !slow;
                        setUpdating(undefined);
                      }, 150);
                    }}
                  >
                    {t('diffNow')}
                  </button>
                )}
                <HTMLDump html={diffMode === 'diff' ? diffText : baseText} />
              </div>
            </div>
          </div>
        )}
      </div>

      <TextWarnings
        warnings={warnings}
        contentRoot={editorDivRef.current}
        classes={s}
      />
    </>
  );
};
