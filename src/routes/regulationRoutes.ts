import { getRegulation } from '../db/Regulation';
import { assertISODate, assertNameSlug, slugToName } from '../utils/misc';

import { Regulation } from 'entity/Regulation';

export function regulationRoutes(fastify: any, opts: any, done: any) {
  /**
   * Returns original version of a regulation
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/:name/original',
    opts,
    async function (request: any, reply: any) {
      const name = assertNameSlug(request.params.name);
      if (name) {
        const data = await getRegulation(slugToName(name));
        if (data) {
          reply.send(data);
        } else {
          reply.code(400).send('Regulation not found!');
        }
      } else {
        reply.code(400).send('No Regulation name specified!');
      }
    },
  );

  /**
   * Returns current version of a regulation with all changes applied
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/:name/current',
    opts,
    async function (request: any, reply: any) {
      const name = assertNameSlug(request.params.name);
      if (name) {
        const data = await getRegulation(slugToName(name), new Date());
        if (data) {
          reply.send(data);
        } else {
          reply.code(400).send('Regulation not found!');
        }
      } else {
        reply.code(400).send('No Regulation name specified!');
      }
    },
  );

  /**
   * Returns current version of a regulation with all changes applied, showing
   * the total changes the "original" verion.
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @returns {Regulation}
   */
  fastify.get('/regulation/:name/diff', opts, async function (request: any, reply: any) {
    const name = assertNameSlug(request.params.name);
    if (name) {
      const data = await getRegulation(slugToName(name), new Date(), true);
      if (data) {
        reply.send(data);
      } else {
        reply.code(400).send('Regulation not found!');
      }
    } else {
      reply.code(400).send('No Regulation name specified!');
    }
  });

  /**
   * Returns a version of a regulation as it was on a specific date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/:name/d/:date',
    opts,
    async function (request: any, reply: any) {
      const name = assertNameSlug(request.params.name);
      const date = assertISODate(request.params.date);
      if (name && date) {
        const data = await getRegulation(slugToName(name), new Date(date));
        if (data) {
          reply.send(data);
        } else {
          reply.code(400).send('Regulation not found!');
        }
      } else {
        reply.code(400).send('No Regulation name specified!');
      }
    },
  );

  /**
   * Returns a version of a regulation as it was on a specific date, showing the changes
   * that occurred on that date
   * @param {string} name - Name of the Regulation to fetch (`nnnn-yyyyy`)
   * @param {string} date - ISODate (`YYYY-MM-DD`)
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/:name/d/:date/diff',
    opts,
    async function (request: any, reply: any) {
      const name = assertNameSlug(request.params.name);
      const date = assertISODate(request.params.date);
      if (name && date) {
        const data = await getRegulation(slugToName(name), new Date(date), true);
        if (data) {
          reply.send(data);
        } else {
          reply.code(400).send('Regulation not found!');
        }
      } else {
        reply.code(400).send('No Regulation name specified!');
      }
    },
  );

  done();
}
