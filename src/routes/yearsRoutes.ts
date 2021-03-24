import { getRegulationsYears } from '../db/Regulation';

export function yearsRoutes(fastify: any, opts: any, done: any) {
  /**
   * Gets all minitries
   * @returns {Array<Ministry>}
   */
  fastify.get('/years', opts, async function (request: any, reply: any) {
    const data = await getRegulationsYears();
    console.log(data);

    reply.send(data);
  });

  done();
}
