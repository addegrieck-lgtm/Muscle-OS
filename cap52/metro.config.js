// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Version web : expo-sqlite charge un module WebAssembly.
config.resolver.assetExts.push('wasm');

// Serveur de développement web : isolation cross-origin, nécessaire à SharedArrayBuffer (expo-sqlite web).
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
