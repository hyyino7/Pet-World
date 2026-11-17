export function subscribe(ctx) {
  ctx.on('pet/life.review', () => {});
  ctx.emit('pet/not-declared');
  ctx.on('session/event', () => {});
}
