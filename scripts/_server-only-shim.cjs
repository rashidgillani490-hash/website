/**
 * `server-only` throws unless it is resolved with Node's `react-server`
 * condition, which we can't enable here (React's shared-subset entry point
 * refuses to load outside Next's bundler). The scripts in this folder are
 * server code by definition, so we resolve the package to an empty module and
 * let them import server modules directly.
 *
 * Used as `node -r ./scripts/_server-only-shim.cjs --import tsx <script>`.
 */
const Module = require("node:module");

const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only" || request === "client-only") return {};
  const mod = load.call(this, request, parent, isMain);
  // React 18's non-`react-server` build has no `cache()`. The CMS layer uses it
  // purely as a per-request memo, so an identity wrapper is faithful here.
  if (request === "react" && mod && typeof mod.cache !== "function") {
    try {
      mod.cache = (fn) => fn;
    } catch {
      /* frozen exports — the caller will surface it */
    }
  }
  return mod;
};
