import { atomicWrite, regular } from '../io.mjs';
import { INITIAL_STORAGE_STEP, storageManifest as versionManifest } from '../../../dist/src/core/storage-migration.js';

export default {
  ...INITIAL_STORAGE_STEP,
  complete:context => Boolean(regular(context.manifestFile)),
  apply(context) {
    if (!regular(context.manifestFile)) writeManifest(context, INITIAL_STORAGE_STEP.to);
  },
};

export function storageManifest(context, modules) {
  return versionManifest(context.plan.companionId, modules);
}

export function writeManifest(context, modules) {
  atomicWrite(context.manifestFile, JSON.stringify(storageManifest(context, modules), null, 2) + '\n');
}
