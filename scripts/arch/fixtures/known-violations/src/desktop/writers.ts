export function session(host) {
  const store = host.workspace.runtime.store;
  const previous = store.get('desktop-session', 'id');
  store.put('desktop-session', 'id', previous);
}
