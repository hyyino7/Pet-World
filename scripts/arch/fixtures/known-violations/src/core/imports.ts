import {createRequire as factory} from 'node:module';
import '../living/plan/plugin.js';
export * from '#upper/plugin';
export function dynamic() {return import('../room/plugin.js');}
const load = factory(import.meta.url);
load('../desktop/plugin.js');
