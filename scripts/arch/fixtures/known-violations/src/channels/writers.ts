const kind = 'channel-received';
export function receive(store) {
  const alias = store;
  const previous = alias.get(kind, 'id');
  alias.put(kind, 'id', previous);
  store.put('channel-usage', 'id', {});
}
