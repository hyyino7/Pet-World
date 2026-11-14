// Run with Electron's Node mode; exercise native DSH contracts, never a live profile.
const {mkdtempSync,rmSync}=require('node:fs');const {join}=require('node:path');const {tmpdir}=require('node:os');const assert=require('node:assert/strict');
(async()=>{
 const root=process.env.DSH_UPDATE_MODULE||'/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-plugin-manager/lib/index.js';
 const {PluginManager}=await import(root),dir=mkdtempSync(join(tmpdir(),'her-world-npm-update-'));
 try {
  let source='github:hyyino7/her-world';
  const manager=Object.create(PluginManager.prototype);
  Object.assign(manager,{profile:{dir},versionListLimit:20,versionLookupConcurrency:2,
   readBundles:()=>[{name:'her-world',installed:true,availability:'profile',official:false,version:'0.1.0-rc.3',source}],
   registries:async()=>({registry:'https://registry.npmjs.org/',resolved:'https://registry.npmjs.org/',fallbackRegistries:[]}),registryFor:()=> 'https://registry.npmjs.org/',
   askRegistries:async(spec)=>({status:'read',registry:'https://registry.npmjs.org/',attempts:[],answer:spec==='her-world'
    ?{versions:['0.1.0-rc.3','0.1.0-rc.4','0.1.0-rc.5'],'dist-tags':{next:'0.1.0-rc.5'}}
    :{name:'her-world',version:spec.split('@')[1],dsh:{bundle:{patch:'./cordis.patch.yml'}}}})});
  assert.equal((await manager.listBundles())[0].update,undefined);
  source='her-world@0.1.0-rc.3';assert.equal((await manager.listBundles())[0].update,'registry');
  const versions=await manager.listVersions('her-world');assert.equal(versions.status,'listed');
  assert.deepEqual(versions.versions.map(v=>v.version),['0.1.0-rc.5','0.1.0-rc.4']);
  assert.ok(versions.versions.every(v=>v.bundle));
  console.log('Native npm update eligibility and newer-version listing passed; no installation.');
 }finally{rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
