declare const IntPositive__Brand: unique symbol;
/** Positive integer (>1) */
export type IntPositive = number & { [IntPositive__Brand]: true };

// ---------------------------------------------------------------------------

/** Generates URL Params type declaration for Fastify's .get() method */
export type Pms<keys extends string> = {
  Params: { [x in keys]: string };
};
/** Generates Querystring type declaration for Fastify's .get() method */
export type QStr<keys extends string> = {
  Querystring: { [x in keys]?: string };
};

// ---------------------------------------------------------------------------

export const assertPosInt = (maybeNumber: string): IntPositive | undefined => {
  const num = Number(maybeNumber);
  return num && num > 0 && num === Math.floor(num) ? (num as IntPositive) : undefined;
};
