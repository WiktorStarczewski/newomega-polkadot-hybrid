import { CodePromise } from '@polkadot/api-contract';
import { blake2AsHex } from '@polkadot/util-crypto';
import { ContractFacade } from './ContractFacade';

const ENDOWMENT = 1000000000000000n * 10n; // 10k units
//const DELEGATOR_ENDOWMENT = 1000000000000000n * 100n; // 100k units
const GAS_LIMIT = 100000n * 10000000n;
const MNEMONIC = '//Alice';
// const MNEMONIC = 'invest resist tide suffer still surge refuse dirt sphere economy gossip stem';

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
                .new(ENDOWMENT, GAS_LIMIT, ...params)
                .signAndSend(this.contractFacade.alice, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    unsub();
                    resolve(result.contract);
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

            contracts['newomegagame'] = await this.deployInnerContract('newomegagame', [contracts.newomega]);
            hashes['newomegagame'] = contracts['newomegagame'].address.toHuman();
            console.log('address.newomegagame ', hashes['newomegagame']);

            contracts['newomegastorage'] = await this.deployInnerContract('newomegastorage');
            hashes['newomegastorage'] = contracts['newomegastorage'].address.toHuman();
            console.log('address.newomegastorage ', hashes['newomegastorage']);

            contracts['newomegaranked'] = await this.deployInnerContract('newomegaranked',
                [contracts.newomegagame, contracts.newomegastorage]);
            hashes['newomegaranked'] = contracts['newomegaranked'].address.toHuman();
            console.log('address.newomegaranked ', hashes['newomegaranked']);

            const delegatorAbi = require('../ink/metadata.json');
            const delegatorWasm = await readFile(this.getWasmFilename('newomegadelegator', true));
            const code = new CodePromise(this.contractFacade.api, delegatorAbi,
                delegatorWasm);

            const delegator = await new Promise(async (resolveInner, rejectInner) => {
                const unsub = await code.tx
                    .new(ENDOWMENT, GAS_LIMIT,
                        contracts.newomega,
                        contracts.newomegastorage,
                        contracts.newomegagame,
                        contracts.newomegaranked)
                    .signAndSend(this.contractFacade.alice, (result) => {
                        if (result.status.isInBlock || result.status.isFinalized) {
                            unsub();
                            resolveInner(result.contract);
                        }
                    });
            });

            console.log('address.delegator ', delegator.address.toHuman());

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegagame.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address.toHuman())
                    .signAndSend(this.contractFacade.alice, (result) => {
                        if (result.status.isInBlock || result.status.isFinalized) {
                            resolveInner(result);
                        }
                    });
            });

            console.log('authorised delegator for newomegagame');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegaranked.tx
                    .authoriseDelegator({ value: 0, gasLimit: GAS_LIMIT },
                        delegator.address.toHuman())
                    .signAndSend(this.contractFacade.alice, (result) => {
                        if (result.status.isInBlock || result.status.isFinalized) {
                            resolveInner(result);
                        }
                    });
            });

            console.log('authorised delegator for newomegaranked');

            await new Promise(async (resolveInner, rejectInner) => {
                contracts.newomegastorage.tx
                    .authoriseRankedContract({ value: 0, gasLimit: GAS_LIMIT },
                        hashes.newomegaranked)
                    .signAndSend(this.contractFacade.alice, (result) => {
                        if (result.status.isInBlock || result.status.isFinalized) {
                            resolveInner(result);
                        }
                    });
            });

            console.log('authorised rewarder for newomegastorage');

            resolve(delegator);
        });
    }

    // async deployDelegator() {
    //     const delegator = await this._deployDelegatorWorker();

    //     delegator.tx
    //             .registerDefence({ value, gasLimit: GAS_LIMIT },
    //                 this.ensureUint8Array(selection),
    //                 modules,
    //                 name,
    //                 targeting)
    //             .signAndSend(this.alice, (result) => {
    //                 if (result.status.isInBlock || result.status.isFinalized) {
    //                     resolve(result);
    //                 }
    //             });


    //     return delegatorAddress;
    // }
}
