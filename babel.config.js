const _userConfig = require('./.fastshot.babel.user.config.js');
module.exports = function(api) {
  // Extract platform info and configure caching BEFORE calling user config,
  // because user config may call api.cache(true) which locks caching to
  // .forever() and prevents any subsequent cache configuration changes.
  const platform = api.caller(c => c?.platform);
  const isDev = api.caller(c => c?.isDev);
  const sourceMeta = process.env.EXPO_SOURCE_METADATA;
  api.cache.using(() => `${platform}:${isDev}:${sourceMeta}`);

  // Neutralize api.cache for user config (caching already configured above).
  // User configs commonly call api.cache(true) which would throw
  // "Caching has already been configured" if not intercepted.
  const _savedCache = api.cache;
  api.cache = Object.assign(() => {}, { forever: () => {}, never: () => {}, using: () => {} });
  const raw = typeof _userConfig === 'function' ? _userConfig(api) : _userConfig;
  api.cache = _savedCache;

  // Defensive: if user config returned null/undefined/non-object, use empty config
  const result = (raw && typeof raw === 'object' && !Array.isArray(raw))
    ? Object.assign({}, raw)
    : {};
  if (platform === 'web' && (isDev || sourceMeta === '1')) {
    // Normalize plugins to array
    if (!Array.isArray(result.plugins)) result.plugins = [];
    const hasIt = result.plugins.some(p =>
      (typeof p === 'string' && p.includes('source-metadata')) ||
      (Array.isArray(p) && typeof p[0] === 'string' && p[0].includes('source-metadata'))
    );
    if (!hasIt) result.plugins.push('./babel-plugin-source-metadata');
  }
  return result;
};
