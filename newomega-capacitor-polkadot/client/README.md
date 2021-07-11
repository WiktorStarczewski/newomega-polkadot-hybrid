# New Omega

## Blockchain Game That Never Ends

### Local Testing

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

The tests are divided into two suites, App.test and ContractFacade.test, the former offering UI testing, and latter testing the ContractFacade (a facade used to wrap the polkadot.js calls). There are generally no prerequisites to running those tests. In case of the facade tests, they are executed against the deployed contract back-end at [wss://newomega.network](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fnewomega.network#/explorer).

### `yarn run mobile`

Builds the Android and iOS packages.
After completion, follow the on screen instructions, eg. for Android run ```npx cap open android``` to open Android Studio.

For additional information about Android Studio or Xcode, please consult the appropriate documentation. However, for Android, the flow for a standard Studio setup generally is, Make Project -> Build APK / Run in Simulator.