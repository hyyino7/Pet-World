import { expectedManifest, manifestComplete } from '../context.mjs';
import { atomicWrite } from '../io.mjs';

export default {
  id:'0001-storage-manifest',
  complete:manifestComplete,
  apply(context) {
    // A mismatching existing file is a reconciliation failure, never overwritten.
    if (!manifestComplete(context)) atomicWrite(context.manifestFile, JSON.stringify(expectedManifest(context), null, 2) + '\n');
  },
};
