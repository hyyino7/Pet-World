// Read-only public verification; never installs, publishes or edits a package.
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {waitForNpmArchive} from '../lib/npm-publication.mjs';

const archive=process.argv[2];
if(!archive)throw Error('Usage: node scripts/checks/check-published.mjs CHECKED_ARCHIVE');
const {name,version}=JSON.parse(await readFile('package.json','utf8'));
const hash=createHash('sha512');for await(const block of createReadStream(archive))hash.update(block);
const integrity=`sha512-${hash.digest('base64')}`;
console.log(JSON.stringify(await waitForNpmArchive({name,version,integrity})));
