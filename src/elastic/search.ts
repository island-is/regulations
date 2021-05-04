import { Client } from '@elastic/elasticsearch';
import esb from 'elastic-builder';
import xss from 'xss';
// import util from 'util';
import { PER_PAGE } from '../db/Regulations';
import { RegulationListItem, RegulationSearchResults, Year } from '../routes/types';
import range from 'qj/range';
// import { RegulationsIndexBody } from './populate';

// bunch of results for infinite scrolling search results
// - increments by 18 and needs to be dividable by 2 and 3
const PER_SEARCH_PAGE = PER_PAGE * 20;

export type SearchQueryParams = {
  q?: string; // query
  year?: string; // regulationYear
  yearTo?: string; // regulationYear arnge to
  rn?: string; // ministry slug
  ch?: string; // lawchapter slug
};

/** Asserts that string is a number between 1900 and 2150
 *
 * Guards against "Infinity" and unreasonably sized numbers
 */
const assertReasonableYear = (maybeYear?: string): Year | undefined =>
  maybeYear && /\d{4}/.test(maybeYear)
    ? (Math.max(1900, Math.min(2150, Number(maybeYear))) as Year)
    : undefined;

const cleanQuery = (q: string | undefined) => {
  return q
    ? xss(q)
        .replace(/[\r\n\s]+/g, ' ')
        .trim()
        .toLowerCase()
    : q;
};

// eslint-disable-next-line complexity
export async function searchElastic(client: Client, query: SearchQueryParams) {
  let searchQuery = cleanQuery(query.q);
  const isNameQuery = searchQuery && /^\d{3,4}([-/]\d{0,4})?$/.test(searchQuery);

  // add filters
  const filters: Array<esb.Query> = [];

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
  if (isNameQuery) {
    if (searchQuery && /^\d{3}([-/]\d{0,4})?$/.test(searchQuery)) {
      // zeropad 3 digit name querys
      searchQuery = '0' + searchQuery;
    }
    // exact regulation name search
    search.push(esb.matchPhrasePrefixQuery('name', searchQuery));
  } else if (searchQuery) {
    // generic search
    search.push(
      esb
        .queryStringQuery('*' + searchQuery + '*')
        .analyzeWildcard(true)
        // .escape(true)
        .fields(['name^10', 'title^4', 'text^1']),
    );
  } else if (filters.length) {
    // wild search with filters only
    search.push(esb.queryStringQuery('*').analyzeWildcard(true).fields(['title']));
  }

  // build search body
  const requestBody = esb
    .requestBodySearch()
    .query(esb.boolQuery().must(search).filter(filters));

  // console.log(util.inspect(requestBody, true, null));

  let totalItems = 0;
  let searchHits: Array<RegulationListItem> = [];

  if (filters.length || search.length) {
    let search: Record<string, any> = {};

    try {
      search = await client.search({
        index: 'regulations',
        size: PER_SEARCH_PAGE,
        body: requestBody.toJSON(),
      });
    } catch (err) {
      console.error(err);
    }

    searchHits =
      search?.body?.hits?.hits?.map((hit: any) => {
        return {
          name: hit._source.name,
          title: hit._source.title,
          publishedDate: hit._source.publishedDate,
          ministry: hit._source.ministry,
        };
      }) ?? [];

    totalItems = search?.body?.hits?.total?.value ?? 0;
  }

  const results: RegulationSearchResults = {
    page: 1,
    perPage: PER_SEARCH_PAGE,
    totalPages: Math.ceil(totalItems / PER_SEARCH_PAGE),
    totalItems,
    data: searchHits,
  };

  return results;
}
