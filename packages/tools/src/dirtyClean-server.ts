import { makeDirtyClean } from './_cleanup/makeDirtyClean';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { asDiv, Node, Text, DocumentFragment, E } from './_cleanup/serverDOM';

const dirtyClean = makeDirtyClean(asDiv, E, Node, Text, DocumentFragment);

export default dirtyClean;