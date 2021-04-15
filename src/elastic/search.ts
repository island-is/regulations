import { Client } from '@elastic/elasticsearch';
import esb from 'elastic-builder';
// import util from 'util';
import { PER_PAGE } from '../db/Regulations';
import { RegulationListItem, RegulationSearchResults } from '../routes/types';
// import { RegulationsIndexBody } from './populate';

// bunch of results for infinite scrolling search results
// - increments by 18 and needs to be dividable by 2 and 3
const PER_SEARCH_PAGE = PER_PAGE * 10;

type QueryParams = {
  q?: string; // query
  year?: string; // regulationYear
  rn?: string; // ministry slug
  ch?: string; // lawchapter slug
};

const cleanQuery = (q: string | undefined) => {
  return q
    ? q
        .replace(/[\r\n\s]+/g, ' ')
        .trim()
        .toLowerCase()
    : q;
};

export async function searchElastic(client: Client, query: QueryParams) {
  let searchQuery = cleanQuery(query.q);
  const isNameQuery = searchQuery && /^\d{3,4}([-/]\d{0,4})?$/.test(searchQuery);

  // add filters
  const filters: Array<esb.Query> = [];

  if (query.year) {
    filters.push(esb.termQuery('year', query.year));
  }
  if (query.rn) {
    filters.push(esb.termQuery('ministrySlug', query.rn));
  }
  if (query.ch) {
    filters.push(esb.termQuery('lawChaptersSlugs', query.ch));
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
    const { body } = await client.search({
      index: 'regulations',
      size: PER_SEARCH_PAGE,
      body: requestBody.toJSON(),
    });

    searchHits =
      body?.hits?.hits?.map((hit: any) => {
        return {
          name: hit._source.name,
          title: hit._source.title,
          publishedDate: hit._source.publishedDate,
          ministry: hit._source.ministry,
        };
      }) ?? [];

    totalItems = body?.hits?.total?.value ?? 0;
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
