// The site itself: the Vite build, served from Workers static assets.
//
// There is no application logic here. The asset layer answers any request that
// matches a file before this Worker runs; everything else falls through to it,
// and env.ASSETS.fetch applies the single-page-application fallback configured
// in site.wrangler.toml. That is what keeps a deep link working when the route
// lives after the hash, which the browser never sends to a server anyway.

export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
