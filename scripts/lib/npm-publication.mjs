import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import semver from 'semver';

class PendingPublication extends Error {}

/** Completion requires the ordinary npm download URL, not only metadata or a
 * cache-busting alternative. Network failures/old 404s are bounded retries;
 * version and integrity conflicts stop immediately and can never republish. */
export async function waitForNpmArchive({name,version,integrity,timeoutMs=20*60_000,
  fetchImpl=fetch,sleep=delay,now=Date.now,onRetry=message=>console.log(message)}) {
  if(name!=='her-world'||semver.valid(version)!==version||!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(integrity))
    throw Error('Expected Her World, an exact version and the checked archive SHA-512');
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Invalid publication timeout');
  const metadataURL=`https://registry.npmjs.org/${name}/${version}`;
  const archiveURL=`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
  const deadline=now()+timeoutMs;
  let last='npm has not exposed this release';
  async function request(url) {
    let response;
    try {response=await fetchImpl(url,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(Math.max(1,Math.min(60_000,deadline-now())))});}
    catch(error) {
      if(error instanceof TypeError||['AbortError','TimeoutError'].includes(error?.name))throw new PendingPublication(`network: ${error.message}`);
      throw error;
    }
    if(!response.ok) {
      await response.body?.cancel();
      const message=`HTTP ${response.status} at ${url}`;
      if([404,408,425,429].includes(response.status)||response.status>=500)throw new PendingPublication(message);
      throw Error(message);
    }
    return response;
  }
  while(now()<deadline) {
    try {
      const responseMetadata=await request(metadataURL);let metadata;
      try {metadata=await responseMetadata.json();}
      catch(error) {
        if(error instanceof TypeError||['AbortError','TimeoutError'].includes(error?.name))throw new PendingPublication(`metadata stream: ${error.message}`);
        throw error;
      }
      if(metadata?.name!==name||metadata.version!==version||metadata.dist?.integrity!==integrity||metadata.dist?.tarball!==archiveURL)
        throw Error('Published npm version, integrity or canonical archive URL conflicts with the checked release');
      const response=await request(archiveURL),hash=createHash('sha512');let downloadedBytes=0;
      try {
        if(!response.body)throw Error('Published archive has no body');
        for await(const block of response.body){hash.update(block);downloadedBytes+=block.length;}
      } catch(error) {
        if(error instanceof TypeError||['AbortError','TimeoutError'].includes(error?.name))throw new PendingPublication(`archive stream: ${error.message}`);
        throw error;
      }
      if(`sha512-${hash.digest('base64')}`!==integrity)throw Error('Downloaded npm archive integrity conflicts with the checked release');
      return {name,version,archiveURL,downloadedBytes,integrity,verified:true};
    } catch(error) {
      if(!(error instanceof PendingPublication))throw error;
      last=error.message;onRetry(`Waiting for npm ${version}: ${last}`);
      const remaining=deadline-now();if(remaining<=0)break;
      await sleep(Math.min(20_000,remaining));
    }
  }
  throw Error(`npm publication did not become downloadable within ${timeoutMs}ms: ${last}`);
}
