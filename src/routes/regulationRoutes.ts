import { getRegulation } from '../db/Regulation';

import { Regulation } from 'entity/Regulation';

const urlNameToName = (name: string) => String(name).replace('-', '/');

export function regulationRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets original version of single regulation by name
   * @param {string} name - Name of the Regulation to fetch
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/nr/:name/original',
    opts,
    async function (request: any, reply: any) {
      if (request.params.name) {
        const data = await getRegulation(urlNameToName(request.params.name));
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
   * Gets current version of single regulation by name
   * @param {string} name - Name of the Regulation to fetch
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/nr/:name/current',
    opts,
    async function (request: any, reply: any) {
      if (request.params.name) {
        const data = await getRegulation(urlNameToName(request.params.name), new Date());
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
   * Gets current version of single regulation by name with all diffs from original
   * @param {string} name - Name of the Regulation to fetch
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/nr/:name/diff',
    opts,
    async function (request: any, reply: any) {
      if (request.params.name) {
        const data = await getRegulation(
          urlNameToName(request.params.name),
          undefined,
          true,
        );
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
   * Gets current version of single regulation by name with all diffs from original
   * @param {string} name - Name of the Regulation to fetch
   * @returns {Regulation}
   */
  fastify.get(
    '/regulation/nr/:name/d/:date',
    opts,
    async function (request: any, reply: any) {
      if (request.params.name && request.params.date) {
        const data = await getRegulation(
          urlNameToName(request.params.name),
          new Date(request.params.date),
        );
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
  fastify.get(
    '/regulation/nr/:name/d/:date/diff',
    opts,
    async function (request: any, reply: any) {
      if (request.params.name && request.params.date) {
        const data = await getRegulation(
          urlNameToName(request.params.name),
          new Date(request.params.date),
          true,
        );
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
