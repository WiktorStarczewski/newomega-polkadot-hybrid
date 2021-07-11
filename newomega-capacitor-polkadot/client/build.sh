rm -rf android
rm -rf ios
rm -rf build
npm run build
npx cap add android
npx cap add ios
npx cordova-res android --skip-config --copy --icon-background-source '#000000'
npx cordova-res ios --skip-config --copy --icon-background-source '#000000'
