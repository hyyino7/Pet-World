// Bind the original released browser and host modules to this companion's DSH lifecycle.
// Preserve the upstream inputs and verify every generated substitution against those inputs.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const vendor = join(root, 'vendor/dsh-pet/platform');
const read = file => readFileSync(file, 'utf8');
const playbackObserver = read(join(root,'src/desktop/platform/playback-observer.js'));
const distinctiveNames = JSON.parse(read(join(root,'src/desktop/assets/catalog.json'))).actions
  .filter(asset=>asset.group==='expression').map(asset=>asset.label);
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
const refreshBody = `
async function refreshCompanionPresentation() {
  const next = await loadConfig();
  for (const sprite of sprites) {
    const pet = next.pets.find(pet => pet.id === sprite.pet.id);
    if (!pet) continue;
    sprite.pet = {...sprite.pet, ...pet};
    sprite.animations = pet.animations;
    sprite.weights = pet.animationWeights;
    if (!pet.workStatusEnabled) {
      sprite.workState = null;
      sprite.prevWorkState = null;
    }
  }
  config = next;
}
`;
let helperEvents=read(join(vendor,'upstream/helper-events.js'));
helperEvents=replaceOnce(helperEvents,'async function pollStateOnce() {',refreshBody+'\nasync function pollStateOnce() {');
helperEvents=replaceOnce(helperEvents,'stateBaseline = S.flattenCounters(s);','await refreshCompanionPresentation();\n      stateBaseline = S.flattenCounters(s);');
helperEvents=replaceOnce(helperEvents,"if (change.path === 'sections.balance') applyBalanceLeaf(change.leaf);",
  "if (change.path === 'sections.config') await refreshCompanionPresentation();\n      else if (change.path === 'sections.balance') applyBalanceLeaf(change.leaf);");
// Native playing is emitted only after the video actually starts. Explicit
// requests already carry upstream playback IDs and keep their original reports.
helperEvents += '\n'+playbackObserver+`\nconst observeCompanionRandomPlayback = createCompanionPlaybackObserver(
  receipt => S.postAction(BASE + '/native-playback', receipt), new Set(${JSON.stringify(distinctiveNames)}));
document.addEventListener('playing', event => {
  const video = event.target;
  const sprite = sprites.find(sprite => sprite.videoA === video || sprite.videoB === video);
  if (!sprite || sprite.playback || video !== (sprite.front === 0 ? sprite.videoA : sprite.videoB)) return;
  observeCompanionRandomPlayback(video, sprite.anim, sprite.pet.id);
}, true);\n`;
writeFileSync(join(vendor,'runtime/electron-helper/events.js'),helperEvents);
const prefix = '/chatpet-presentation';
let host = read(join(vendor,'upstream/host.mjs')).replaceAll('/dsh-pet-7340', prefix);
host = replaceOnce(host, 'import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";', '');
host = replaceOnce(host, 'import { credentialRef } from "@deepseek-ai/dsh-credentials";', '');
host = replaceOnce(host, 'function createHostSetup(ctx) {\n\tconst dshHome = resolveDshHome();\n\tconst userRoot = join(dshHome, "dsh-pet");', 'function createHostSetup(ctx, userRoot) {');
host = replaceOnce(host, 'const PACKAGE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));', 'const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));');
host = replaceOnce(host,'\t\tstartHelper,\n\t\tstopHelper,\n\t\tstopHelperAndWait,',
  '\t\tstatus: () => ({running:Boolean(helper?.child && helper.child.exitCode === null),starting:Boolean(electronEnsure || startRetryTimer)}),\n\t\tstartHelper,\n\t\tstopHelper,\n\t\tstopHelperAndWait,');
host = replaceOnce(host,'startHelper: spawn$1.startHelper,','status: spawn$1.status,\n\t\tstartHelper: spawn$1.startHelper,');
host = replaceOnce(host, 'export { apply, inject, name };', 'export { createHostSetup, createPetLookup, createHttpRoute, createDesktopHelper, flattenPetList, createSessionNotify, registerSessionWatch, createWorkStatusBridge, pickSleepNames, readAllConfig, readJsonc, topFieldValid, decideAnim, readBody, sendFile, sendJson, sendText };');
writeFileSync(join(vendor,'runtime.mjs'), host);

let client = read(join(vendor,'upstream/client.js')).trim();
client = replaceOnce(client, ';(()=>{', 'function makePetPresentation(require, platformFetch, presentationPath) {\nconst fetch = platformFetch;');
client = replaceOnce(client, 'window.__ModuleLoader__.load({\n\tid: "dsh-pet",\n\tfactory: makeFactory()\n});','return makeFactory()(require);');
client = replaceOnce(client, '\n})();', '\n}');
client = client.replaceAll('"/dsh-pet-7340"', 'presentationPath');
client = replaceOnce(client,'function createOwnAnimation(deps) {',playbackObserver+`\nconst observeCompanionRandomPlayback = createCompanionPlaybackObserver(
  receipt => postAction(ROUTE_PATH + '/native-playback', receipt), new Set(${JSON.stringify(distinctiveNames)}));\nfunction createOwnAnimation(deps) {`);
client = replaceOnce(client,
  '\t\t\tel$1.play().then(() => {\n\t\t\t\tif (cuePlaybackId !== null) deps.report(cuePlaybackId, "playing");',
  '\t\t\tel$1.play().then(() => {\n\t\t\t\tif (cuePlaybackId === null && mounted && gen === swapGen && frontVideo() === el$1) observeCompanionRandomPlayback(el$1, next, cfg.id);\n\t\t\t\tif (cuePlaybackId !== null) deps.report(cuePlaybackId, "playing");');
// Only the body renderer consumes activity overrides. The editor reads the saved configuration.
client = replaceOnce(client,
  'const loadMerged = async () => {\n\t\t\t\tconst r = await fetch(ROUTE_PATH + "/config", { cache: "no-store" });',
  'const loadMerged = async () => {\n\t\t\t\tconst r = await fetch(ROUTE_PATH + "/config-live", { cache: "no-store" });');
client = replaceOnce(client,'const next = merged ?? await loadMerged();','const next = await loadMerged();');
// All bodies share Core identity and the existing DSH native model/session.
// Retain legacy values on disk while removing editors with no connected consumer.
const personaStart='field(t("personaLabel"), h("div", {';
const personaEnd='}), t("personaHint"))';
if(client.split(personaStart).length!==2 || client.split(personaEnd).length!==2)throw Error('Pet persona editor changed');
const personaAt=client.indexOf(personaStart),personaTo=client.indexOf(personaEnd,personaAt)+personaEnd.length;
client=client.slice(0,personaAt)+'null'+client.slice(personaTo);
const modelStart='\t\t\t\th(ModelCard, {';
const modelEnd='\t\t\t\th(PhysicsCard, {';
if(client.split(modelStart).length!==2 || client.split(modelEnd).length!==2)throw Error('Pet model editor changed');
const modelAt=client.indexOf(modelStart),modelTo=client.indexOf(modelEnd,modelAt);
client=client.slice(0,modelAt)+client.slice(modelTo);
client = replaceOnce(client,
  '\t\t\tctx.slots.inject("settings.section", function* () {\n\t\t\t\tyield ctx.slots.register({\n\t\t\t\t\tname: "settings.section",\n\t\t\t\t\tid: "pet-config",\n\t\t\t\t\torder: 30,\n\t\t\t\t\tlabel: () => t("nav"),\n\t\t\t\t\tinject: () => ({ t })\n\t\t\t\t}, PetConfigSection);\n\t\t\t});',
  '\t\t\tctx.provide("chatpetAppearanceEditor", () => h(PetConfigSection, {t}));');
client = replaceOnce(client,
  '\t\tif (leaf$1.action === "chat") {\n\t\t\tdeps.openChat();\n\t\t\treturn;\n\t\t}',
  '\t\tif (leaf$1.action === "chat") {\n\t\t\tfireAction(ROUTE_PATH + "/native-chat-window", "原生聊天");\n\t\t\treturn;\n\t\t}');
client = replaceOnce(client, 'navigator.sendBeacon("/dsh-pet-7340/lock/release?pet=" + encodeURIComponent(petId), new Blob([body], { type: "application/json" }));',
  'void fetch(presentationPath + "/lock/release?pet=" + encodeURIComponent(petId), {method:"POST",body,keepalive:true}).catch(()=>{});');
client = client.replaceAll('petApi7340','chatpetPresentation').replaceAll('"pet.config"','"chatpet.presentation.config"').replaceAll('"pet.chat"','"chatpet.presentation.chat"');
for (const id of ['baifan','pet','pet-config']) client = client.replaceAll('id: "'+id+'",','id: "chatpet-'+id+'",');
const settings = replaceOnce(read(join(root,'src/console/client.js')), 'window.__ModuleLoader__.load({', 'registerCompanion({');
writeFileSync(join(root,'src/desktop/platform/client.js'), '(()=>{\n'+client+'\n'+read(join(root,'src/desktop/platform/browser-entry.js'))+'\n'+settings+'\n})();\n');
