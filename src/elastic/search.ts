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
  let dslQuery: any = {};

  console.log({ searchQuery });

  if (isNameQuery) {
    // exact regulation name
    dslQuery = {
      query_string: {
        query: '"' + searchQuery?.replace(/[-/]/, '\\/') + '"',
        fields: ['name'],
      },
    };
  } else if (searchQuery) {
    // generic search
    dslQuery = {
      query_string: {
        query: '*' + searchQuery.replace(/[-/]/, '\\/') + '*',
        analyze_wildcard: true,
        fields: ['name^10', 'title^6', 'text^1'],
      },
    };
  }

  const { body } = await client.search({
    index: 'regulations',
    size: 14,
    body: {
      query: dslQuery,
    },
  });

  const regulationHits: Array<RegulationListItemFull> =
    body?.hits?.hits?.map((hit: any) => {
      return {
        type: 'base',
        name: hit._source.name,
        title: hit._source.title,
        publishedDate: hit._source.publishedDate,
        ministry: hit._source.ministry,
      };
    }) ?? [];

  return regulationHits;
}
