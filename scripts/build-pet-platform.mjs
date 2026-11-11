// Bind the original released browser and host modules to this companion's DSH lifecycle.
// Preserve the upstream inputs and verify every generated substitution against those inputs.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const vendor = join(root, 'vendor/dsh-pet/platform');
const read = file => readFileSync(file, 'utf8');
const manifest = JSON.parse(read(join(vendor, 'origin.json')));
for (const [file, source] of Object.entries(manifest.files)) {
  if (createHash('sha256').update(readFileSync(join(vendor, file))).digest('hex') !== source.sha256) throw Error('Pet platform origin changed: '+file);
}
function replaceOnce(source, match, value) {
  if (source.split(match).length !== 2) throw Error('Pet platform entry changed: '+match);
  return source.replace(match, () => value);
}
const helper = replaceOnce(read(join(vendor,'upstream/helper-main.js')),
  "app.setName('dsh-pet-electron-helper');",
  "app.setName('dafeiyu-presentation');\napp.setPath('userData', process.env.CHATPET_PRESENTATION_PROFILE || path.join(app.getPath('appData'), 'dafeiyu-presentation'));");
writeFileSync(join(vendor,'runtime/electron-helper/main.js'),helper);
const prefix = '/chatpet-presentation';
let host = read(join(vendor,'upstream/host.mjs')).replaceAll('/dsh-pet-7340', prefix);
host = replaceOnce(host, 'import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";', '');
host = replaceOnce(host, 'import { credentialRef } from "@deepseek-ai/dsh-credentials";', '');
host = replaceOnce(host, 'function createHostSetup(ctx) {\n\tconst dshHome = resolveDshHome();\n\tconst userRoot = join(dshHome, "dsh-pet");', 'function createHostSetup(ctx, userRoot) {');
host = replaceOnce(host, 'const PACKAGE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));', 'const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));');
host = replaceOnce(host, 'export { apply, inject, name };', 'export { createHostSetup, createPetLookup, createHttpRoute, createDesktopHelper, flattenPetList, createSessionNotify, registerSessionWatch, createWorkStatusBridge, pickSleepNames, readAllConfig, readBody, sendFile, sendJson, sendText };');
writeFileSync(join(vendor,'runtime.mjs'), host);

let client = read(join(vendor,'upstream/client.js')).trim();
client = replaceOnce(client, ';(()=>{', 'function makePetPresentation(require, platformFetch, presentationPath) {\nconst fetch = platformFetch;');
client = replaceOnce(client, 'window.__ModuleLoader__.load({\n\tid: "dsh-pet",\n\tfactory: makeFactory()\n});','return makeFactory()(require);');
client = replaceOnce(client, '\n})();', '\n}');
client = client.replaceAll('"/dsh-pet-7340"', 'presentationPath');
client = replaceOnce(client, 'navigator.sendBeacon("/dsh-pet-7340/lock/release?pet=" + encodeURIComponent(petId), new Blob([body], { type: "application/json" }));',
  'void fetch(presentationPath + "/lock/release?pet=" + encodeURIComponent(petId), {method:"POST",body,keepalive:true}).catch(()=>{});');
client = client.replaceAll('petApi7340','chatpetPresentation').replaceAll('"pet.config"','"chatpet.presentation.config"').replaceAll('"pet.chat"','"chatpet.presentation.chat"');
for (const id of ['baifan','pet','pet-config']) client = client.replaceAll('id: "'+id+'",','id: "chatpet-'+id+'",');
const settings = replaceOnce(read(join(root,'src/console/client.js')), 'window.__ModuleLoader__.load({', 'registerCompanion({');
writeFileSync(join(root,'src/desktop/platform/client.js'), '(()=>{\n'+client+'\n'+read(join(root,'src/desktop/platform/browser-entry.js'))+'\n'+settings+'\n})();\n');
