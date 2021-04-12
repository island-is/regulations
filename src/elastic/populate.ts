import { ISODate, RegName } from '../routes/types';
import { RegulationListItemFull } from '../db/Regulations';
import { getAllBaseRegulations } from '../db/Regulations';
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
  name: RegName;
  title: string;
  text: string;
  publishedDate?: ISODate;
  ministry?: string;
  ministrySlug?: string;
  lawChapters: Array<string>;
  lawChaptersSlugs: Array<string>;
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

  if (await checkIfIndexExists(client, INDEX_NAME)) {
    console.info('Deleting old index...');
    await client.indices.delete({
      index: INDEX_NAME,
    });
  }

  console.info('Creating new "' + INDEX_NAME + '" index...');
  client.indices.create({
    index: INDEX_NAME,
    // body: template,
  });

  console.info('populating "' + INDEX_NAME + '" index...');
  for await (const reg of regulations) {
    const lawChapters: Array<string> = [];
    const lawChaptersSlugs: Array<string> = [];
    reg?.lawChapters?.forEach((chapter) => {
      lawChapters.push(chapter.name);
      lawChaptersSlugs.push(chapter.slug);
    });
    const indexBody: RegulationsIndexBody = {
      name: reg.name as RegName,
      title: reg.title,
      text: reg.text ?? '',
      publishedDate: reg.publishedDate,
      ministry: reg?.ministry?.name,
      ministrySlug: reg?.ministry?.slug,
      lawChapters: lawChapters,
      lawChaptersSlugs: lawChaptersSlugs,
    };

    await client.index({
      index: INDEX_NAME,
      body: indexBody,
    });
  }
  /*
  console.info('applying regulations index template...');
  await client.indices.putTemplate({
    name: 'regulations',
    body: template,
    error_trace: true,
  });
*/
  console.info('refreshing indices for "' + INDEX_NAME + '" index...');
  await client.indices.refresh({ index: INDEX_NAME });

  const t1 = performance.now();
  console.info(
    'indexing "' + INDEX_NAME + '" successful in ' + Math.round(t1 - t0) + 'ms.',
  );
  return { success: true };
}

/*
export async function updateElasticItem(client: Client, item: RegName) {
  const t0 = performance.now();
  console.info('fetching regulations...');
  const regulations = (await getAllBaseRegulations({
    full: true,
    extra: true,
  })) as Array<RegulationListItemType>;
  console.info(regulations.length + ' regulations found, ');

  console.info('Deleting old index...');
  await client.indices.delete({
    index: 'regulations',
  });

  console.info('populating regulations index...');
  for await (const reg of regulations) {
    const lawChapters: Array<string> = [];
    const lawChaptersSlugs: Array<string> = [];
    reg?.lawChapters?.forEach((chapter) => {
      lawChapters.push(chapter.name);
      lawChaptersSlugs.push(chapter.slug);
    });
    const indexBody: RegulationsIndexBody = {
      name: reg.name as RegName,
      title: reg.title,
      text: reg.text ?? '',
      publishedDate: reg.publishedDate,
      ministry: reg?.ministry?.name,
      ministrySlug: reg?.ministry?.slug,
      lawChapters: lawChapters,
      lawChaptersSlugs: lawChaptersSlugs,
    };
    await client.index({
      index: 'regulations',
      body: indexBody,
    });
  }

  console.info('refreshing indices for regulations index...');
  await client.indices.refresh({ index: 'regulations' });

  const t1 = performance.now();
  console.info('indexing successful in ' + Math.round(t1 - t0) + 'ms.');
  return 'success';
}
*/
