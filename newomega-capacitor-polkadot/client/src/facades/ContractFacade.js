import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { decodeAddress } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';
import { ContractPromise } from '@polkadot/api-contract';
import { OmegaDefaults, unitsToPico } from '../definitions/OmegaDefaults';
// import { plasmDefinitions } from '@plasm/types';
import delegatorAbi from '../ink/metadata.json';
import config from '../config/config.json';
import _ from 'underscore';


const GAS_LIMIT = -1; // 30000n * 1000000n;


export class ContractFacade {
    /**
     * Initializes the Facade with a mnemonic.
     * Instantiates a Keyring, exposes Alice account, and loads the contract.
     */
    async initialize(mnemonic, delegatorAddress) {
        this.api = await this.getApi();
        this.keyring = new Keyring({ type: 'sr25519' });
        this.alice = this.keyring.addFromUri(mnemonic, { name: 'NewOmega' });
        this.delegatorAddress = delegatorAddress;
        if (!_.isEmpty(this.getDelegatorAddress())) {
            this.contracts = {
                delegator: this.getDelegator(),
            };
        }
    }

    /**
     * Returns the main Delegator contract promise.
     */
    getDelegator() {
        return new ContractPromise(this.api,
            delegatorAbi, decodeAddress(this.getDelegatorAddress()));
    }

    /**
     * Gets the delegator address
     */    
    getDelegatorAddress() {
        return this.delegatorAddress || config.delegator_address;
    }

    /**
     * Instantiates the API, according to the default provider.
     * Waits until the API becomes ready.
     */
    async getApi() {
        const wsProvider = new WsProvider(OmegaDefaults.RPC_PROVIDER);
        const api = ApiPromise.create({
            provider: wsProvider,
            // types: {
            //     ...plasmDefinitions,
            // },
           types: { "Address": "MultiAddress", "LookupSource": "MultiAddress" },
            //types: { "Address": "AccountId", "LookupSource": "AccountId" },
        });
        await api.isReady;
        return api;
    }

    /**
     * Subscribes to balance changes for Alice according to the passed subscriber.
     */
    async subscribeToBalance(subscriber) {
        return this.api && this.api.query.system.account(this.alice.address, subscriber);
    }

    /**
     * Subscribes to new heads.
     */
    async subscribeNewHeads(handler) {
        return this.api && this.api.rpc.chain.subscribeNewHeads(handler);
    }

    /**
     * Registers a defence for player.
     */
    async registerDefence(selection, modules, name, value, targeting) {
        return new Promise(async (resolve, reject) => {
            await this.contracts.delegator.tx
                .registerDefence({ value, gasLimit: GAS_LIMIT },
                    this.ensureUint8Array(selection),
                    modules,
                    name,
                    targeting)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Unregisters a defence for player.
     */
    async unregisterDefence() {
        return new Promise(async (resolve, reject) => {
            await this.contracts.delegator.tx
                .unregisterDefence({ value: 0, gasLimit: GAS_LIMIT })
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Ensures discovery registration
     */
    async ensureDiscovery() {
        return new Promise(async (resolve, reject) => {
            await this.contracts.delegator.tx
                .ensureDiscovery({ value: 0, gasLimit: GAS_LIMIT })
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }
    
    /**
     * Registers the registered defence for current player.
     */
    async getOwnDefence() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getOwnDefence(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const defence = output && output.toJSON();
                defence.selection = Array.from(Uint8Array.from(hexToU8a(defence.selection)));

                resolve(defence);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns all the free actions a player can perform
     */    
    async getFreeActions() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getFreeActions(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const entry = output && output.toJSON();
                resolve(entry);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns all the players who have registered their defences.
     */
    async getAllDefenders() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getAllDefenders(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const defenders = output && output.toJSON();
                const defendersParsed = _.map(defenders, (defender) => {
                    return {
                        address: defender[0],
                        selection: Array.from(Uint8Array.from(hexToU8a(defender[1].selection))),
                        targeting: defender[1].targeting,
                        modules: defender[1].modules,
                        name: defender[1].name,
                        value: defender[1].value,
                        wins: defender[1].wins,
                        losses: defender[1].losses,
                    };
                });

                resolve(defendersParsed);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Reinforces a planet with a fleet and tactics setup.
     */
    async reinforcePlanet(target, planet_id, selection, modules, targeting) {
        return new Promise(async (resolve, reject) => {
            await this.contracts.delegator.tx
                .reinforcePlanet({ value: 0, gasLimit: GAS_LIMIT },
                    target,
                    planet_id,
                    this.ensureUint8Array(selection),
                    modules,
                    targeting)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Helper function to ensure a Uint8Array
     */
    ensureUint8Array(obj) {
        return obj instanceof Uint8Array
            ? obj
            : Uint8Array.from(obj);
    }

    /**
     * Attacks another player's registered defence.
     */
    async attack(target, selection, modules, value, targeting) {
        selection = this.ensureUint8Array(selection);

        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .attack({ value, gasLimit: GAS_LIMIT },
                    target,
                    selection,
                    modules,
                    targeting)
                .signAndSend(this.alice, ({status, dispatchError, contractEvents}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        const event = _.find(contractEvents, (contractEvent) => {
                            return contractEvent.event.identifier === 'RankedFightComplete';
                        });
                        const resultMap = event && event.args && event.args[2];
                        const payout = event && event.args && event.args[3];
                        resolve([resultMap, payout && payout.toNumber()]);
                    }
                });
        });
    }

    /**
     * Performs a "Harvest All" for a player
     */
    async harvest() {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .harvest({ value: unitsToPico(1), gasLimit: GAS_LIMIT })
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Renames a given planet
     */
    async renamePlanet(target, planet_id, name) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .renamePlanet({ value: unitsToPico(1), gasLimit: GAS_LIMIT }, target, planet_id, name)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Upgrades a given planet
     */
    async upgradePlanet(target, planet_id) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .upgradePlanet({ value: unitsToPico(2), gasLimit: GAS_LIMIT }, target, planet_id)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Harvests a given planet
     */
    async harvestPlanet(coords, planet_id) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .harvestPlanet({ value: 0, gasLimit: GAS_LIMIT }, coords, planet_id)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Returns all the players minerals
     */
    async getPlayerMinerals() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getPlayerMinerals(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const entry = output && output.toJSON();
                resolve(entry);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns all the trades registered with a player
     */
    async getPlayerTrades(account) {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getTrades(this.alice.address, { value: 0, gasLimit: GAS_LIMIT }, account);

            if (result.isOk) {
                const entry = output && output.toJSON();
                resolve(entry);
            } else {
                reject(result.asErr);
            }
        });  
    }

    /**
     * Registers a trade for a player
     */
    async registerTrade(resource_id, trade) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .registerTrade({ value: 0, gasLimit: GAS_LIMIT }, resource_id, trade)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Execute a trade according to a registered one
     */
    async trade(target, resource_id, trade) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .trade({ value: 0, gasLimit: GAS_LIMIT }, target, resource_id, trade)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Produces a specific ship for the player
     */
    async produceShips(ship_id, amount) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .produceShips({ value: 0, gasLimit: GAS_LIMIT }, ship_id, amount)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Returns all the players ships
     */
    async getPlayerShips() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getPlayerShips(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const entry = output && output.toJSON();
                resolve(entry);
            } else {
                reject(result.asErr);
            }
        });        
    }

    /**
     * Returns the players own standing
     */
    async getOwnStanding() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getOwnStanding(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const entry = output && output.toJSON();
                resolve(entry);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns the current leaderboard.
     */
    async getLeaderboard() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getLeaderboard(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const leaderboard = output && output.toJSON();
                const leaderboardParsed = _.map(leaderboard, (entry) => {
                    return {
                        address: entry[0],
                        ranked_wins: entry[1].ranked_wins,
                        ranked_losses: entry[1].ranked_losses,
                    }
                });

                resolve(leaderboardParsed);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Replays a fight according to a seed.
     */
    async replay(seed, selectionLhs, selectionRhs, modulesLhs, modulesRhs,
        targetingLhs, targetingRhs) {

        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .replay(this.alice.address, { value: 0, gasLimit: GAS_LIMIT },
                        seed,
                        this.ensureUint8Array(selectionLhs),
                        this.ensureUint8Array(selectionRhs),
                        modulesLhs,
                        modulesRhs,
                        targetingLhs,
                        targetingRhs
                    );

            if (result.isOk) {
                const fightResult = {
                    ...output[0].toJSON(),
                    lhs_moves: output[1].unwrap().toJSON(),
                    rhs_moves: output[2].unwrap().toJSON(),
                };

                // this._humanizeFightResult(fightResult);

                fightResult.selection_lhs = Array.from(Uint8Array.from(hexToU8a(fightResult.selection_lhs)));
                fightResult.selection_rhs = Array.from(Uint8Array.from(hexToU8a(fightResult.selection_rhs)));
                fightResult.ships_lost_lhs = Array.from(Uint8Array.from(hexToU8a(fightResult.ships_lost_lhs)));
                fightResult.ships_lost_rhs = Array.from(Uint8Array.from(hexToU8a(fightResult.ships_lost_rhs)));

                resolve(fightResult);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns a System according to its coordinates
     */
    async getSystem(coords) {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getSystem(this.alice.address, { value: 0, gasLimit: GAS_LIMIT }, coords);

            if (result.isOk) {
                const system = output && output.toJSON();
                this.parseSystem(system[0]);
                resolve([system[0], system[1]]);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Registers a player for the Universe module
     */
    async universeRegisterPlayer(name) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .universeRegisterPlayer({ value: 0, gasLimit: GAS_LIMIT }, name)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Discovers a system according to its coordinates
     */
    async discoverSystem(isFree) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .discoverSystem({ value: isFree ? 0 : unitsToPico(1), gasLimit: GAS_LIMIT })
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    /**
     * Builds a Gateway in a System according to its coordinates
     */
    async buildGateway(coords) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .buildGateway({ value: 0, gasLimit: GAS_LIMIT }, coords)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    parseSystem(mapEntry, index, rawOutput) {
        _.each(mapEntry.planets, (planet) => {
            planet.selection = Array.from(
                Uint8Array.from(
                    hexToU8a(planet.selection)));
        });
    }

    /**
     * Returns a universe map for a specific player (position root)
     */
    async getUniverseMap(root) {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getUniverseMap(this.alice.address, { value: 0, gasLimit: GAS_LIMIT }, root);

            if (result.isOk) {
                resolve(output && output.toJSON());
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns players assets, currently name
     */
    async getPlayerAssets() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getPlayerAssets(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const assets = output && output.toJSON();
                resolve(assets);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns players names according to their AccountIds
     */
    async getPlayerNames(players) {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getPlayerNames(this.alice.address, { value: 0, gasLimit: GAS_LIMIT }, players);

            if (result.isOk) {
                const names = output && output.toJSON();
                resolve(names);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Returns game statistics, number of players
     */
    async getGameStats() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getGameStats(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const stats = output && output.toJSON();
                resolve(stats);
            } else {
                reject(result.asErr);
            }
        });
    }

    /**
     * Attack a planet according to the System coordinates
     */
    async attackPlanet(target, planetId, selection, modules, targeting) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .attackPlanet({ value: 0, gasLimit: GAS_LIMIT },
                    target,
                    planetId,
                    this.ensureUint8Array(selection),
                    modules,
                    targeting)
                .signAndSend(this.alice, ({status, dispatchError, contractEvents}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        const event = _.find(contractEvents, (contractEvent) => {
                            return contractEvent.event.identifier === 'UniverseFightComplete';
                        });
                        const resultMap = event && event.args && event.args[2];
                        resolve(resultMap);
                    }
                });
        });
    }

    /**
     * Attack a planet according to the System coordinates
     */
    async craftModule() {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .craftModule({ value: unitsToPico(1), gasLimit: GAS_LIMIT })
                .signAndSend(this.alice, ({status, dispatchError, contractEvents}) => {
                    if (dispatchError) {
                        return reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        const event = _.find(contractEvents, (contractEvent) => {
                            return contractEvent.event.identifier === 'ModuleCrafted';
                        });

                        const tokenId = event && event.args && event.args[1];
                        const resultMap = event && event.args && event.args[2];
                        resolve([tokenId.toHuman(), resultMap.toJSON()]);
                    }
                });
        });
    }

    /**
     * Returns game statistics, number of players
     */
    async getPlayerModules() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getPlayerModules(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const playerModules = output && output.toJSON();
                resolve(playerModules);
            } else {
                reject(result.asErr);
            }
        });
    }

    async getTokenCount() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getTokenCount(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                resolve(output.toNumber());
            } else {
                reject(result.asErr);
            }
        });
    }

    async getAllAuctions() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getAllAuctions(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const auctions = output && output.toJSON();
                resolve(auctions);
            } else {
                reject(result.asErr);
            }
        });
    }

    async getPlayerQuestProgress() {
        return new Promise(async (resolve, reject) => {
            const { result, output } =
                await this.contracts.delegator.query
                    .getPlayerQuestProgress(this.alice.address, { value: 0, gasLimit: GAS_LIMIT });

            if (result.isOk) {
                const progress = output && output.toJSON();
                resolve(progress);
            } else {
                reject(result.asErr);
            }
        });
    }

    async claimQuest() {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .claimQuest({ value: 0, gasLimit: GAS_LIMIT })
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    async registerModuleSale(tokenId, price) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .registerModuleSale({ value: 0, gasLimit: GAS_LIMIT }, tokenId, price)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    async cancelModuleSale(tokenId) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .cancelModuleSale({ value: 0, gasLimit: GAS_LIMIT }, tokenId)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    async buyModuleFromMarket(seller, tokenId, price) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .buyModuleFromMarket({ value: price, gasLimit: GAS_LIMIT }, seller, tokenId)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    async destroyModule(tokenId) {
        return new Promise(async (resolve, reject) => {
            this.contracts.delegator.tx
                .destroyModule({ value: 0, gasLimit: GAS_LIMIT }, tokenId)
                .signAndSend(this.alice, ({status, dispatchError}) => {
                    if (dispatchError) {
                        reject(dispatchError);
                    }
                    if (status.isInBlock || status.isFinalized) {
                        resolve();
                    }
                });
        });
    }

    _eventDataToFightsComplete(data, accountId) {
        let fightComplete = null;

        try {
            const decoded = this.contracts.delegator.abi.decodeEvent(data);
            const attacker = decoded.args[0].toJSON();
            const defender = decoded.args[1].toJSON();
            const fightResult = decoded.args[2].toJSON();
            const payoutOrLocation = decoded.args[3].toJSON();

            fightResult.selection_lhs = Array.from(Uint8Array.from(hexToU8a(fightResult.selection_lhs)));
            fightResult.selection_rhs = Array.from(Uint8Array.from(hexToU8a(fightResult.selection_rhs)));
            fightResult.ships_lost_lhs = Array.from(Uint8Array.from(hexToU8a(fightResult.ships_lost_lhs)));
            fightResult.ships_lost_rhs = Array.from(Uint8Array.from(hexToU8a(fightResult.ships_lost_rhs)));

            if (attacker === accountId || defender === accountId) {
                fightComplete = {
                    identifier: decoded.event.identifier,
                    attackerAddress: attacker,
                    defenderAddress: defender,
                    fightResult,
                    payoutOrLocation,
                };
            }
        } catch (err) {
        }

        return fightComplete;
    }

    async getRankedFightCompleteEvents() {
        const accountId = this.alice.address;
        const lastHdr = await this.api.rpc.chain.getHeader();
        const delta = Math.min(OmegaDefaults.LOGS_LENGTH_BLOCKS, lastHdr.number.unwrap().toNumber());
        const startHdr = await this.api.rpc.chain.getBlockHash(lastHdr.number.unwrap().subn(delta));
        const events = await this.api.query.system.events.range([startHdr]);
        const fightCompleteEvents = [];

        events.forEach((record) => {
            if (_.isEmpty(record[1])) {
                return;
            }       

            _.each(record[1], (potentialEvent) => {
                const { event } = potentialEvent;
                event.data.forEach((data) => {
                    const fightComplete = this._eventDataToFightsComplete(data, accountId);
                    if (fightComplete) {
                        fightCompleteEvents.push(fightComplete);
                    }
                });
            });
        });

        return fightCompleteEvents;
    }

    async subscribeToFightCompleteEvents(callback) {
        const accountId = this.alice.address;

        return this.api.query.system.events((events) => {
            events.forEach((record) => {
                const { event } = record;
                event.data.forEach((data) => {
                    const fightComplete = this._eventDataToFightsComplete(data, accountId);
                    if (fightComplete) {
                        callback(fightComplete);
                    }
                });
            });
        });
    }
}
