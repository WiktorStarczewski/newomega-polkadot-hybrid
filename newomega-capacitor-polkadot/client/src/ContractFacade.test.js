import _ from 'underscore';
import { DefaultModule, Modules } from './definitions/Modules';
import { balanceToDisplay, blocksToTimeString, isDiscoveryFree, 
    OmegaDefaults, picoToUnits, unitsToPico } from './definitions/OmegaDefaults';
import { Targeting } from './definitions/Ships';


const { ContractFacade } = require('./facades/ContractFacade');
const MNEMONIC = '//Alice';

jest.setTimeout(600000);

let delegatorAddress;
let testStartBlockNumber = 0;

const { Deployer } = require('./facades/Deployer');
test('Deploy', async () => {
    const deployer = new Deployer();
    await deployer.initialize();

    const contract = await deployer.deployDelegator();
    console.log('Delegator address ', contract.address.toHuman());
    delegatorAddress = contract.address.toHuman();
    expect(contract).toBeDefined();
});

test('Initialize', async () => {
    const facade = new ContractFacade();
    await facade.initialize(MNEMONIC, delegatorAddress);

    expect(facade.api).toBeDefined();
    expect(facade.keyring).toBeDefined();
    expect(facade.alice).toBeDefined();
    expect(facade.contracts).toBeDefined();

    const unsubBalance = await facade.subscribeToBalance((balance) => {
        unsubBalance && unsubBalance();
    });

    const unsubFightComplete = await facade.subscribeToFightCompleteEvents((event) => {
        unsubFightComplete && unsubFightComplete();
    });

    let oldBlockNumber = null;
    let timesTried = 0;
    const unsubHeads = await facade.subscribeNewHeads((header) => {
        const blockNumber = parseInt(header.number, 10);
        oldBlockNumber !== null && expect(blockNumber).toEqual(oldBlockNumber + 1);
        oldBlockNumber = blockNumber;
        if (timesTried === 0) {
            testStartBlockNumber = blockNumber;
        }
        ++timesTried;
        if (timesTried >= 5) {
            unsubHeads();
        }
    })
});

test('Universe', async () => {
    const facade = new ContractFacade();
    await facade.initialize(MNEMONIC, delegatorAddress);
    const aliceName = 'Alice';
    const statsPreRegister = await facade.getGameStats();
    await facade.ensureDiscovery();
    await facade.universeRegisterPlayer(aliceName);
    const statsPostRegister = await facade.getGameStats();
    expect(statsPostRegister.no_players).toEqual(statsPreRegister.no_players + 1);
    const assets = await facade.getPlayerAssets();

    const freeActionsStart = await facade.getFreeActions();
    expect(freeActionsStart.discovery).toEqual(0);

    expect(assets.name).toEqual(aliceName);

    const names = await facade.getPlayerNames([facade.alice.address]);
    expect(names).toEqual([aliceName]);

    const _modules = await facade.getPlayerModules();
    expect(_modules).toBeDefined();

    const aliceRootCoords = {
        root: facade.alice.address,
        system_id: 0,
    };

    const selection = [11, 10, 10, 10];
    const modules = [null, null, null, null];
    const targeting = Targeting.Closest;
    await facade.reinforcePlanet(aliceRootCoords, 0, selection, modules, targeting);

    const aliceRootSystemResultPreRename = await facade.getSystem(aliceRootCoords);
    const aliceRootSystemPreRename = aliceRootSystemResultPreRename[0];

    expect(aliceRootSystemPreRename).toBeDefined();
    
    const planetIndex = 0;
    const renamedPlanetName = 'TestAlice';
    await facade.renamePlanet(aliceRootCoords, planetIndex, renamedPlanetName);
    await facade.upgradePlanet(aliceRootCoords, planetIndex);
    await facade.harvestPlanet(aliceRootCoords, planetIndex);
    const aliceRootSystemResult = await facade.getSystem(aliceRootCoords);
    const aliceRootSystem = aliceRootSystemResult[0];

    expect(aliceRootSystem.planets[planetIndex].name).toEqual(renamedPlanetName);
    expect(aliceRootSystem.planets[planetIndex].level).toEqual(2);

    const coordToDiscover = {
        ...aliceRootCoords,
        system_id: 1,
    };

    await facade.discoverSystem();
    const discoveredSystemResult = await facade.getSystem(coordToDiscover);
    const discoveredSystem = discoveredSystemResult[0];

    expect(discoveredSystem).toBeTruthy();
    expect(discoveredSystem.gateway_out.built).toBeFalsy();
    expect(discoveredSystem.gateway_in.built).toBeFalsy();

    const freeActionsAfterDiscovery = await facade.getFreeActions();
    if (testStartBlockNumber > OmegaDefaults.FREE_DISCOVERY_FREQUENCY_BLOCKS) {
        expect(freeActionsAfterDiscovery.discovery).not.toEqual(0);
    } else {
        expect(freeActionsAfterDiscovery.discovery).toEqual(0);
    }

    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);
    const bobName = 'Bob';
    await facadeBob.ensureDiscovery();
    await facadeBob.universeRegisterPlayer(bobName);

    await facade.buildGateway(coordToDiscover);
    const discoveredSystemAfterBuildGatewayResult = await facade.getSystem(coordToDiscover);
    const discoveredSystemAfterBuildGateway = discoveredSystemAfterBuildGatewayResult[0];
    
    expect(discoveredSystemAfterBuildGateway.gateway_out.built).toBeTruthy();
    expect(discoveredSystemAfterBuildGateway.gateway_in.built).toBeFalsy();
    expect(discoveredSystemAfterBuildGateway.gateway_out.target.root).toEqual(facadeBob.alice.address);
});

test('ProduceShips', async () => {
    const facadeAlice = new ContractFacade();
    await facadeAlice.initialize('//Alice', delegatorAddress);
    const shipsStart = await facadeAlice.getPlayerShips();
    const amounts = [10, 11, 12, 13];
    await facadeAlice.produceShips(0, amounts[0]);
    await facadeAlice.produceShips(1, amounts[1]);
    await facadeAlice.produceShips(2, amounts[2]);
    await facadeAlice.produceShips(3, amounts[3]);
    const shipsAfter = await facadeAlice.getPlayerShips();
    const shipsExpected = _.map(shipsStart, (amount, index) => {
        return amount + amounts[index];
    });
    expect(shipsAfter).toEqual(shipsExpected);
});

test('RegisterDefence', async () => {
    // Alice
    const facadeAlice = new ContractFacade();
    await facadeAlice.initialize(MNEMONIC, delegatorAddress);

    const selection = [10, 27, 43, 15];
    const modules = [null, null, null, null];
    const name = 'TestAlice';
    const targeting = Targeting.Closest;
    const value = unitsToPico(100);
    await facadeAlice.registerDefence(selection, modules, name, value, targeting);

    const defence = await facadeAlice.getOwnDefence();

    expect(defence.selection).toEqual(selection);
    expect(defence.modules).toEqual(modules);
    expect(defence.targeting).toEqual(targeting);
    expect(defence.name).toEqual(name);
    expect(defence.value).toEqual(value);

    await facadeAlice.unregisterDefence();
    await facadeAlice.registerDefence(selection, modules, name, value, targeting);

    const defenceAfterUnregister = await facadeAlice.getOwnDefence();

    expect(defenceAfterUnregister.selection).toEqual(selection);
    expect(defenceAfterUnregister.modules).toEqual(modules);
    expect(defenceAfterUnregister.targeting).toEqual(targeting);
    expect(defenceAfterUnregister.name).toEqual(name);
    expect(defenceAfterUnregister.value).toEqual(value);

    // Bob
    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);

    const selectionBob = [23, 9, 9, 5];
    const modulesBob = [null, null, null, null];
    const targetingBob = Targeting.Closest;
    const nameBob = 'TestBob';
    const valueBob = unitsToPico(100);
    await facadeBob.registerDefence(selectionBob, modulesBob, nameBob, valueBob, targetingBob);

    const defenceBob = await facadeBob.getOwnDefence();

    expect(defenceBob.selection).toEqual(selectionBob);
    expect(defenceBob.modules).toEqual(modulesBob);
    expect(defenceBob.targeting).toEqual(targetingBob);
    expect(defenceBob.name).toEqual(nameBob);
    expect(defenceBob.value).toEqual(valueBob);

    const defenders = await facadeAlice.getAllDefenders();

    expect(defenders.length >= 2).toBeTruthy();
});

test('Ranked', async () => {
    const facadeAlice = new ContractFacade();
    await facadeAlice.initialize('//Alice', delegatorAddress);

    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);

    const alicePreBoard = { ranked_wins: 0, ranked_losses: 0 };
    const bobPreBoard = { ranked_wins: 0, ranked_losses: 0 };

    const selection = [1, 0, 0, 0];
    const modules = [null, null, null, null];
    const targeting = Targeting.Closest;
    const value = unitsToPico(1);

    const attackResultBlob = await facadeAlice.attack(facadeBob.alice.address,
        selection, modules, value, targeting);
    const attackResult = attackResultBlob[0];
    const payout = attackResultBlob[1];
    expect(attackResult.seed).toBeDefined();
    expect(attackResult.lhs_dead).toBeTruthy();
    expect(attackResult.targeting_lhs.toHuman()).toEqual(targeting);
    expect(payout).toEqual(value);

    const leaderboardPost = await facadeAlice.getLeaderboard();
    const alicePost = _.findWhere(leaderboardPost, {
        address: facadeAlice.alice.address,
    });
    const bobPost = _.find(leaderboardPost, {
        address: facadeBob.alice.address,
    });
    const ownStandingAlicePost = await facadeAlice.getOwnStanding();
    expect(alicePost.ranked_wins).toEqual(ownStandingAlicePost.ranked_wins);
    expect(alicePost.ranked_losses).toEqual(ownStandingAlicePost.ranked_losses);

    const alicePostBoard = alicePost || { ranked_wins: 0, ranked_losses: 0 };
    const bobPostBoard = bobPost || { ranked_wins: 0, ranked_losses: 0 };

    expect(alicePostBoard.ranked_wins).toEqual(alicePreBoard.ranked_wins);
    expect(alicePostBoard.ranked_losses).toEqual(alicePreBoard.ranked_losses + 1);

    expect(bobPostBoard.ranked_wins).toEqual(bobPreBoard.ranked_wins + 1);
    expect(bobPostBoard.ranked_losses).toEqual(bobPreBoard.ranked_losses);

    const events = await facadeAlice.getRankedFightCompleteEvents();
    const attackEvent = _.last(events);
    expect(attackEvent.attackerAddress).toEqual(facadeAlice.alice.address);
    expect(attackEvent.defenderAddress).toEqual(facadeBob.alice.address);
});

test('Replay', async () => {
    const facade = new ContractFacade();
    await facade.initialize('//Alice', delegatorAddress);

    const seed = 1337;
    const selectionLhs = [3, 3, 3, 3];
    const selectionRhs = [16, 16, 16, 16];
    const modulesLhs = [DefaultModule, DefaultModule, DefaultModule, DefaultModule];
    const modulesRhs = [DefaultModule, DefaultModule, DefaultModule, DefaultModule];
    const targetingLhs = Targeting.Furthest;
    const targetingRhs = Targeting.Furthest;

    const result = await facade.replay(
        seed,
        selectionLhs,
        selectionRhs,
        modulesLhs,
        modulesRhs,
        targetingLhs,
        targetingRhs
    );

    expect(result.lhs_dead).toBeTruthy();
    expect(result.rhs_dead).toBeFalsy();
});

test('Crafting', async () => {
    const facade = new ContractFacade();
    await facade.initialize('//Alice', delegatorAddress);
    const modulesStart = await facade.getPlayerModules();
    expect(modulesStart.length).toEqual(0);

    const minerals = await facade.getPlayerMinerals();
    const expectedMinerals = _.map(minerals, (amount) => {
        return amount - OmegaDefaults.CRAFT_COST_RESOURCES;
    });
    const tokenCountStart = await facade.getTokenCount();
    const craftResult = await facade.craftModule();
    const [tokenIdUnparsed, moduleDefinition] = craftResult;
    const tokenIdInt = parseInt(tokenIdUnparsed, 10);
    expect(tokenIdInt).toEqual(9);
    const mineralsAfterCraft = await facade.getPlayerMinerals();
    expect(mineralsAfterCraft).toEqual(expectedMinerals);
    const tokenCountAfterCraft = await facade.getTokenCount();
    expect(tokenCountAfterCraft).toEqual(tokenCountStart + 1);

    const modulesAfterCraft = await facade.getPlayerModules();
    expect(modulesAfterCraft.length).toEqual(1);

    const moduleSalePrice = 100;
    const allAuctionsStart = await facade.getAllAuctions();
    expect(allAuctionsStart.length).toEqual(0);
    await facade.registerModuleSale(tokenIdUnparsed, moduleSalePrice);
    const allAuctionsAfterRegister = await facade.getAllAuctions();
    expect(allAuctionsAfterRegister.length).toEqual(1);
    const [seller, tokenId, price, definition] = allAuctionsAfterRegister[0];
    expect(seller).toEqual(facade.alice.address);
    expect(tokenId).toEqual(tokenIdInt);
    expect(price).toEqual(moduleSalePrice);
    expect(moduleDefinition).toEqual(definition);

    await facade.cancelModuleSale(tokenIdUnparsed);
    const allAuctionsAfterCancel = await facade.getAllAuctions();
    expect(allAuctionsAfterCancel.length).toEqual(0);
});

test('Module Market', async () => {
    const facade = new ContractFacade();
    await facade.initialize('//Alice', delegatorAddress);
    const modulesStart = await facade.getPlayerModules();
    expect(modulesStart.length).toEqual(1);
    const tokenId = 9;
    const price = 1;
    await facade.registerModuleSale(tokenId, price);
    const modulesAliceAfterRegister = await facade.getPlayerModules();
    expect(modulesAliceAfterRegister.length).toEqual(0);

    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);
    const modulesStartBob = await facadeBob.getPlayerModules();
    expect(modulesStartBob.length).toEqual(0);
    await facadeBob.buyModuleFromMarket(facade.alice.address, tokenId, price);

    const modulesBobAfterTrade = await facadeBob.getPlayerModules();
    expect(modulesBobAfterTrade.length).toEqual(1);
    const [tokenIdBob, definitionBob] = modulesBobAfterTrade[0];
    expect(tokenIdBob).toEqual(tokenId);

    const modulesAliceAfterTrade = await facade.getPlayerModules();
    expect(modulesAliceAfterTrade.length).toEqual(0);

    await facadeBob.destroyModule(tokenId);
    const modulesBobAfterDestroy = await facadeBob.getPlayerModules();
    expect(modulesBobAfterDestroy.length).toEqual(0);
});

test('Quests', async () => {
    const facade = new ContractFacade();
    await facade.initialize('//Alice', delegatorAddress);
    const progressStart = await facade.getPlayerQuestProgress();
    await facade.discoverSystem();
    const progressAfterDiscover = await facade.getPlayerQuestProgress();
    expect(progressAfterDiscover.discover).toEqual(progressStart.discover + 1);
    const map = await facade.getUniverseMap(facade.alice.address);
    const workSystem = _.last(map);

    const craftResult = await facade.craftModule();
    const [tokenIdUnparsed, moduleDefinition] = craftResult;
    const tokenIdInt = parseInt(tokenIdUnparsed, 10);
    const progressAfterCraft = await facade.getPlayerQuestProgress();
    expect(progressAfterCraft.module_craft).toEqual(progressStart.module_craft + 1);

    await facade.attackPlanet(workSystem.position, 0, [10, 10, 10, 10], 
        [tokenIdInt, tokenIdInt, tokenIdInt, tokenIdInt], Targeting.Closest);
    const progressAfterAttack = await facade.getPlayerQuestProgress();
    expect(progressAfterAttack.planet_capture).toEqual(progressStart.planet_capture + 1);

    await facade.harvestPlanet(workSystem.position, 0);
    const progressAfterHarvest = await facade.getPlayerQuestProgress();
    expect(progressAfterHarvest.planet_harvest).toEqual(progressStart.planet_harvest + 1);

    await facade.buildGateway(workSystem.position);
    const progressAfterGateway = await facade.getPlayerQuestProgress();
    expect(progressAfterGateway.build_gateway).toEqual(progressStart.build_gateway + 1);

    await facade.upgradePlanet(workSystem.position, 0);
    const progressAfterUpgrade = await facade.getPlayerQuestProgress();
    expect(progressAfterUpgrade.upgrade_planet).toEqual(progressStart.upgrade_planet + 1);

    await facade.produceShips(0, 1);
    const progressAfterShipsProduce = await facade.getPlayerQuestProgress();
    expect(progressAfterShipsProduce.produce_ships).toEqual(progressStart.produce_ships + 1);

    await facade.registerTrade(0, { amount: 1, exchange_for: 1 });
    const progressAfterRegisterTrade = await facade.getPlayerQuestProgress();
    expect(progressAfterRegisterTrade.register_mineral_trade).toEqual(progressStart.register_mineral_trade + 1);

    await facade.harvest();
    const progressAfterHarvestAll = await facade.getPlayerQuestProgress();
    expect(progressAfterHarvestAll.planet_harvest).toEqual(progressStart.planet_harvest + 2);
});

test('Mineral Trading', async () => {
    const facadeAlice = new ContractFacade();
    await facadeAlice.initialize('//Alice', delegatorAddress);

    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);

    const mineralsAliceStart = await facadeAlice.getPlayerMinerals();
    const mineralsBobStart = await facadeBob.getPlayerMinerals();

    const tradesStart = await facadeAlice.getPlayerTrades(facadeAlice.alice.address);
    const tradeWhat = 1;
    const tradeFor = 2;
    const tradeAmount = 1;
    await facadeAlice.registerTrade(tradeWhat, { amount: tradeAmount, exchange_for: tradeFor });
    const tradesAfterRegister = await facadeAlice.getPlayerTrades(facadeAlice.alice.address);
    expect(tradesAfterRegister[tradeWhat].amount).toEqual(tradeAmount);

    const mineralsAliceAfterRegister = await facadeAlice.getPlayerMinerals();
    const expectedMinerals = _.clone(mineralsAliceStart);
    expectedMinerals[tradeWhat] -= tradeAmount;
    expect(mineralsAliceAfterRegister).toEqual(expectedMinerals);

    await facadeBob.trade(facadeAlice.alice.address, tradeFor, { amount: tradeAmount, exchange_for: tradeWhat });
    const tradesAfterTrade = await facadeAlice.getPlayerTrades(facadeAlice.alice.address);
    expect(tradesAfterTrade[tradeWhat].amount).toEqual(tradesStart[tradeWhat].amount);

    const mineralsAliceAfterTrade = await facadeAlice.getPlayerMinerals();
    const mineralsBobAfterTrade = await facadeBob.getPlayerMinerals();

    const expectedMineralsAlice = _.clone(mineralsAliceStart);
    const expectedMineralsBob = _.clone(mineralsBobStart);
    expectedMineralsAlice[tradeWhat] -= tradeAmount;
    expectedMineralsAlice[tradeFor] += tradeAmount;
    expectedMineralsBob[tradeWhat] += tradeAmount;
    expectedMineralsBob[tradeFor] -= tradeAmount;

    expect(mineralsAliceAfterTrade).toEqual(expectedMineralsAlice);
    expect(mineralsBobAfterTrade).toEqual(expectedMineralsBob);
});

test('Defaults', async () => {
    const oneUnitInPico = 1000000 * 1000000;
    expect(picoToUnits(oneUnitInPico)).toEqual(1);
    expect(unitsToPico(picoToUnits(oneUnitInPico))).toEqual(oneUnitInPico);
    expect(balanceToDisplay(oneUnitInPico)).toEqual('1');
    expect(blocksToTimeString(1)).toEqual('00:00:03');
    expect(isDiscoveryFree(100, 95)).toEqual(false);
});