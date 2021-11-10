import { fastify as fast } from 'fastify';
import fastifyRateLimiter from 'fastify-rate-limit';
import proxy, { FastifyHttpProxyOptions } from 'fastify-http-proxy';
import { DAY, HOUR, SECOND } from '@hugsmidjan/qj/time';
import { Writable } from 'stream';
import { cacheControl } from './utils/misc';
import { AWS_BUCKET_NAME, AWS_REGION_NAME, API_SERVER } from './constants';

const { PORT, PROXY_PORT, FORCE_HTTPS } = process.env;

const IMAGE_TTL = (0.03 * DAY) / HOUR; // Seconds

const fastify = fast({
  // logger: true,
  ignoreTrailingSlash: true,
  /**
    This rewrite function serves to add suffix to pdf urls.
    Something that could not be done with fastify-http-proxy.
  */
  rewriteUrl: (req) => {
    const url = req.url || '/';
    return url.startsWith('/pdf') ? url.replace(/\/$/, '') + '/pdf' : url;
  },
});

fastify.addHook('onRequest', async (request, reply) => {
  if (
    request.headers['x-forwarded-proto'] !== 'https' &&
    FORCE_HTTPS === 'true'
  ) {
    reply
      .code(301)
      .header('Location', `https://${request.headers.host}${request.url}`)
      .send();
  }
});

fastify.register(fastifyRateLimiter, {
  max: 100,
  timeWindow: '1 minute',
});

const parseBody = (res: Writable, callback: (body: string) => void) => {
  let body = '';
  res
    .on('data', (chunk) => {
      body += chunk;
    })
    .on('end', () => {
      callback(body);
    });
};

// ---------------------------------------------------------------------------

type ProxyQuickOpts = {
  ttl?: number;
};
const proxyProps = (
  opts: ProxyQuickOpts = {},
): Partial<FastifyHttpProxyOptions> => ({
  httpMethods: ['GET'],
  replyOptions: {
    // onError: (reply, error) => {
    //   reply.send(error);
    // },
    onResponse: (request, reply, res) => {
      if (reply.statusCode < 400) {
        opts.ttl && cacheControl(reply, opts.ttl);
        reply.send(res);
      } else {
        reply.removeHeader('content-length');
        parseBody(res, (body) => {
          const [_, message] = body.match(/<Message>(.+?)<\/Message>/) || [];
          reply
            .type('text/plain; charset=utf-8')
            .send(message || 'something went wrong');
        });
      }
    },
  },
});

fastify.register(proxy, {
  upstream: API_SERVER,
  prefix: '/pdf',
  http: { requestOptions: { timeout: 40 * SECOND } },
  // http2: { requestTimeout: 40 * SECOND },
  ...proxyProps(),
});

fastify.register(proxy, {
  upstream: `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION_NAME}.amazonaws.com`,
  ...proxyProps({ ttl: IMAGE_TTL }),
});

const start = async () => {
  try {
    const serverPort = PROXY_PORT || PORT || 3001;

    await fastify.listen(serverPort, '0.0.0.0');

    console.info('PROXY API up and running on port ' + serverPort);
  } catch (err) {
    console.info(err);
    process.exit(1);
  }
};

start();
