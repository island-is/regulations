import { ISODate, RegName, Regulation } from '../routes/types';
import { getRegulation } from '../db/Regulation';
import { RegulationListItemFull, getAllBaseRegulations } from '../db/Regulations';
import { Client } from '@elastic/elasticsearch';
import { performance } from 'perf_hooks';
// import { template } from './template';

const INDEX_NAME = 'regulations';

const analyzers = [
  'stemmer',
  'keywords',
  'synonyms',
  'stopwords',
  'hyphenwhitelist',
  'autocompletestop',
];

export type RegulationsIndexBody = {
  year: string;
  name: RegName;
  title: string;
  text: string;
  publishedDate?: ISODate;
  ministry?: string;
  ministrySlug?: string;
  lawChapters: Array<string>;
  lawChaptersSlugs: Array<string>;
};

const regulationToIndexItem = (reg: RegulationListItemFull | Regulation) => {
  const lawChapters: Array<string> = [];
  const lawChaptersSlugs: Array<string> = [];
  reg?.lawChapters?.forEach((chapter) => {
    lawChapters.push(chapter.name);
    lawChaptersSlugs.push(chapter.slug);
  });
  const indexBody: RegulationsIndexBody = {
    year: reg.name.match(/\/(\d{4})/)?.[1] || '',
    name: reg.name as RegName,
    title: reg.title,
    text: reg.text ?? '',
    publishedDate: reg.publishedDate,
    ministry: reg?.ministry?.name,
    ministrySlug: reg?.ministry?.slug,
    lawChapters: lawChapters,
    lawChaptersSlugs: lawChaptersSlugs,
  };
  return indexBody;
};

const checkIfIndexExists = async (client: Client, index: string): Promise<boolean> => {
  const result = await client.indices.exists({ index });
  return result.statusCode === 200;
};

export async function populateElastic(client: Client) {
  const t0 = performance.now();
  console.info('fetching regulations...');
  const regulations = (await getAllBaseRegulations({
    full: true,
    extra: true,
  })) as Array<RegulationListItemFull>;
  console.info(regulations.length + ' regulations found');

  if (!regulations.length) {
    console.warn('Error fetching regulations');
    return { success: false };
  }

  if (await checkIfIndexExists(client, INDEX_NAME)) {
    console.info('Deleting old index...');
    await client.indices.delete({
      index: INDEX_NAME,
    });
  }

  console.info('Creating new "' + INDEX_NAME + '" index...');
  await client.indices.create({
    index: INDEX_NAME,
    // body: template,
  });

  console.info('populating "' + INDEX_NAME + '" index...');
  for await (const reg of regulations) {
    const aReg = await regulationToIndexItem(reg);

    await client.index({
      index: INDEX_NAME,
      body: aReg,
    });
  }

  console.info('refreshing indices for "' + INDEX_NAME + '" index...');
  await client.indices.refresh({ index: INDEX_NAME });

  const t1 = performance.now();
  console.info(
    'indexing "' + INDEX_NAME + '" successful in ' + Math.round(t1 - t0) + 'ms.',
  );
  return { success: true };
}

const _updateItem = async (client: Client, regname: RegName) => {
  const newReg = await getRegulation(regname);

  if (
    newReg &&
    !('redirectUrl' in newReg) && // ignore RegulationRedirect
    newReg.type === 'base' && // only add base regulations
    !newReg.repealedDate // ignore cancelled regulations
  ) {
    console.info('adding ' + regname + ' to index...');
    const aReg = await regulationToIndexItem(newReg);
    await client.index({
      index: INDEX_NAME,
      body: aReg,
    });
  }
  await client.indices.refresh({ index: INDEX_NAME });
  return { success: true };
};

export async function updateElasticItem(client: Client, query: { name: RegName }) {
  if (!query.name || !/^\d{4}[-/]\d{4}$/.test(query.name)) {
    return { success: false };
  }
  try {
    console.info('deleting ' + query.name + ' from index...');
    await client.deleteByQuery(
      {
        index: INDEX_NAME,
        body: {
          query: {
            query_string: {
              query: '"' + query.name?.replace(/[-/]/, '\\/') + '"',
              fields: ['name'],
            },
          },
        },
      },
      function (err, res) {
        if (err) {
          console.error(err.message);
          return { success: false };
        }
        return _updateItem(client, query.name);
      },
    );
  } catch (err) {
    console.info(err);
    return { success: false };
  }
  return { success: true };
}
