declare const _RegName__Brand: unique symbol;
/** Regulation name – `0123/2012` */
export type RegName = string & { [_RegName__Brand]: true };

declare const _RegNameQuery__Brand: unique symbol;
/** Regulation name formatted for URL param insertion – `0123-2012` */
export type RegQueryName = string & { [_RegNameQuery__Brand]: true };

declare const _ISODate__Brand: unique symbol;
/** Valid ISODate string – e.g. `2012-09-30` */
export type ISODate = string & { [_ISODate__Brand]: true };

declare const _HTMLText__Brand: unique symbol;
/** HTMLText string – e.g. `I &lt;3 You ` */
export type HTMLText = string & { [_HTMLText__Brand]: true };

/** Plain-text string – e.g. `I <3 You ` */
export type PlainText = string & { [_HTMLText__Brand]?: false };

declare const _Year__Brand: unique symbol;
/** Four letter positive integer that might reasonably be a year */
export type Year = number & { [_Year__Brand]: true };

// ---------------------------------------------------------------------------

// Years
export type RegulationYears = ReadonlyArray<Year>;

// ---------------------------------------------------------------------------

export type LawChapter = {
  /** Name (title) of the law chapter */
  name: string;
  /** Short, URL-friendly token to use for search filters, etc.  */
  slug: string; // '01a' |'01b' |'01c' | etc.
};

export type LawChapterTree = Array<
  LawChapter & {
    /** List of child-chapters for this top-level chapter.
     *
     * NOTE: The "tree" never goes more than one level down.
     */
    subChapters: ReadonlyArray<LawChapter>;
  }
>;

// ---------------------------------------------------------------------------

// Ministries
export type Ministry = {
  /** Name (title) of the ministry */
  name: string;
  /** Short, URL-friendly token to use for search filters, etc.  */
  slug: string;
  /** False if this ministry is not current */
  current: boolean;
};

export type MinistryListItem = Ministry & {
  /** Optional sorting weight hint.
   *
   * Lower numbers first, undefined/null last.
   */
  order?: number | null;
};

export type MinistryList = ReadonlyArray<MinistryListItem>;

// ---------------------------------------------------------------------------

export type RegulationHistoryItem = {
  /** The date this this history item took effect */
  date: ISODate;
  /** Publication name of the affecting Regulation */
  name: RegName;
  /** The title of the affecting Regulation */
  title: string;
  /** Type of effect */
  effect: 'amend' | 'repeal';
};

// ---------------------------------------------------------------------------

export type RegulationEffect = {
  /** effectiveDate for this impact */
  date: ISODate;
  /** Publication name of the affected Regulation */
  name: RegName;
  /** Publication name of the affected Regulation */
  title: string;
  /** Type of effect */
  effect: 'amend' | 'repeal';
};

// ---------------------------------------------------------------------------

// Regulations list
export type RegulationListItem = {
  /** Publication name */
  name: RegName;
  /** The title of the Regulation */
  title: string;
  /** The ministry that the regulation is linked to */
  ministry?: Ministry;
  /** Publication date of this regulation */
  publishedDate: ISODate;
};

export type RegulationSearchResults = {
  /** The number of the current page, 1-based  */
  page: number;
  /** Total number of pages available for this query */
  perPage: number;
  /** Total number of pages available for this query */
  totalPages: number;
  /** Total number of items found for this query */
  totalItems: number;
  /** ReguationListItems for this page */
  data: Array<RegulationListItem>;
};

// ---------------------------------------------------------------------------

/** Regulation appendix/attachment chapter */
export type Appendix = {
  /** Title of the appendix */
  title: PlainText;
  /** The appendix text in HTML format */
  text: HTMLText;
};

// Single Regulation
export type Regulation = {
  /** Publication name (NNNN/YYYY) of the regulation */
  name: RegName;
  /** The title of the regulation */
  title: PlainText;
  /* The regulation text in HTML format */
  text: HTMLText;
  /** List of the regulation's appendixes */
  appendixes: ReadonlyArray<Appendix>;
  /** Optional HTML formatted comments from the editor pointing out
   * known errors or ambiguities in the text.
   */
  comments: HTMLText;
  /** Date signed in the ministry */
  signatureDate: ISODate;
  /** Date officially published in Stjórnartíðindi */
  publishedDate: ISODate;
  /** Date when the regulation took effect for the first time */
  effectiveDate: ISODate;
  /** Date of the last effective amendment of this regulation
   *
   * This date is always a past (or current) date
   */
  lastAmendDate?: ISODate | null;
  /** Date when (if) this regulation was repealed and became a thing of the past.
   *
   * NOTE: This date is **NEVER** set in the future
   */
  repealedDate?: ISODate | null;
  /** The ministry this regulation is published by/linked to */
  ministry?: Ministry;
  /** Law chapters that this regulation is linked to */
  lawChapters: ReadonlyArray<LawChapter>;

  // TODO: add link to original DOC/PDF file in Stjórnartíðindi's data store.
  /** Regulations are roughly classified based on whether they contain
   * any original text/stipulations, or whether they **only**  prescribe
   * changes to other regulations.
   *
   * `base` = Stofnreglugerð
   * `amending` = Breytingareglugerð
   */
  type: 'base' | 'amending';
  /** List of change events (Amendments, Repeals) over the life time of this
   * regulation – **excluding** the original base/root regulation
   */
  history: ReadonlyArray<RegulationHistoryItem>;
  /** Date sorted list of effects this regulations has on other regulations
   * text-changes or cacellations
   */
  effects: ReadonlyArray<RegulationEffect>;
  /** Present if a NON-CURRENT version of the regulation is being served
   *
   * Is undefined by default (when the "current" version is served).
   */
  timelineDate?: ISODate;

  /** Present if the regulation contains inlined change-markers (via htmldiff-js) */
  showingDiff?: undefined;
};

// ---------------------------------------------------------------------------

export type RegulationDiff = Omit<Regulation, 'title' | 'appendixes' | 'showingDiff'> & {
  /** The title of the regulation in HTML format */
  title: HTMLText;
  /** List of the regulation's appendixes */
  appendixes: ReadonlyArray<
    Omit<Appendix, 'title'> & {
      title: HTMLText;
    }
  >;
  /** Present if the regulation contains inlined change-markers (via htmldiff-js) */
  showingDiff: {
    /** The date of the base version being compared against */
    from: ISODate;
    /** The date of the version being viewed
     *
     * Generally the same as `timelineDate` defaulting to `lastAmendDate` */
    to: ISODate;
  };
};

// ---------------------------------------------------------------------------

export type RegulationMaybeDiff = Regulation | RegulationDiff;

// ---------------------------------------------------------------------------

export type RegulationRedirect = {
  /** Publication name (NNNN/YYYY) of the regulation */
  name: RegName;
  /** The title of the regulation in HTML format */
  title: string;
  /** The regulation data has not been fully migrated and should be viewed at this URL */
  redirectUrl: string;
};
