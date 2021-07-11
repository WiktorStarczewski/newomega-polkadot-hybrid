import _ from 'underscore';
import { Modules } from './definitions/Modules';
import { Targeting } from './definitions/Ships';


const BLOCK_LENGTH = 8000;

const { ContractFacade } = require('./facades/ContractFacade');
const MNEMONIC = '//Alice';

jest.setTimeout(50000);

let delegatorAddress;

// const { Deployer } = require('./facades/Deployer');
// test('Deploy', async () => {
//     const deployer = new Deployer();
//     await deployer.initialize();

//     return deployer.deployDelegator().then((contract) => {
//         console.log('Delegator address ', contract.address.toHuman());
//         delegatorAddress = contract.address.toHuman();
//         expect(contract).toBeDefined();
//     });
// });

test('Initialize', async () => {
    const facade = new ContractFacade();
    await facade.initialize(MNEMONIC, delegatorAddress);

    expect(facade.api).toBeDefined();
    expect(facade.keyring).toBeDefined();
    expect(facade.alice).toBeDefined();
    expect(facade.contracts).toBeDefined();
});

test('RegisterDefence', async () => {
    // Alice
    const facadeAlice = new ContractFacade();
    await facadeAlice.initialize(MNEMONIC, delegatorAddress);
    await facadeAlice.unregisterDefence();

    const selection = [10, 27, 43, 15];
    const modules = [Modules[0].stats, Modules[1].stats, Modules[0].stats, Modules[1].stats];
    const name = 'TestAlice';
    const targeting = Targeting.Closest;
    const value = 1000;
    await facadeAlice.registerDefence(selection, modules, name, value, targeting);
    await new Promise((r) => setTimeout(r, BLOCK_LENGTH));

    const defence = await facadeAlice.getOwnDefence();

    expect(defence.selection).toEqual(selection);
    expect(defence.modules).toEqual(modules);
    expect(defence.targeting).toEqual(targeting);
    expect(defence.name).toEqual(name);
    expect(defence.value).toEqual(value);

    // Bob
    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);

    const selectionBob = [23, 9, 9, 5];
    const modulesBob = [Modules[1].stats, Modules[0].stats, Modules[1].stats, Modules[1].stats]
    const targetingBob = Targeting.Closest;
    const nameBob = 'TestBob';
    const valueBob = 1000;
    await facadeBob.unregisterDefence();
    await facadeBob.registerDefence(selectionBob, modulesBob, nameBob, valueBob, targetingBob);
    await new Promise((r) => setTimeout(r, BLOCK_LENGTH));

    const defenceBob = await facadeBob.getOwnDefence();

    expect(defenceBob.selection).toEqual(selectionBob);
    expect(defenceBob.modules).toEqual(modulesBob);
    expect(defenceBob.targeting).toEqual(targetingBob);
    expect(defenceBob.name).toEqual(nameBob);
    expect(defenceBob.value).toEqual(valueBob);

    const defenders = await facadeAlice.getAllDefenders();

    expect(defenders.length >= 2).toBeTruthy();
});

test('Attack', async () => {
    const facadeAlice = new ContractFacade();
    await facadeAlice.initialize('//Alice', delegatorAddress);

    const facadeBob = new ContractFacade();
    await facadeBob.initialize('//Bob', delegatorAddress);

    const leaderboardPre = await facadeAlice.getLeaderboard();
    const alicePre = _.findWhere(leaderboardPre, {
        address: facadeAlice.alice.address,
    });
    const bobPre = _.findWhere(leaderboardPre, {
        address: facadeBob.alice.address,
    });
    const alicePreBoard = alicePre || { ranked_wins: 0, ranked_losses: 0 };
    const bobPreBoard = bobPre || { ranked_wins: 0, ranked_losses: 0 };

    const selection = [1, 0, 0, 0];
    const modules = [Modules[0].stats, Modules[1].stats, Modules[0].stats, Modules[1].stats];
    const targeting = Targeting.Closest;
    const value = 10;

    const attackResultBlob = await facadeAlice.attack(facadeBob.alice.address,
        selection, modules, value, targeting);
    const attackResult = attackResultBlob[0];
    const payout = attackResultBlob[1];
    expect(attackResult.seed).toBeDefined();
    expect(attackResult.lhs_dead).toBeTruthy();
    expect(attackResult.targeting_lhs.toHuman()).toEqual(targeting);
    expect(payout).toEqual(value);

    await new Promise((r) => setTimeout(r, BLOCK_LENGTH));

    const leaderboardPost = await facadeAlice.getLeaderboard();
    const alicePost = _.findWhere(leaderboardPost, {
        address: facadeAlice.alice.address,
    });
    const bobPost = _.find(leaderboardPost, {
        address: facadeBob.alice.address,
    });

    const alicePostBoard = alicePost || { ranked_wins: 0, ranked_losses: 0 };
    const bobPostBoard = bobPost || { ranked_wins: 0, ranked_losses: 0 };

    expect(alicePostBoard.ranked_wins).toEqual(alicePreBoard.ranked_wins);
    expect(alicePostBoard.ranked_losses).toEqual(alicePreBoard.ranked_losses + 1);

    expect(bobPostBoard.ranked_wins).toEqual(bobPreBoard.ranked_wins + 1);
    expect(bobPostBoard.ranked_losses).toEqual(bobPreBoard.ranked_losses);
});

test('Replay', async () => {
    const facade = new ContractFacade();
    await facade.initialize('//Alice', delegatorAddress);

    const seed = 1337;
    const selectionLhs = [3, 3, 3, 3];
    const selectionRhs = [16, 16, 16, 16];
    const modulesLhs = [Modules[0].stats, Modules[1].stats, Modules[0].stats, Modules[1].stats];
    const modulesRhs = [Modules[1].stats, Modules[0].stats, Modules[1].stats, Modules[0].stats];
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

test('Universe', async () => {
    const facade = new ContractFacade();
    await facade.initialize('//Alice', delegatorAddress);
    const aliceName = 'Alice';
    await facade.universeRegisterPlayer(aliceName);
    const assets = await facade.getPlayerAssets();

    expect(assets.name).toEqual(aliceName);

    const aliceMap = await facade.getUniverseMap(facade.alice.address);
    const aliceRootCoords = {
        root: facade.alice.address,
        position_x: 0,
        position_y: 0,
    };
    
    const planetIndex = 0;
    const renamedPlanetName = 'TestAlice';
    await facade.renamePlanet(aliceRootCoords, planetIndex, renamedPlanetName);
    const aliceRootSystemResult = await facade.getSystem(aliceRootCoords);
    const aliceRootSystem = aliceRootSystemResult[0];

    console.log(aliceRootSystem);

    expect(aliceRootSystem.planets[planetIndex].name).toEqual(renamedPlanetName);

    const furthestEastSystem = _.last(_.sortBy(aliceMap, (system) => {
        return system.position.position_x;
    }));
    const coordToDiscover = {
        ...furthestEastSystem.position,
        position_x: furthestEastSystem.position.position_x + 1,
    };

    await facade.discoverSystem(coordToDiscover);
    const discoveredSystemResult = await facade.getSystem(coordToDiscover);
    const discoveredSystem = discoveredSystemResult[0];

    expect(discoveredSystem).toBeTruthy();
    expect(discoverSystem.gateway_out.built).toBeFalsy();
    expect(discoverSystem.gateway_in.built).toBeFalsy();

    await facade.buildGateway(coordToDiscover);
    const discoveredSystemAfterBuildGatewayResult = await facade.getSystem(coordToDiscover);
    const discoveredSystemAfterBuildGateway = discoveredSystemAfterBuildGatewayResult[0];
    
    expect(discoveredSystemAfterBuildGateway.gateway_out.built).toBeTruthy();
    expect(discoveredSystemAfterBuildGateway.gateway_in.built).toBeFalsy();
});