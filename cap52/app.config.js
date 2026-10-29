// Configuration dynamique : reprend app.json et permet de publier la version web dans un sous-dossier
// (ex. EXPO_BASE_URL=/Muscle-OS/cap52 pour GitHub Pages). Vide par défaut.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
