import { ISODate, RegName, Regulation } from '../routes/types';
import { getRegulation } from '../db/Regulation';
import { RegulationListItemFull, getAllBaseRegulations } from '../db/Regulations';
import { Client } from '@elastic/elasticsearch';
import { performance } from 'perf_hooks';
import { getSettingsTemplate, mappingTemplate } from './template';
import { assertRegName, loadData } from '../utils/misc';

const INDEX_NAME = 'regulations';

export type RegulationsIndexBody = {
  type: 'amending' | 'base';
  year: string;
  name: RegName;
  title: string;
  text: string;
  publishedDate?: ISODate;
  repealedDate?: ISODate;
  repealed?: boolean;
  ministry?: string;
  ministrySlug?: string;
  lawChapters: Array<string>;
  lawChaptersSlugs: Array<string>;
};

const regulationToIndexItem = (reg: RegulationListItemFull) => {
  const lawChapters: Array<string> = [];
  const lawChaptersSlugs: Array<string> = [];
  reg?.lawChapters?.forEach((chapter) => {
    lawChapters.push(chapter.name);
    lawChaptersSlugs.push(chapter.slug);
  });
  const indexBody: RegulationsIndexBody = {
    type: reg.type,
    year: reg.name.match(/\/(\d{4})/)?.[1] || '',
    name: reg.name,
    title: reg.title,
    text: reg.text ?? '',
    repealed: reg.repealed ?? false,
    repealedDate: reg.repealedDate ?? undefined,
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

export async function recreateElastic(client: Client) {
  const t0 = performance.now();
  try {
    if (await checkIfIndexExists(client, INDEX_NAME)) {
      console.info('Deleting old index...');
      await client.indices.delete({
        index: INDEX_NAME,
      });
    }

    console.info('Creating new "' + INDEX_NAME + '" index...');
    await client.indices.create({
      index: INDEX_NAME,
    });

    await client.indices.close({
      index: INDEX_NAME,
    });
    console.info('Applying settings to "' + INDEX_NAME + '" index...');
    const settingsTemplate = await getSettingsTemplate('master', 'is');
    await client.indices.putSettings({
      index: INDEX_NAME,
      body: settingsTemplate,
    });

    console.info('Applying mappings to "' + INDEX_NAME + '" index...');
    await client.indices.putMapping({
      index: INDEX_NAME,
      body: mappingTemplate,
    });
    await client.indices.open({
      index: INDEX_NAME,
    });

    console.info('refreshing indices for "' + INDEX_NAME + '" index...');
    await client.indices.refresh({ index: INDEX_NAME });

    const t1 = performance.now();
    console.info(
      'Recreating "' + INDEX_NAME + '" successful in ' + Math.round(t1 - t0) + 'ms.',
    );
  } catch (err) {
    const t1 = performance.now();
    console.info(err);
    console.info(
      'Recreating "' + INDEX_NAME + '" failed in ' + Math.round(t1 - t0) + 'ms.',
    );
    return { success: false };
  }
  return { success: true };
}

export async function repopulateElastic(client: Client) {
  const t0 = performance.now();
  try {
    console.info('fetching regulations...');
    let regulations = loadData<Array<RegulationListItemFull>>(
      'backup-json/all-extra.json',
    );
    if (regulations) {
      console.info('returning data from file');
    } else {
      console.info('fetching data from db (this takes a while)...');
      regulations = (await getAllBaseRegulations({
        extra: true,
        includeRepealed: true,
      })) as Array<RegulationListItemFull>;
    }

    if (!regulations.length) {
      console.warn('Error fetching regulations');
      return { success: false };
    } else {
      console.info(regulations.length + ' regulations found');
    }

    console.info('deleting all items from "' + INDEX_NAME + '" index...');
    await client.deleteByQuery({
      index: INDEX_NAME,
      body: {
        query: {
          match_all: {},
        },
      },
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
  } catch (err) {
    const t1 = performance.now();
    console.info(err);
    console.info(
      'indexing "' + INDEX_NAME + '" failed in ' + Math.round(t1 - t0) + 'ms.',
    );
    return { success: false };
  }
  return { success: true };
}

const _updateItem = async (client: Client, regname: RegName) => {
  const newReg = (await getAllBaseRegulations({
    extra: true,
    includeRepealed: true,
    nameFilter: `'${regname}'`,
  })) as Array<RegulationListItemFull>;

  if (newReg && newReg[0]) {
    console.info('adding ' + regname + ' to index...');
    const aReg = await regulationToIndexItem(newReg[0]);
    await client.index({
      index: INDEX_NAME,
      body: aReg,
    });
  }
  await client.indices.refresh({ index: INDEX_NAME });
  return { success: true };
};

export async function updateElasticItem(client: Client, query: { name?: string }) {
  const name = query.name && assertRegName(query.name);
  if (!name) {
    return { success: false };
  }
  try {
    console.info('deleting ' + name + ' from index...');
    await client.deleteByQuery({
      index: INDEX_NAME,
      body: {
        query: {
          query_string: {
            query: '"' + name + '"',
            fields: ['name'],
          },
        },
      },
    });
    await _updateItem(client, name);
  } catch (err) {
    console.info(err);
    return { success: false };
  }
  return { success: true };
}
