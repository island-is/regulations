import { fastify as fast } from 'fastify';
import fastifyRateLimiter from 'fastify-rate-limit';
import proxy from 'fastify-http-proxy';
const { AWS_BUCKET_NAME, AWS_REGION_NAME } = process.env;

const fastify = fast({
  /**
  This rewrite function serves to add suffix to pdf urls.
  Something that could not be done with fastify-http-proxy.
  */
  rewriteUrl: (req) => {
    const url = req.url || '/';
    return url.startsWith('/pdf') ? url.replace(/\/$/, '') + '/pdf' : url;
  },
});

fastify.register(fastifyRateLimiter, {
  max: 100,
  timeWindow: '1 minute',
});

if (!AWS_BUCKET_NAME || !AWS_REGION_NAME) {
  throw new Error('AWS_BUCKET_NAME and AWS_REGION_NAME not configured');
}

fastify.register(proxy, {
  upstream: 'https://reglugerdir-api.herokuapp.com/api/v1/regulation/',
  prefix: '/pdf',
  httpMethods: ['GET'],
});

fastify.register(proxy, {
  upstream: `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION_NAME}.amazonaws.com`,
  httpMethods: ['GET'],
});

const start = async () => {
  try {
    const serverPort = process.env.PROXY_PORT || 3001;

    await fastify.listen(serverPort, '0.0.0.0');

    console.info('PROXY API up and running on port ' + serverPort);
  } catch (err) {
    console.info(err);
    process.exit(1);
  }
};

start();
