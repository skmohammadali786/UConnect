/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const APP_SCHEME = process.env.APP_SCHEME || "uconnect";
const APP_LINK_HOST = process.env.APP_LINK_HOST || process.env.EXPO_PUBLIC_APP_LINK_DOMAIN || "uconnect.social";
const IOS_BUNDLE_IDENTIFIER = process.env.IOS_BUNDLE_IDENTIFIER || "com.skmohammadali786.uconnect";
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || "com.skmohammadali786.uconnect";
const APP_STORE_URL = process.env.APP_STORE_URL || "#";
const PLAY_STORE_URL = process.env.PLAY_STORE_URL || "#";
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || "";
const ANDROID_SHA256_CERT_FINGERPRINTS = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
  .split(",")
  .map((fingerprint) => fingerprint.trim())
  .filter(Boolean);
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || APP_LINK_HOST;
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName)
    .replace(/APP_SCHEME_PLACEHOLDER/g, APP_SCHEME)
    .replace(/APP_STORE_URL_PLACEHOLDER/g, APP_STORE_URL)
    .replace(/PLAY_STORE_URL_PLACEHOLDER/g, PLAY_STORE_URL);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}


function serveJson(res, payload, contentType = "application/json") {
  res.writeHead(200, {
    "content-type": `${contentType}; charset=utf-8`,
    "cache-control": "public, max-age=3600",
  });
  res.end(JSON.stringify(payload));
}

function serveAppleAppSiteAssociation(res) {
  const appIDs = APPLE_TEAM_ID ? [`${APPLE_TEAM_ID}.${IOS_BUNDLE_IDENTIFIER}`] : [];
  serveJson(
    res,
    {
      applinks: {
        apps: [],
        details: appIDs.map((appID) => ({
          appID,
          paths: ["/post/*", "/events/*", "/event/*", "/join", "/join/*"],
          components: [
            { "/": "/post/*" },
            { "/": "/events/*" },
            { "/": "/event/*" },
            { "/": "/join" },
            { "/": "/join/*" },
          ],
        })),
      },
    },
    "application/json",
  );
}

function serveAssetLinks(res) {
  serveJson(res, [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: ANDROID_SHA256_CERT_FINGERPRINTS,
      },
    },
  ]);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/.well-known/apple-app-site-association" || pathname === "/apple-app-site-association") {
    return serveAppleAppSiteAssociation(res);
  }

  if (pathname === "/.well-known/assetlinks.json") {
    return serveAssetLinks(res);
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }

    if (pathname === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  if (
    pathname === "/join" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/post/") ||
    pathname.startsWith("/events/") ||
    pathname.startsWith("/event/")
  ) {
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
