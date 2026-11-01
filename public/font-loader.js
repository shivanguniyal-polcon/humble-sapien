// The hosted families are for the desktop composition. A phone reads the
// self-hosted subsets declared in src/index.css, so it must not request the
// Google stylesheet at all: a non-matching media attribute is still fetched,
// and any weight the subsets do not cover would pull a full hosted face.
//
// The query is the complement of the 48rem phone breakpoint. A phone turned
// landscape can cross it, so the loader re-checks on change instead of
// deciding once at startup.
(() => {
  const desktop = window.matchMedia('(min-width: 48.001rem)');
  const href =
    'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Public+Sans:ital,wght@0,300..800;1,300..800&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+Ol+Chiki&family=Noto+Sans+Meetei+Mayek&display=swap';
  let sheet = null;

  const load = () => {
    if (!desktop.matches || sheet) return;

    const preconnect = (url, cross) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      if (cross) link.crossOrigin = 'anonymous';
      document.head.append(link);
    };

    preconnect('https://fonts.googleapis.com');
    preconnect('https://fonts.gstatic.com', true);

    sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = href;
    sheet.media = '(min-width: 48.001rem)';
    document.head.append(sheet);
  };

  load();
  if (desktop.addEventListener) desktop.addEventListener('change', load);
  else desktop.addListener(load);
})();
