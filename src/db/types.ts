// Output types for island.is graphql

export function toIsoDate(date: Date | null | undefined) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date ? (date.toISOString().substr(0, 10) as ISODate) : undefined;
}

// ---------------------------------------------------------------------------

export type MinistryType = {
  /** Name (title) of the ministry */
  name: string;
  /** Short, URL-friendly token to use for search filters, etc.  */
  slug: string;
  /** False if this ministry is not current */
  current: boolean;
};

export type MinistryFullType = MinistryType & {
  /** Custom sorting modifier – i.e. to push Forsætisráðuneytið to the top of a list. */
  order?: number;
};

// ---------------------------------------------------------------------------

export type LawChapterType = {
  /** Name (title) of the LawChapter */
  name: string;
  /** Short, URL-friendly token to use for search filters, etc.  */
  slug: string; // '01a' |'01b' |'01c' | etc.
};

export type LawChapterTreeType = Array<
  LawChapterType & {
    /** List of child-chapters for this top-level chapter.
     *
     * NOTE: The "tree" never goes more than one level down.
     */
    subChapters: ReadonlyArray<LawChapterType>;
  }
>;

// ---------------------------------------------------------------------------

export type RegulationListItemType = {
  /** Publication name */
  publishedDate: ISODate;
  /** Publication name */
  name: string;
  /** The title of the Regulation */
  title: string;
  /** The ministry that the regulation is linked to */
  ministry?: MinistryType;
};

// ---------------------------------------------------------------------------

declare const _RegNameToken_: unique symbol;
export type RegName = string & { [_RegNameToken_]: true };

declare const _ISODateToken_: unique symbol;
export type ISODate = string & { [_ISODateToken_]: true };

// ---------------------------------------------------------------------------

export type RegulationHistoryItemType = {
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

export type RegulationEffectType = {
  /** effectiveDate for this impact */
  date: ISODate;
  /** Publication name of the affected Regulation */
  name: string;
  /** Publication name of the affected Regulation */
  title: string;
  /** Type of effect */
  effect: 'amend' | 'repeal';
};

// ---------------------------------------------------------------------------

/** Regulation appendix/attachment chapter */
export type AppendixType = {
  /** Title of the appendix */
  title: string;
  /** The appendix text in HTML format */
  text: string;
};

export type RegulationType = {
  /** Publication name (NNNN/YYYY) of the regulation */
  name: RegName;
  /** The title of the regulation in HTML format */
  title: string;
  /* The regulation text in HTML format */
  text: string;
  /** List of the regulation's appendixes */
  appendixes: ReadonlyArray<AppendixType>;
  /** Date signed in the ministry */
  signatureDate?: ISODate;
  /** Date officially published in Stjórnartíðindi */
  publishedDate?: ISODate;
  /** Date when the regulation took effect for the first time */
  effectiveDate?: ISODate;
  /** Date of last amendment of this regulation
   *
   * This date is always a past date – UNLESS a future timeline Date is being
   */
  lastAmendDate?: ISODate | null;
  /** Date when (if) this regulation was repealed and became a thing of the past.
   *
   * NOTE: This date is **NEVER** set in the future
   */
  repealedDate?: ISODate | null;
  /** The ministry this regulation is published by/linked to */
  ministry: MinistryType;
  /** Law chapters that this regulation is linked to */
  lawChapters: ReadonlyArray<LawChapterType>;
  // TODO: add link to original DOC/PDF file in Stjórnartíðindi's data store.

  /** Regulations are roughly classified based on whether they contain
   * any original text/stipulations, or whether they **only**  prescribe
   * changes to other regulations.
   *
   * `base` = Stofnreglugerð
   * `amending` = Breytingareglugerð
   */
  type: 'base' | 'amending' | 'repealing';

  /** List of change events (Amendments, Repeals) over the life time of this
   * regulation – **excluding** the original base/root regulation
   */
  history: ReadonlyArray<RegulationHistoryItemType>;

  /** Date sorted list of effects this regulations has on other regulations
   * text-changes or cacellations
   */
  effects: ReadonlyArray<RegulationEffectType>;

  /** Present if a NON-CURRENT version of the regulation is being served
   *
   * Is undefined by default (when the "current" version is served).
   */
  timelineDate?: ISODate;

  /** Present if the regulation contains inlined change-markers (via htmldiff-js) */
  showingDiff?: {
    /** The date of the base version being compared against */
    from: ISODate;
    /** The date of the version being viewed
     *
     * Generally the same as `timelineDate` defaulting to `lastAmendDate` */
    to: ISODate;
  };
};

// ---------------------------------------------------------------------------

export type RegulationRedirectType = {
  /** Publication name (NNNN/YYYY) of the regulation */
  name: RegName;
  /** The title of the regulation in HTML format */
  title: string;
  /** The regulation data has not been fully migrated and should be viewed at this URL */
  redirectUrl: string;
};
