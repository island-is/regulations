/* eslint-disable simple-import-sort/imports */

// NOTE: disable import sorting until the side-effects
// on the tinymce/plugin side-effect imports have
//  been properly tested

import React, { MutableRefObject, useMemo } from 'react';
import { useDomid } from '@hugsmidjan/react/hooks';
import { Editor as TinyMCE, IAllProps } from '@tinymce/tinymce-react';
import type { Editor } from 'tinymce';

import dirtyClean from './dirtyClean-browser';
import { HTMLText } from './types';
import { document_base_url } from './utils';

import tinymce from 'tinymce/tinymce';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';

import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/hr';
// import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
// import 'tinymce/plugins/visualblocks'; // Outline block level elements
import 'tinymce/plugins/code';
// import 'tinymce/plugins/fullscreen';
// import 'tinymce/plugins/insertdatetime';
// import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/paste';
// import 'tinymce/plugins/help';
// import 'tinymce/plugins/template';

// ---------------------------------------------------------------------------

type PastePreProcessEvent = {
  type: 'pastepreprocess';
  wordContent: boolean;
  internal: boolean;
  content: string;
};

// ---------------------------------------------------------------------------

const CONFIG: IAllProps['init'] = {
  skin_url:
    'https://cdnjs.cloudflare.com/ajax/libs/tinymce/5.6.2/skins/ui/oxide',
  inline: true,
  toolbar_persist: true,
  // toolbar_sticky: true,

  plugins: [
    'advlist',
    'autolink',
    'lists',
    'link',
    'image',
    'charmap',
    'hr',
    // 'preview',
    'anchor',
    'searchreplace',
    // 'visualblocks',
    'code',
    // 'fullscreen',
    // 'insertdatetime',
    // 'media',
    'table',
    'paste',
    // 'help',
    // 'template',

    '_onInited_hack_',
  ],

  advlist_number_styles:
    'default,lower-alpha,upper-alpha,lower-roman,upper-roman',

  // https://www.tiny.cloud/docs/configure/editor-appearance/#examplethetinymcedefaultmenuitems
  menubar: false,

  style_formats: [
    {
      title: 'Layout (no border)',
      selector: 'table',
      attributes: { class: 'layout' },
    },
    {
      title: 'List-Layout Table',
      selector: 'table',
      attributes: { class: 'layout layout--list' },
    },
    {
      title: 'Auto-generated List',
      selector: '[data-autogenerated=""]',
      attributes: { 'data-autogenerated': '' },
    },
    {
      title: 'Paragraph',
      block: 'p',
      attributes: { class: '', style: '' },
    },
    {
      title: 'Heiti/titill skjalsins',
      block: 'p',
      attributes: { class: 'doc__title', style: 'text-align: center;' },
    },
    {
      title: 'Grein',
      block: 'h3',
      attributes: { class: 'article__title', style: '' },
    },
    {
      title: 'Undirkafli',
      block: 'h2',
      attributes: { class: 'subchapter__title', style: '' },
    },
    {
      title: 'Kafli',
      block: 'h2',
      attributes: { class: 'chapter__title', style: '' },
    },
    {
      title: 'Hluti',
      block: 'h2',
      attributes: { class: 'section__title', style: '' },
    },
    {
      title: 'Bráðabirgðaákvæði',
      block: 'h3',
      attributes: {
        class: 'article__title article__title--provisional',
        style: '',
      },
    },
    {
      title: 'Tilvitnun',
      block: 'blockquote',
      attributes: { class: '' },
      wrapper: true,
      // merge_siblings: false,
    },
    {
      title: 'Inndregin málsgrein',
      block: 'p',
      attributes: { class: 'indented', style: '' },
    },
    {
      title: 'pre',
      block: 'pre',
      attributes: { class: '' },
    },
    {
      title: 'Undirritun',
      items: [
        {
          title: 'Dags',
          block: 'p',
          attributes: { class: 'Dags', style: '' },
        },
        {
          title: 'FHUndirskr',
          block: 'p',
          attributes: { class: 'FHUndirskr', style: '' },
        },
        {
          title: 'Undirritun',
          block: 'p',
          attributes: { class: 'Undirritun', style: '' },
        },
      ],
    },
    {
      title: 'Bare Headers',
      items: [
        {
          title: 'Heading 2',
          block: 'h2',
          attributes: { class: '', style: '' },
        },
        {
          title: 'Heading 3',
          block: 'h3',
          attributes: { class: '', style: '' },
        },
        {
          title: 'Heading 4',
          block: 'h4',
          attributes: { class: '', style: '' },
        },
        {
          title: 'Heading 5',
          block: 'h5',
          attributes: { class: '', style: '' },
        },
        {
          title: 'Heading 6',
          block: 'h6',
          attributes: { class: '', style: '' },
        },
      ],
    },
  ],
  // visualblocks_default_state: true,
  end_container_on_empty_block: true,
  style_formats_autohide: true,

  relative_urls: false,
  remove_script_host: true,
  document_base_url,

  image_dimensions: false,
  // automatic_uploads: true,
  images_reuse_filename: true,
  images_upload_credentials: true,
  // images_upload_handler: // set during component mount

  table_class_list: [
    { title: 'Normal', value: '' },
    { title: 'Layout (no border)', value: 'layout' },
    { title: 'List-Layout Table', value: 'layout layout--list' },
  ],
  table_advtab: false,
  table_cell_advtab: false,
  table_row_advtab: false,
  table_resize_bars: false,
  table_header_type: 'sectionCells',
  table_use_colgroups: false, // default
  table_default_attributes: {},
  table_sizing_mode: 'responsive',

  toolbar: `
    undo redo | bold italic link inlineformat | styleselect alignment |
    bullist numlist ${'' /* outdent indent */} |
    table image | insert
  `,

  toolbar_groups: {
    alignment: {
      icon: 'align-left',
      tooltip: 'Alignment',
      items: 'alignleft aligncenter alignright',
    },
    inlineformat: {
      icon: 'format',
      tooltip: 'Inline formats',
      items: 'underline strikethrough superscript subscript | removeformat',
      // + ' | formats',
    },
    insert: {
      icon: 'plus',
      tooltip: 'Other',
      items: 'code charmap hr',
    },
  },

  // https://www.tiny.cloud/docs/plugins/opensource/paste/
  paste_preprocess: (plugin: unknown, e: PastePreProcessEvent) => {
    // console.log({ internal: e.internal, wordContent: e.wordContent });
    // console.log(e.content);
    if (e.internal) {
      return;
    }
    const isInlineSnippet =
      !/<(?:p|div|ul|ol|li|table|tbody|thead|caption|tfoot|tr|td|th|blockquote|section|h[1-6])[ >]/i.test(
        e.content,
      );
    e.content = dirtyClean(e.content as HTMLText);
    if (isInlineSnippet) {
      e.content = e.content.replace(/^<p>/, '').replace(/<\/p>$/, '');
    } else {
      let content = e.content;
      // Add 'Grein' to content
      if (!/article__title/.test(content)) {
        content = e.content.replace(
          /<p>(\d+\.\s+gr\.(\s+)?)(<br\s+?\/>)?/g,
          '<h3 class="article__title">$1</h3><p>',
        );
      }
      e.content = content;
    }
  },
  paste_enable_default_filters: false, // disable TinyMCE’s default paste filters
  // paste_block_drop: true, // Prevent the unfiltered content from being introduced
  // paste_merge_formats: true,
  // paste_webkit_styles: 'margin-left',
  // paste_retain_style_properties: 'margin-left',
  // paste_postprocess: (plugin, args) => { args.nodesetAttribute('id', '42'); },
  // paste_word_valid_elements: 'b,strong,i,em,h1,h2',
  // // NOTE: These paste options are NOT needed because changing e.content
  // // inside paste_preprocess implicitly disables/overrides themm.
  // paste_data_images: true,

  setup: (editor) => {
    const uiRegistry = editor.ui.registry;

    // uiRegistry.addIcon(
    //   'triangleUp',
    //   '<svg height="24" width="24"><path d="M12 0 L24 24 L0 24 Z" /></svg>',
    // );

    // uiRegistry.addGroupToolbarButton('alignment', {
    //   icon: 'align-left',
    //   tooltip: 'Alignment',
    //   items: 'alignleft aligncenter alignright',
    // });
  },
};

// NOTE: This uses function declaration syntax for the plugin to
// pass as a constructor, if/when it's called with a `new` keyword
// See: https://github.com/tinymce/tinymce/commit/4f192166
tinymce.PluginManager.add('_onInited_hack_', function (editor) {
  const uiRegistry = editor.ui.registry;
  editor.settings.contextmenu = Object.keys(
    uiRegistry.getAll().contextMenus,
  ).join(' ');
});

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

export type EditorFileUploader = Exclude<
  typeof CONFIG.images_upload_handler,
  undefined
>;

export type EditorFrameClasses = {
  toolbar: string;
  editor: string;
};

export type EditorFrameProps = {
  initialValue: string;
  onReady: (content: HTMLText, editor: Editor) => void;
  onChange: (content: HTMLText) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  containerRef: MutableRefObject<HTMLElement | undefined>;
  fileUploader: EditorFileUploader;
  classes: EditorFrameClasses;
  'aria-labelledby'?: string;
  'aria-describedBy'?: string;
};

export const EditorFrame = (props: EditorFrameProps) => {
  const { onBlur, onFocus } = props;
  const s = props.classes;
  const domid = 'toolbar' + useDomid();

  const config: typeof CONFIG = useMemo(() => {
    return {
      ...CONFIG,
      // react useId creates :XX: id's which causes invalid querySelector errors. Need to escape the ":"
      fixed_toolbar_container: ('#' + domid).replace(/:/g, '\\:'),
      // images_upload_url,
      images_upload_handler: props.fileUploader,
    };
  }, [domid, props.fileUploader]);

  return (
    <>
      <div className={s.toolbar} id={domid} />
      <TinyMCE
        initialValue={props.initialValue}
        onInit={(event, editor) => {
          const retry = setInterval(() => {
            const contentAreaContainer = editor.getContentAreaContainer();
            if (contentAreaContainer) {
              const labelledBy = props['aria-labelledby'];
              const describedBy = props['aria-describedBy'];
              labelledBy &&
                contentAreaContainer.setAttribute(
                  'aria-labelledby',
                  labelledBy,
                );
              describedBy &&
                contentAreaContainer.setAttribute(
                  'aria-describedby',
                  describedBy,
                );
              contentAreaContainer.classList.add(s.editor);
              props.containerRef.current = contentAreaContainer;
              const editorizedText = editor.getContent() as HTMLText;
              props.onReady(editorizedText, editor);
              clearInterval(retry);
            }
          }, 67);
        }}
        onFocus={onFocus && (() => onFocus())}
        onBlur={onBlur && (() => onBlur())}
        onEditorChange={(content) => {
          props.onChange(content as HTMLText);
        }}
        // onChange={(event, editor) => {
        //   console.log('oncChange');
        //   editor.uploadImages();
        // }}
        init={config}
        disabled={props.disabled}
      />
    </>
  );
};
