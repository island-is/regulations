import { FastifyPluginCallback } from 'fastify';
import {
  PER_PAGE,
  getNewestRegulations,
  getRegulationsCount,
  getAllRegulations,
} from '../db/Regulations';
import {
  assertPosInt,
  cacheControl,
  IntPositive,
  loadData,
  QStr,
  storeData,
} from '../utils/misc';

const NEWEST_TTL = 0.5;

export const regulationsRoutes: FastifyPluginCallback = (
  fastify,
  opts,
  done,
) => {
  /**
   * Gets latest regulations as paged array
   * @returns {Array<DB_Regulation>}
   */
  fastify.get<QStr<'page'>>('/regulations/newest', opts, async (req, res) => {
    const page = assertPosInt(req.query.page || '') || (1 as IntPositive);

    const data = await getNewestRegulations({
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    });
    const totalItems: number = await getRegulationsCount();
    const totalPages = Math.ceil(totalItems / PER_PAGE);

    cacheControl(res, NEWEST_TTL);
    res.send({
      page,
      perPage: PER_PAGE,
      totalPages,
      totalItems,
      data,
    });
  });

  // ---------------------------------------------------------------------------

  // Use-case: Fetch "gildandi stofnreglugerðir" full text
  // for Ísland.is's general-purpo site search index.
  fastify.get('/regulations/all/current/full', opts, async (req, res) => {
    let data = loadData('backup-json/all-current-full.json');
    if (!data) {
      console.info('Fetching data from db');
      data = await getAllRegulations({ full: true });
      storeData(data, 'backup-json/all-current-full.json');
    } else {
      console.info('Returning all-current-full data from file');
    }
    res.send(data);
  });

  // Use-case Fetch *all* regluations, full text to feed into
  // Reglugerðasafn's special purpose search-engine
  fastify.get<QStr<'template'>>(
    '/regulations/all/extra',
    Object.assign({}, opts, {
      onRequest: fastify.basicAuth,
    }),
    async function (req, res) {
      let data = loadData('backup-json/all-extra.json');
      if (!data) {
        console.info('Fetching data from db');
        data = await getAllRegulations({
          extra: true,
          includeRepealed: true,
        });
        storeData(data, 'backup-json/all-extra.json');
      } else {
        console.info('Returning all-extra data from file');
      }
      res.send(data);
    },
  );

  // Use-case: Fetch all base regulations with minimal data
  // for Ísland.is's regulation admin editor impacts registration
  fastify.get('/regulations/all/current/minimal', opts, async (req, res) => {
    let data = loadData('backup-json/all-current-minimal.json');
    if (!data) {
      console.info('Fetching data from db');
      data = await getAllRegulations();
      storeData(data, 'backup-json/all-current-minimal.json');
    } else {
      console.info('Returning all-current-minimal data from file');
    }
    res.send(data);
  });

  done();
};
