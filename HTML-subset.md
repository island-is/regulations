# HTML subset

## Inline Elements

(All inline-elements must have a block-element parent.)

- **`<strong>`**
- **`<em>`**
- **`<br/>`**
- **`<a>`**
  - Attributes:
    - `href="{{url}}"` (required)
- **`<sup>`**
- **`<sub>`**
- **`<u>`**
- **`<s>`**
- **`<img/>`**
  - Attributes:
    - `src="{{url}}"` (required)
    - `alt="{{text}}"` (required)
    - `width="[0-9]+"`
    - `height="[0-9]+"`

## Block Elements

- **`<p>`**
  - Content: text, inline-elements
  - Attributes:
    - `align="(right|center)"`
  - Parents:  
    root, `li`, `blockquote`, `td`, `th`
- **`<ul>`**
  - Content: `li`
  - Attributes:
    - `type="(disc|square|circle)"`
    - `start="[0-9]+"`
  - Parents: root, `li`, `blockquote`, `td`
- **`<ol>`**
  - Content: `li`
  - Attributes:
    - `type="(1|a|A|i|ii)"`
    - `start="[1-9][0-9]*"`
  - Parents: root, `li`, `blockquote`, `td`
- **`<li>`**
  - Content:  
    text, inline-elements, `p`, `blockquote`, `table`, `pre`, `ul`, `ol`
  - Attributes:
    - `value="[0-9]+"`
  - Parents: `<ul>`, `<ol>`
- **`<blockquote>`**
  - Content: `p`, `li`, `table`
  - Parents:  
    root, `li`, `blockquote`, `td`, `th`
- **`<h2>`, `<h3>`, `<h4>`, `<h5>`**
  - Content: text, inline-elements
  - Attributes:
    - `align="center"`
  - Parents: root
- **`<table>`**
  - Content: `tbody`, `thead`, `tfoot`
  - Attributes:
    - `class="layout"` (has no borders)
  - Parents: root, `li`
- **`<hr/>`**
  - Parents: root, `li`, `td`

## Table Internals

- **`<tbody>`**
  - Content: `tr`
  - Parents: `table`
- **`<caption>`**
  - Content: text, inline-elements
  - Parents: `table:not(.layout)`
- **`<thead>`, `<tfoot>`**
  - Content: `tr`
  - Parents: `table:not(.layout)`
- **`<tr>`**
  - Content: `td`, `th`
  - Parents: `tbody`, `thead`, `tfoot`
- **`<td>`**
  - Content:  
    text, inline-elements, `p`, `ul`, `ol`, `table`
  - Attributes:
    - `align="(center|right)"`
    - `colspan="[0-9]+"`
    - `rowspan="[0-9]+"`
  - Parents: `tr`
- **`<th>`**
  - Content: text, inline-elements
  - Attributes:
    - `align="(center|right)"`
    - `colspan="[0-9]+"`
    - `rowspan="[0-9]+"`
    - `scope="(row|column)"`
  - Parents: `:not(table.layout) > * > tr`

## Document Title

(NOTE: This element is mostly a legacy construct, repeating the regulation's
title at the top of the text)

- **`<p class="doc__title" align="center">`**
  - Content: text, `strong`, `em`, `u`, `br`
  - Parents: root

## Segment Headers

- **`<h3 class="article__title">`** (e.g. "1. gr.")
  - Content: text, `em.article__name` (single, last-child)
  - Parents: root
- **`<h2 class="subchapter__title">`** (e.g. "Farmskjöl")
  - Content: text, `em.subchapter__name` (single, last-child)
  - Parents: root
- **`<h2 class="chapter__title">`** (e.g. "I. Kafli")
  - Content: text, `em.chapter__name` (single, last-child)
  - Parents: root
- **`<h2 class="section__title">`** (e.g. "1. HLUTI")
  - Content: text, `em.section__name` (single, last-child)
  - Parents: root

## Segment Header Content

- **`<em class="article__name">`**
  - Content: text
  - Parents: `h3.article__title` (as last-child only)
- **`<em class="subchapter__name">`**
  - Content: text
  - Parents: `h2.subchapter__title` (as last-child only)
- **`<em class="chapter__name">`**
  - Content: text
  - Parents: `h2.chapter__title` (as last-child only)
- **`<em class="section__name">`**
  - Content: text
  - Parents: `h2.section__title` (as last-child only)

## Footnotes

- **`<p class="footnote" id="*">`**
  - Content:  
    `sup.footnote__marker` text, inline-elements
  - Attributes:
    - `id="*"` (required) — The id of that foot-note
  - Parents: root
- **`<sup class="footnote__marker">`**
  - Content:  
    text, `a[href^="#"]` (linking back to a footnote-reference)
  - Parents: `p.footnote`
- **`<sup class="footnote-reference">`**
  - Content:  
    text, `a[href^="#"]` (linking to a footnote)
  - Attributes:
    - `id="*"`
  - Parents: `p`, `li`, `td`, `th` (nearest block level ancestors)

## Signature block paragraphs (optional)

- **`<p class="Dags">`** (Signature time and place)
  - Content: text, inline-elements
  - Attributes:
    - `align="(right|center)"`
  - Parents: root
- **`<p class="FHUndirskr">`** („Fyrir hönd ráðherra“)
  - Content: text, inline-elements
  - Attributes:
    - `align="(right|center)"`
  - Parents: root
- **`<p class="Undirritun">`** (Name of signator)
  - Content: text, inline-elements
  - Attributes:
    - `align="(right|center)"`
  - Parents: root

## Misc

- **`<p class="indented">`** (Visually indented paragraph)
  - Content: text, inline-elements
  - Parents:  
    root, `li`, `blockquote`, `td`, `th`

## Appendixes

(NOTE: This markup is auto-generated during post-processing of the Regulation
texts, and not edited directly by editors.)

- **`<section class="appendix">`**
  - Content:  
    `h2.appendix__title` (single, first-child, required), block-elements,
    segment-headers and `p.footnote`
  - Parents: root
- **`<h2 class="appendix__title">`**
  - Content: text
  - Parents: `section.appendix` (as first-child only)

## Editor's notes

(NOTE: this markup is auto-generated during post-processing of the Regulation
texts, and not edited directly by editors.)

- **`<section class="comments">`**
  - Content: block-elements
  - Parents: root

## Legacy Formatting

(Consider changing into proper `<table>` or `<ul>`/`<ol>` or other markup when
possible.)

- **`<span data-legacy-indenting="">`**  
  Contains a string of `&nbps;` to imitate inline "tab" indenting in Word.
- **`<pre>`**  
  (Contains text, inline-elements and series of `&nbsp;` and `<br/>` for laying
  out tabular data and ASCII-style "graphics".)
  - Content: text, inline-elements
  - Parents: root, `li`, `blockquote`, `td`, `th`
- **`<table class="layout layout--list">`**  
  Layout tables emulating lists (usually numbered)
  - (Consider at least merging adjacent intent-only table-rows)
- **`<span data-cfemail="{{id}}">`**  
  Missing e-mail address stripped by some spam-protection.
