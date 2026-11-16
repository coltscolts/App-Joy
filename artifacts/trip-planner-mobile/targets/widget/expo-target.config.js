/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'JoyPlannWidget',
  displayName: 'JoyPlann',
  bundleIdentifier: '.widget',
  // containerBackground y los widgets de pantalla bloqueada requieren iOS 17.
  deploymentTarget: '17.0',
  colors: {
    $accent: '#1E6FD9',
    $widgetBackground: '#0B3D91',
  },
  entitlements: {
    // Mismo App Group que la app (lib/widgetSync.ts).
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
