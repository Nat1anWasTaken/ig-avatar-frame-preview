// Keep links from earlier campaign posts useful without turning other anchors into routes.
export function artworkFromHash(hash) {
  return { '': 'avatar', '#avatar': 'avatar', '#instagram': 'avatar', '#facebook': 'facebook', '#line': 'line' }[hash] ?? null;
}
