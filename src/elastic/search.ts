import { Client } from '@elastic/elasticsearch';
import { RegulationListItemFull } from '../db/Regulations';
import { RegulationsIndexBody } from './populate';

type QueryParams = {
  q?: string; // query
  year?: string; // regulationYear
  rn?: string; // ministry slug
  ch?: string; // lawchapter slug
};

export async function searchElastic(client: Client, query: QueryParams) {
  console.log('search!', query.q);
  let dslQuery: any = {};

  if (query.q && (/\d{4}(-|\/)(\d{4})/.test(query.q) || /\d{4}/.test(query.q))) {
    // exact regulation name
    console.log('ex');
    dslQuery = {
      query_string: {
        query: '"' + query?.q?.replace(/\//, '\\/') + '"' ?? '',
        fields: ['name'],
      },
    };
  } else {
    // generic search
    dslQuery = {
      query: '*' + query.q + '*',
      analyze_wildcard: true,
      fields: ['name^10', 'title^6', 'text^1'],
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
