import { Client, errors } from '@elastic/elasticsearch';
import esb from 'elastic-builder';
import xss from 'xss';
import { PER_PAGE } from '../db/Regulations';
import {
  RegulationListItem,
  RegulationSearchResults,
  Year,
} from '../routes/types';
import range from 'qj/range';
import zeroPad from 'qj/zeroPad';
// import { RegulationsIndexBody } from './populate';

export type SearchQueryParams = {
  q?: string; // query
  year?: string; // regulationYear
  yearTo?: string; // regulationYear arnge to
  rn?: string; // ministry slug
  ch?: string; // lawchapter slug
  iA?: string; // 'true' to include amending regulations
  iR?: string; // 'true' to include repelled regulations
  page?: string; // pagination page
};

/** Asserts that string is a number between 1900 and 2150
 *
 * Guards against "Infinity" and unreasonably sized numbers
 */
const assertReasonableYear = (maybeYear?: string): Year | undefined =>
  maybeYear && /^\d{4}$/.test(maybeYear)
    ? (Math.max(1900, Math.min(2150, Number(maybeYear))) as Year)
    : undefined;

const cleanQuery = (q: string | undefined) =>
  q && xss(q).replace(/\s+/g, ' ').trim().toLowerCase();

// eslint-disable-next-line complexity
export async function searchElastic(client: Client, query: SearchQueryParams) {
  let searchQuery = cleanQuery(query.q);

  // add filters
  const filters: Array<esb.Query> = [];

  if (!query.iA || query.iA !== 'true') {
    filters.push(esb.termQuery('type', 'base'));
  }
  if (!query.iR || query.iR !== 'true') {
    filters.push(esb.termQuery('repealed', false));
  }

  const yearFrom = assertReasonableYear(query.year);
  if (yearFrom) {
    const yearTo = Math.max(yearFrom, assertReasonableYear(query.yearTo) || 0);
    const years = range(yearFrom, yearTo);
    filters.push(esb.termsQuery('year', years));
  }
  if (query.rn) {
    filters.push(esb.termQuery('ministrySlug', xss(query.rn)));
  }
  if (query.ch) {
    filters.push(esb.termQuery('lawChaptersSlugs', xss(query.ch)));
  }

  // build text search
  const search: Array<esb.Query> = [];
  if (searchQuery) {
    const names: Array<string> = [];
    searchQuery = searchQuery
      .split(/\s+/)
      .map((word) => {
        const nameRe = /^(\d{1,4})\s*[-/]\s*((?:19|20)\d{2})$/;
        const m = word.match(nameRe);
        if (m) {
          const [_, number, year] = m;
          const numberPadded = zeroPad(parseInt(number), 4);
          names.push(numberPadded + '/' + year);
          return `"${number}-${year}"`;
        } else {
          return word;
        }
      })
      .join(' ');
    // generic search

    names.forEach((name) => {
      search.push(
        esb
          .queryStringQuery(`"${name}"`)
          // .analyzeWildcard(true)
          // .escape(true)
          .fields(['name^100']),
      );
    });
    search.push(
      esb
        .queryStringQuery(searchQuery)
        // .analyzeWildcard(true)
        // .escape(true)
        .fields([
          'title^23',
          'title.stemmed^20',
          'title.compound^10',
          'text^7',
          'text.stemmed^5',
          'text.compound^1',
        ]),
    );
  }

  // build search body
  const requestBody = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .should(search)
        //.minimumShouldMatch(1)
        .filter(filters),
    )
    .sorts([esb.sort('_score', 'desc'), esb.sort('publishedDate', 'desc')]);

  // esb.prettyPrint(requestBody);

  let totalItems = 0;
  const pagingPage = Math.max(parseInt('' + query.page) || 1, 1);
  let searchHits: Array<RegulationListItem> = [];

  if (filters.length || search.length) {
    let search: Record<string, any> = {};

    try {
      search = await client.search({
        index: 'regulations',
        size: PER_PAGE,
        body: requestBody.toJSON(),
        from: (pagingPage - 1) * PER_PAGE,
      });
    } catch (err) {
      const value = err instanceof errors.ResponseError ? err.meta : err;
      console.error(value);
    }

    searchHits =
      search.body?.hits?.hits?.map((hit: any) => {
        return {
          name: hit._source.name,
          title: hit._source.title,
          publishedDate: hit._source.publishedDate,
          ministry: hit._source.ministry,
        };
      }) ?? [];

    totalItems = search.body?.hits?.total?.value ?? 0;
  }

  const results: RegulationSearchResults = {
    page: pagingPage,
    perPage: PER_PAGE,
    totalPages: Math.ceil(totalItems / PER_PAGE),
    totalItems,
    data: searchHits,
  };

  return results;
}
