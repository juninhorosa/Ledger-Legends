---
name: API Proxy Setup
description: How to make frontend API calls work from any browser (not just localhost)
---
**Rule:** Never hardcode `REACT_APP_BACKEND_URL=http://localhost:8000`. Browsers resolve localhost against the user's machine, not the Replit server.

**Fix:** Set `REACT_APP_BACKEND_URL=` (empty) and add a dev server proxy in `craco.config.js`:
```js
devServerConfig.proxy = [{ context: ["/api"], target: "http://localhost:8000", changeOrigin: true, secure: false }];
```

**Why:** The dev server (port 5000) proxies `/api/*` server-side to `localhost:8000`, which is valid from the container. Browser only ever talks to port 5000.

**How to apply:** Any time API calls fail from a deployed/proxied domain but work on localhost.
