const kinds = ['room', 'body', 'hold'];
export function act(kind) {
  if (['feed', 'water', 'play', 'pet'].includes(kind)) return true;
  switch (kind) {
    case 'hold': return 1;
    case 'room': return 2;
    case 'body': return 3;
  }
}
