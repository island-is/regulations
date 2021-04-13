import { Client } from '@elastic/elasticsearch';
import { RegulationListItemFull } from '../db/Regulations';
import { RegulationsIndexBody } from './populate';

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
  console.log('search!', query.q, query.year, query.rn, query.ch);
  const searchQuery = cleanQuery(query.q);
  const isNameQuery = searchQuery && /^\d{4}([-/]\d{4})?$/.test(searchQuery);
  const dslQuery: any = { query_string: {} };
  const filters: Array<{ term: { [key: string]: string } }> = [];

  if (isNameQuery) {
    // exact regulation name search
    dslQuery.query_string = {
      query: '"' + searchQuery?.replace(/[-/]/, '\\/') + '"',
      fields: ['name'],
    };
  } else if (searchQuery) {
    // generic search
    dslQuery.query_string = {
      query: '*' + searchQuery.replace(/[-/]/, '\\/') + '*',
      analyze_wildcard: true,
      fields: ['name^10', 'title^6', 'text^1'],
    };
  } else {
    // wild search
    dslQuery.query_string = {
      query: '*',
      analyze_wildcard: true,
      fields: ['title^6', 'text^1'],
    };
  }

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

  const { body } = await client.search({
    index: 'regulations',
    size: 14,
    body: {
      query: {
        bool: {
          must: dslQuery,
          filter: filters,
        },
      },
    },
  });

  const regulationHits: Array<RegulationListItemFull> =
    body?.hits?.hits?.map((hit: any) => {
      return {
        type: 'base',
        name: hit._source.name,
        title: hit._source.title,
        text: hit._source.text,
        publishedDate: hit._source.publishedDate,
        ministry: hit._source.ministry,
      };
    }) ?? [];

  return regulationHits;
}
