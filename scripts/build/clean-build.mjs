// tsc does not remove outputs of deleted source files. Only dist is disposable.
import {rmSync, readFileSync} from 'node:fs';
import {resolve, basename} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),output=resolve(root,'dist');
if(JSON.parse(readFileSync(resolve(root,'package.json'))).name!=='her-world'||basename(output)!=='dist')throw Error('Unexpected build output');
rmSync(output,{recursive:true,force:true});
