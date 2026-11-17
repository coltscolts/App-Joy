/**
 * Xcode 27 rechaza (error, no aviso) los pods con IPHONEOS_DEPLOYMENT_TARGET
 * por debajo de iOS 15. Varias librerías (RevenueCat, RNSVG, AsyncStorage,
 * SDWebImage…) declaran 9–13. La app ya exige iOS 15.1 (Expo SDK 54), así que
 * subir los pods a 15.1 no cambia los dispositivos compatibles.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MIN_TARGET = '15.1';
const MARKER = '# joyplann: minimum pods deployment target';

function patchPodfile(contents) {
  if (contents.includes(MARKER)) return contents;
  const snippet = [
    `    ${MARKER}`,
    '    installer.pods_project.targets.each do |target|',
    '      target.build_configurations.each do |config|',
    `        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN_TARGET}`,
    `          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'`,
    '        end',
    '      end',
    '    end',
  ].join('\n');
  // Al final del bloque post_install, después de react_native_post_install,
  // para que nada lo vuelva a cambiar.
  const start = contents.indexOf('post_install do |installer|');
  const end = start === -1 ? -1 : contents.indexOf('\n  end\n', start);
  if (end === -1) {
    throw new Error('withPodsMinimumDeploymentTarget: no se encontró post_install en el Podfile');
  }
  return `${contents.slice(0, end)}\n${snippet}${contents.slice(end)}`;
}

module.exports = function withPodsMinimumDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      fs.writeFileSync(podfile, patchPodfile(fs.readFileSync(podfile, 'utf8')));
      return cfg;
    },
  ]);
};

module.exports.patchPodfile = patchPodfile;
