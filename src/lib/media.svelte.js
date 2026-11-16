const query = matchMedia('(max-width: 900px)');

export const media = $state({ mobile: query.matches });
query.addEventListener('change', (e) => { media.mobile = e.matches; });
