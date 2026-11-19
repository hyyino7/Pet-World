import { atomicWrite, regular } from '../io.mjs';

// Historical contract shipped with 0.2.0. Future steps declare their own maps.
const modules = Object.freeze({
  behavior:1, channels:1, core:1, desktop:1, economy:1, emotion:1, life:1, memory:1, room:1, voice:1,
});
export default {
  id:'0001-storage-manifest',
  from:null,
  to:modules,
  complete:context => Boolean(regular(context.manifestFile)),
  apply(context) {
    if (!regular(context.manifestFile)) writeManifest(context, modules);
  },
};

export function storageManifest(context, modules) {
  return {schemaVersion:1, companionId:context.plan.companionId, modules};
}

export function writeManifest(context, modules) {
  atomicWrite(context.manifestFile, JSON.stringify(storageManifest(context, modules), null, 2) + '\n');
}
