# New Omega

## Blockchain Game That Never Ends

### Backend

Located under ```contracts```, is a Substrate compatible smart contract set.

### Frontend

Located under ```client```, is a React / Babylon.js / Capacitor.js game client, using Polkadot.js API for contract calls.

### Testing

There are multiple levels of testing available. The ```contracts``` have their own off-chain test suites, where possible. The tests execute against a *New Omega Network* testnet, but can be easily adapted to run against a local NON node instead (which itself, for the record, is a customised Substrate node).

```client``` offers frontend tests in two suites, App.test for visual testing, and ContractFacade.test for testing the facade (wrapper) around Polkadot.js API. 

For further information, consult the documentation in the respective submodules.