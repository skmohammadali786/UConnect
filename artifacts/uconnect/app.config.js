const path = require("path");
const appJson = require("./app.json");
const { generateBrandAssets } = require("./scripts/generate-brand-assets");

const generatedAssets = generateBrandAssets();

function toExpoAssetPath(filePath) {
  return `./${path.relative(__dirname, filePath).replace(/\\/g, "/")}`;
}

const lightLogo = toExpoAssetPath(generatedAssets.lightLogo);
const darkLogo = toExpoAssetPath(generatedAssets.darkLogo);
const icon = toExpoAssetPath(generatedAssets.icon);

module.exports = {
  expo: {
    ...appJson.expo,
    icon,
    splash: {
      ...appJson.expo.splash,
      image: lightLogo,
      dark: {
        ...appJson.expo.splash.dark,
        image: darkLogo,
      },
    },
    android: {
      ...appJson.expo.android,
      adaptiveIcon: {
        ...appJson.expo.android.adaptiveIcon,
        foregroundImage: icon,
      },
    },
    web: {
      ...appJson.expo.web,
      favicon: icon,
    },
  },
};
