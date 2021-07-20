import { CodePromise } from '@polkadot/api-contract';
import { blake2AsHex } from '@polkadot/util-crypto';
import { unitsToPico } from '../definitions/OmegaDefaults';
import { ContractFacade } from './ContractFacade';

const GAS_LIMIT = 100000n * 10000000n;
const MNEMONIC = '//Alice';
const fs = require('fs');
const util = require('util');
const path = require('path');
const readFile = util.promisify(fs.readFile);

export class Deployer {
    async initialize() {
        this.contractFacade = new ContractFacade();
        await this.contractFacade.initialize(MNEMONIC);
    }

    getWasmFilename(contract, isDelegator) {
        return isDelegator
            ? path.resolve(__dirname, `../ink/${contract}.wasm`)
            : path.resolve(__dirname, `../ink/${contract}/${contract}.wasm`);
    }

    getAbiFilename(contract, isDelegator) {
        return isDelegator
            ? path.resolve(__dirname, `../ink/metadata.json`)
            : path.resolve(__dirname, `../ink/${contract}/metadata.json`);
    }

    async deployInnerContract(contract, params = []) {
        return new Promise(async (resolve, reject) => {
            const abi = require(this.getAbiFilename(contract));
            const wasm = await readFile(this.getWasmFilename(contract));
            const code = new CodePromise(this.contractFacade.api, abi, wasm);

            const unsub = await code.tx
                .new(unitsToPico(1), GAS_LIMIT, ...params)
                .signAndSend(this.contractFacade.alice, ({status, dispatchError, contract}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        unsub();
                        resolve(contract);
                    }
                });
        });
    }

    async deployDelegator() {
        return new Promise(async (resolve, reject) => {
            const contracts = {};
            const hashes = {};

            contracts['newomega'] = await this.deployInnerContract('newomega');
            hashes['newomega'] = contracts['newomega'].address.toHuman();
            console.log('address.newomega ', hashes['newomega']);

            contracts['newomegagame'] = await this.deployInnerContract('newomegagame', [contracts.newomega.address]);
            hashes['newomegagame'] = contracts['newomegagame'].address.toHuman();
            console.log('address.newomegagame ', hashes['newomegagame']);

            contracts['newomegastorage'] = await this.deployInnerContract('newomegastorage');
            hashes['newomegastorage'] = contracts['newomegastorage'].address.toHuman();
            console.log('address.newomegastorage ', hashes['newomegastorage']);

            contracts['newomegaranked'] = await this.deployInnerContract('newomegaranked',
                [contracts.newomegagame.address, contracts.newomegastorage.address]);
            hashes['newomegaranked'] = contracts['newomegaranked'].address.toHuman();
            console.log('address.newomegaranked ', hashes['newomegaranked']);

            contracts['newomegauniverse'] = await this.deployInnerContract('newomegauniverse',
                [contracts.newomegagame.address, contracts.newomegastorage.address]);
            hashes['newomegauniverse'] = contracts['newomegauniverse'].address.toHuman();
            console.log('address.newomegauniverse ', hashes['newomegauniverse']);

            contracts['newomegaindustrial'] = await this.deployInnerContract('newomegaindustrial',
                [contracts.newomegagame.address, contracts.newomegastorage.address]);
            hashes['newomegaindustrial'] = contracts['newomegaindustrial'].address.toHuman();
            console.log('address.newomegaindustrial ', hashes['newomegaindustrial']);

            const delegatorAbi = require('../ink/metadata.json');
            const delegatorWasm = await readFile(this.getWasmFilename('newomegadelegator', true));
            const code = new CodePromise(this.contractFacade.api, delegatorAbi,
                delegatorWasm);

            const delegator = await new Promise(async (resolveInner, rejectInner) => {
                const unsub = await code.tx
                    .new(unitsToPico(1000), GAS_LIMIT,
                        contracts.newomega.address,
                        contracts.newomegastorage.address,
                        contracts.newomegagame.address,
                        contracts.newomegaranked.address,
                        contracts.newomegauniverse.address,
                        contracts.newomegaindustrial.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError, contract}) => {
                        if (dispatchError) {
                            rejectInner(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            unsub();
                            resolveInner(contract);
                        }
                    });
            });

            console.log('address.delegator ', delegator.address.toHuman());

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegagame.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised delegator for newomegagame');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegaranked.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised delegator for newomegaranked');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegauniverse.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised delegator for newomegauniverse');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegaindustrial.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised delegator for newomegaindustrial');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegastorage.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised delegator for newomegastorage');


            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegastorage.tx
                    .authoriseRankedContract({ value: 0, gasLimit: GAS_LIMIT },
                        contracts.newomegaranked.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised ranked for newomegastorage');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegastorage.tx
                    .authoriseUniverseContract({ value: 0, gasLimit: GAS_LIMIT },
                        contracts.newomegauniverse.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised universe for newomegastorage');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegastorage.tx
                    .authoriseIndustrialContract({ value: 0, gasLimit: GAS_LIMIT },
                        contracts.newomegaindustrial.address)
                    .signAndSend(this.contractFacade.alice, ({status, dispatchError}) => {
                        if (dispatchError) {
                            reject(dispatchError);
                        }
                        if (status.isInBlock || status.isFinalized) {
                            resolveInner();
                        }
                    });
            });

            console.log('authorised industrial for newomegastorage');

            resolve(delegator);
        });
    }
}
