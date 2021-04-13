import { Client } from '@elastic/elasticsearch';
import { RegulationListItem } from '../routes/types';
// import { RegulationsIndexBody } from './populate';

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
  const isNameQuery = searchQuery && /^\d{4}([-/]\d{4})?$/.test(searchQuery);
  let dslQuery;
  const filters: Array<{ term: { [key: string]: string } }> = [];

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
      size: 14,
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
  }

  return regulationHits;
}
