import { Client } from '@elastic/elasticsearch';
import { PER_PAGE } from '../db/Regulations';
import { RegulationListItem, RegulationSearchResults } from '../routes/types';
// import { RegulationsIndexBody } from './populate';

// bunch of results for infinite scrolling search results
// - increments by 18 and needs to be dividable by 2 and 3
const PER_SEARCH_PAGE = PER_PAGE * 5;

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
  const searchQuery = cleanQuery(query.q);
  const isNameQuery = searchQuery && /^\d{4}([-/]\d{0,4})?$/.test(searchQuery);
  let dslQuery;
  const filters: Array<{ term: { [key: string]: string } }> = [];
  let totalItems = 0;

  if (query.year) {
    filters.push({
      term: {
        year: query.year,
      },
    });
  }
  if (query.rn) {
    filters.push({
      term: {
        ministrySlug: query.rn,
      },
    });
  }
  if (query.ch) {
    filters.push({
      term: {
        lawChaptersSlugs: query.ch,
      },
    });
  }

  if (isNameQuery) {
    // exact regulation name search
    dslQuery = {
      query: '"' + searchQuery?.replace(/[-/]/, '\\/') + '"',
      fields: ['name'],
    };
  } else if (searchQuery) {
    // generic search
    dslQuery = {
      query: '*' + searchQuery.replace(/[-/]/, '\\/') + '*',
      analyze_wildcard: true,
      fields: ['name^10', 'title^6', 'text^1'],
    };
  } else if (filters.length) {
    // wild search with filters only
    dslQuery = {
      query: '*',
      analyze_wildcard: true,
      fields: ['title^6', 'text^1'],
    };
  }

  let regulationHits: Array<RegulationListItem> = [];

  if (filters.length || (searchQuery && searchQuery.length > 2)) {
    const { body } = await client.search({
      index: 'regulations',
      size: PER_SEARCH_PAGE,
      body: {
        query: {
          bool: {
            must: { query_string: dslQuery },
            filter: filters,
          },
        },
      },
    });

    regulationHits =
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
    data: regulationHits,
  };

  return results;
}
