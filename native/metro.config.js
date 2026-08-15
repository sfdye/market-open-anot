const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// market-logic.js and zh-names.js live at the repo root, shared verbatim with the web app.
config.watchFolders = [repoRoot];
// Watching the repo root exposes the Worker's own install; pin resolution here and keep its
// packages out of the graph so they cannot shadow ours.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.blockList = [
  ...[config.resolver.blockList].flat(),
  /\/worker\/node_modules\/.*/,
  /\/worker\/\.wrangler\/.*/,
];

module.exports = config;
