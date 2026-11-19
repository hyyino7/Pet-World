export function prepare(host, storageId) {
  const metadata = host.workspace.runtime.store;
  metadata.setMeta(`economy.initialized:${storageId}`, true);
}
