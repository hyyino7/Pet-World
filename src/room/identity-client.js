// Presentation-only identity. The owner RPC state supplies the canonical name.
const templates = new Map();
let identity = {displayName: ''};
const label = () => identity.displayName || '伙伴';
const htmlLabel = () => label().replace(/[&<>"']/g, value => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[value]);
function remember(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent.includes('__CHATPET_NAME__')) templates.set(node, node.textContent);
  }
  for (const element of root.querySelectorAll?.('*') || []) {
    for (const attribute of ['title', 'aria-label', 'placeholder']) {
      const value = element.getAttribute(attribute);
      if (value?.includes('__CHATPET_NAME__')) templates.set({element, attribute}, value);
    }
  }
}
function render() {
  for (const [target, template] of templates) {
    const value = template.replaceAll('__CHATPET_NAME__', label());
    if (target.element) target.element.setAttribute(target.attribute, value);
    else target.textContent = value;
  }
  document.title = identity.displayName ? identity.displayName + '的房间' : '伙伴的房间';
}
window.chatpetCompanionIdentity = {
  label,
  htmlLabel,
  update(next) {
    if (!next || typeof next.displayName !== 'string') return;
    const changed = identity.displayName !== next.displayName;
    identity = {displayName: next.displayName};
    render();
    if (changed) window.dispatchEvent(new Event('chatpet-identity-changed'));
  },
};
remember(document.documentElement);
render();
