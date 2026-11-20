import { decodeMigrationJournal, MigrationBindingChanged, settled, validateMigrationContract } from '../../dist/src/core/storage-migration.js';
import { checked, MigrationError } from './errors.mjs';
import { hash, readJournal } from './io.mjs';

export function contractFor(steps) {
  const contract = steps.map(({id, from, to}) => ({id, from, to}));
  validateMigrationContract(contract);
  return contract;
}

export const journalBinding = context => ({storageId:context.plan.storageId, repoHash:hash(context.plan.repo)});
export { settled };

export function validateJournal(context) {
  return checked('journal-invalid', () => {
    try { return decodeMigrationJournal(readJournal(context.journalFile), context.plan.storageId); }
    catch (error) {
      if (error instanceof MigrationBindingChanged) throw new MigrationError('binding-changed');
      throw error;
    }
  });
}
