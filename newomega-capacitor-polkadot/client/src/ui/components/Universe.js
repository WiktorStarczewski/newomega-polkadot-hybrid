import React, { useEffect, useState } from 'react';
import './Universe.css';
import { System } from './System';
import { SystemInfo } from './SystemInfo';
import { SystemActions } from './SystemActions';
import { Minerals } from './Minerals';
import { ShipProduction } from './ShipProduction';
import { UniverseMap } from './UniverseMap';
import { LoadingMask } from './LoadingMask';
import { LoadingScreen } from './LoadingScreen';
import { CompactShipSelection } from '../../scenes/CompactShipSelection';
import { Combat } from '../../scenes/Combat';
import _ from 'underscore';
import LinearProgress from '@material-ui/core/LinearProgress';
import { GiSpaceship } from 'react-icons/gi';
import { GiRingedPlanet } from 'react-icons/gi';
import { GiMinerals } from 'react-icons/gi';
import { ImMap } from 'react-icons/im';
import Tour from 'reactour';


// props: facade, playerName, isTourOpen, setIsTourOpen, balance, blockNumber
export const Universe = (props) => {
    const [coords, setCoords] = useState(props.startWithSystem || {
        root: props.facade.alice.address,
        system_id: 0,
    });
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [system, setSystem] = useState(null);
    const [universe, setUniverse] = useState(null);
    const [names, setNames] = useState(null);
    const [minerals, setMinerals] = useState(null);
    const [ownTrades, setOwnTrades] = useState(null);
    const [freeActions, setFreeActions] = useState(null);
    const [playerShips, setPlayerShips] = useState(null);
    const [systemTrades, setSystemTrades] = useState(null);
    const [planetExpanded, setPlanetExpanded] = useState(false);
    const [mineralExpanded, setMineralExpanded] = useState(false);
    const [shipExpanded, setShipExpanded] = useState(false);
    const [attackingSystem, setAttackingSystem] = useState(null);
    const [reinforcingSystem, setReinforcingSystem] = useState(null);
    const [attackingPlanetId, setAttackingPlanetId] = useState(null);
    const [reinforcingPlanetId, setReinforcingPlanetId] = useState(null);
    const [replayingCombat, setReplayingCombat] = useState(null);
    const [isAttackable, setIsAttackable] = useState(false);
    const [isEmbassyOpen, setIsEmbassyOpen] = useState(false);
    const [isShipProductionOpen, setIsShipProductionOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [needsPlanetsOpen, setNeedsPlanetsOpen] = useState(false);
    const [playerModules, setPlayerModules] = useState(null);

    const reload = () => {
        setCoords(_.clone(coords));
    }

    const loadSystem = async () => {
        const result = await props.facade.getSystem(coords);
        return result;
    };

    const changeSystem = async (_coords) => {
        setNeedsPlanetsOpen(true);
        setCoords(_coords);
    };

    const loadUniverse = async (_system) => {
        const _universe = await props.facade.getUniverseMap(_system.position.root);
        return _universe;
    };

    const loadNames = async (players) => {
        const _names = await props.facade.getPlayerNames(players);
        return _names;
    }

    const loadTrades = async (player) => {
        const _trades = await props.facade.getPlayerTrades(player);
        return _trades;
    }

    const loadPlayerShips = async () => {
        const _ships = await props.facade.getPlayerShips();
        return _ships;
    }

    const loadFreeActions = async () => {
        const _actions = await props.facade.getFreeActions();
        return _actions;
    }

    const loadPlayerModules = async () => {
        const _modules = await props.facade.getPlayerModules();
        return _modules;
    }
    
    const loadPlayerMinerals = async () => {
        const _minerals = await props.facade.getPlayerMinerals();
        return _minerals;
    }

    const discoverSystem = async (isFree) => {
        if (system.position.root !== props.facade.alice.address) {
            return;
        }
        setLoading(true);
        await props.facade.discoverSystem(isFree);
        reload();
    };

    const teleportGateway = async (newCoords) => {
        setCoords(newCoords);
    };

    const buildGateway = async () => {
        setLoading(true);
        await props.facade.buildGateway(coords);
        reload();
    };

    const harvestPlanet = async (system, planetId) => {
        setLoading(true);
        await props.facade.harvestPlanet(system.position, planetId);
        reload();
    };

    const harvestAll = async () => {
        setLoading(true);
        await props.facade.harvest();
        reload();
    };

    const trade = async (tradeWhat, tradeFor, amount) => {
        setLoading(true);
        await props.facade.trade(system.position.root, tradeWhat, {
            exchange_for: tradeFor,
            amount,
        });
        reload();
    };

    const registerSale = async (tradeWhat, tradeFor, amount) => {
        setLoading(true);
        await props.facade.registerTrade(tradeWhat, {
            exchange_for: tradeFor,
            amount,
        });
        reload();
    };

    const attackPlanet = async (system, planetId) => {
        setLoading(true);
        setAttackingPlanetId(planetId);
        setAttackingSystem(system);
    };

    const reinforcePlanet = async (system, planetId) => {
        setLoading(true);
        setReinforcingPlanetId(planetId);
        setReinforcingSystem(system);
    };

    const renamePlanet = async (system, planetId, name) => {
        setLoading(true);
        await props.facade.renamePlanet(system.position, planetId, name);
        reload();
    }

    const upgradePlanet = async (system, planetId) => {
        setLoading(true);
        await props.facade.upgradePlanet(system.position, planetId);
        reload();
    }

    const produceShips = async (ship_id, amount) => {
        setLoading(true);
        await props.facade.produceShips(ship_id, amount);
        reload();
    };

    const attackPlanetAfterSelection = async (selection, modules, bet, targeting) => {
        const _attackingSystem = _.clone(attackingSystem);
        const _attackingPlanetId = _.clone(attackingPlanetId);

        setAttackingSystem(null);
        setAttackingPlanetId(null);

        const result = await props.facade.attackPlanet(
            _attackingSystem.position,
            _attackingPlanetId,
            selection,
            modules,
            targeting);

        const replayResult = await props.facade.replay(
            result.seed,
            result.selection_lhs,
            result.selection_rhs,
            result.modules_lhs,
            result.modules_rhs,
            result.targeting_lhs,
            result.targeting_rhs);

        setReplayingCombat(replayResult);
    };

    const reinforcePlanetAfterSelection = async (selection, modules, bet, targeting) => {
        const _reinforcingSystem = _.clone(reinforcingSystem);
        const _reinforcingPlanetId = _.clone(reinforcingPlanetId);

        setReinforcingSystem(null);
        setReinforcingPlanetId(null);

        await props.facade.reinforcePlanet(
            _reinforcingSystem.position,
            _reinforcingPlanetId,
            selection,
            modules,
            targeting);

        reload();
    };

    const cancelAttackingPlanet = () => {
        setAttackingSystem(null);
        setAttackingPlanetId(null);
        setReplayingCombat(null);
        reload();
    };

    const cancelReinforcingPlanet = () => {
        setReinforcingSystem(null);
        setReinforcingPlanetId(null);
        reload();
    };

    const embassyOpen = () => {
        setIsEmbassyOpen(true);
        setIsShipProductionOpen(false);
        setIsMapOpen(false);
        setPlanetExpanded(false);
        setShipExpanded(false);
        setMineralExpanded(false);
    };

    const planetsOpen = () => {
        setIsEmbassyOpen(false);
        setIsShipProductionOpen(false);
        setIsMapOpen(false);
        setPlanetExpanded(false);
        setMineralExpanded(false);
        setShipExpanded(false);
    };

    const mapOpen = () => {
        setIsEmbassyOpen(false);
        setIsShipProductionOpen(false);
        setMineralExpanded(false);
        setShipExpanded(false);  
        setPlanetExpanded(false);
        setIsMapOpen(true);      
    };

    const shipProductionOpen = () => {
        setIsShipProductionOpen(true);
        setIsEmbassyOpen(false);
        setIsMapOpen(false);
        setPlanetExpanded(false);
        setMineralExpanded(false);
    };

    const tourSteps = [
        {
            selector: '.universeModeMap',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Map View
                    </h3>
                    <h5>
                        Universe has 4 main view modes, Map, System, Minerals and Ships, and you can change them here.
                    </h5>
                    <h4>
                        Map view shows the area you discovered so far. Since Universe is infinite, you can keep discovering Systems, adding to your territory. You can view any System you control by tapping on it on the map.
                    </h4>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: mapOpen,
        },
        {
            selector: '.universeModePlanets',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        System View
                    </h3>
                    <h5>
                        Universe has 4 main view modes, Ships, System and Minerals, and you can change them here.
                    </h5>
                    <h4>
                        System view shows the planets in the current System you're viewing. All Planet related actions you perform here.
                    </h4>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: planetsOpen,
        },
        {
            selector: '.universeModeResources',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Minerals View
                    </h3>
                    <h5>
                        Universe has 4 main view modes, Ships, System and Minerals, and you can change them here.
                    </h5>
                    <h4>
                        Minerals view shows all the minerals you have, and you can trade them with other players here.
                    </h4>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: embassyOpen,
        },
        {
            selector: '.universeModeShips',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Ships View
                    </h3>
                    <h5>
                        Universe has 4 main view modes, Ships, System and Minerals, and you can change them here.
                    </h5>
                    <h4>
                        Ships view shows all the ships you have, and you can produce them here using minerals.
                    </h4>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: shipProductionOpen,
        },
        {
            selector: '.SystemActions',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Gateways and Portals
                    </h3>
                    <h5>
                        You can build a Gateway in every system you own. Gateways, when built, create Portals in random Systems in the Galaxy, that allow access for ships and enable trading. These Systems always belong to other players.
                    </h5>
                    <h5>
                        Gateways are bi-directional: By opening a route to another player, you will be allowing their ships to travel to your Universe as well. That includes military action!
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: planetsOpen,
        },
        {
            selector: '.SystemInfo',
            content: ({ close }) => (
                <div>
                    <h3>
                        Quick Information
                    </h3>
                    <h4>
                        Finally, this panel provides basic information at a glance, including the System you're in and number of Minerals and Ships you own.
                    </h4>
                    <div className="tourButton" onClick={close}>Got it!</div>
                </div>
            ),
            action: planetsOpen,
        },
    ];    

    useEffect(() => {
        props.startWithSystem && setCoords(props.startWithSystem);
    }, [props.startWithSystem]);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            const result = await loadSystem();
            const _system = result[0];
            const _isAttackable = result[1];

            const _universe = await loadUniverse(_system);
            const accountsToTranslate = _.pluck(_system.planets, 'owner');
            accountsToTranslate.push(_system.position.root);

            if (_system.gateway_in.built) {
                accountsToTranslate.push(_system.gateway_in.target.root);
            }
            if (_system.gateway_out.built) {
                accountsToTranslate.push(_system.gateway_out.target.root);
            }

            const uniqueAccountsToTranslate = _.uniq(accountsToTranslate);

            const _names = await loadNames(uniqueAccountsToTranslate);
            const _minerals = await loadPlayerMinerals();
            const _trades = await loadTrades(props.facade.alice.address);
            const _systemTrades = await loadTrades(_system.position.root);
            const _ships = await loadPlayerShips();
            const _freeActions = await loadFreeActions();
            const _playerModules = await loadPlayerModules();

            setUniverse(_universe);
            setSystem(_system);
            setIsAttackable(_isAttackable);
            setNames(_.object(uniqueAccountsToTranslate, _names));
            setMinerals(_minerals);
            setOwnTrades(_trades);
            setSystemTrades(_systemTrades);
            setPlayerShips(_ships);
            setFreeActions(_freeActions);
            setPlayerModules(_playerModules);

            setInitialLoading(false);
            setLoading(false);

            if (needsPlanetsOpen) {
                planetsOpen();
                setNeedsPlanetsOpen(false);
            }    
        }

        fetchData();
    }, [props.facade, coords]);

    const loadableComponentClassName = 'loadableComponent' +
        (loading ? ' loading' : '');
    const getExpandableClassName = (cl) => {
        return cl + (planetExpanded || mineralExpanded || shipExpanded || isMapOpen ? ' expanded' : '');
    };
    const getShrankClassName = (cl) => {
        return cl + (planetExpanded || mineralExpanded || shipExpanded || isMapOpen ? ' shrank' : '');
    };
    const mainClassName = 'Universe' 
        + (initialLoading ? ' loading' : '')
        + (isEmbassyOpen ? ' withMinerals' : '')
        + (isShipProductionOpen ? ' withShipProduction' : '')
        + (isMapOpen ? ' withMap' : '')
        + (reinforcingSystem || attackingSystem || replayingCombat ? ' fullScreen' : '');

    return (
        <div className={mainClassName}>
            {loading && !initialLoading && <LinearProgress/>}
            <React.Fragment>
                {initialLoading &&
                    <LoadingScreen loading={initialLoading}/>}
                {!initialLoading && 
                    <Tour
                        steps={tourSteps}
                        isOpen={props.isTourOpen}
                        onRequestClose={() => props.setIsTourOpen(false)}
                    />
                }
                {!initialLoading &&
                    <SystemInfo
                        system={system}
                        names={names}
                        minerals={minerals}
                        playerShips={playerShips}
                        alice={props.facade.alice.address}
                    />
                }
                {!initialLoading &&
                    <div className="universeModes">
                        <ImMap
                            onClick={mapOpen}
                            className={'universeModeChange universeModeMap ' + (isMapOpen ? 'active' : '')}
                        />
                        <GiRingedPlanet 
                            onClick={planetsOpen}
                            className={'universeModeChange universeModePlanets ' + (!isEmbassyOpen && !isShipProductionOpen && !isMapOpen ? 'active' : '')}
                            />
                        <GiMinerals 
                            onClick={embassyOpen}
                            className={'universeModeChange universeModeResources '+ (isEmbassyOpen ? 'active' : '')}
                            />
                        <GiSpaceship
                            onClick={shipProductionOpen}
                            className={'universeModeChange universeModeShips ' + (isShipProductionOpen ? 'active' : '')}
                        />
                    </div>
                }
                {!initialLoading &&
                    <div className={loadableComponentClassName}>
                        <System
                            system={system}
                            names={names}
                            alice={props.facade.alice.address}
                            blockNumber={props.blockNumber}
                            planetExpanded={planetExpanded}
                            setPlanetExpanded={setPlanetExpanded}
                            onAttackPlanet={attackPlanet}
                            onReinforcePlanet={reinforcePlanet}
                            onRenamePlanet={renamePlanet}
                            onHarvestPlanet={harvestPlanet}
                            onHarvestAll={harvestAll}
                            onUpgradePlanet={upgradePlanet}
                            isAttackable={isAttackable}
                            balance={props.balance}
                        />
                        {loading && <LoadingMask
                            emulateClassName={getExpandableClassName('System')}/>}
                    </div>
                }
                {!initialLoading &&
                    <div className={loadableComponentClassName}>
                        <Minerals
                            minerals={minerals}
                            mineralExpanded={mineralExpanded}
                            setMineralExpanded={setMineralExpanded}
                            onClose={planetsOpen}
                            system={system}
                            ownTrades={ownTrades}
                            systemTrades={systemTrades}
                            alice={props.facade.alice.address}
                            onTrade={trade}
                            onRegisterSale={registerSale}
                        />
                        {loading && <LoadingMask
                            emulateClassName={getExpandableClassName('Minerals')}/>}
                    </div>
                }
                {!initialLoading &&
                    <div className={loadableComponentClassName}>
                        <ShipProduction
                            minerals={minerals}
                            playerShips={playerShips}
                            shipExpanded={shipExpanded}
                            setShipExpanded={setShipExpanded}
                            onClose={planetsOpen}
                            onProduce={produceShips}
                        />
                        {loading && <LoadingMask
                            emulateClassName={getExpandableClassName('ShipProduction')}/>}
                    </div>
                }
                {!initialLoading &&
                    <div className={loadableComponentClassName}>
                        <UniverseMap
                            blockNumber={props.blockNumber}
                            freeActions={freeActions}
                            alice={props.facade.alice.address}
                            balance={props.balance}
                            system={system}
                            systemCoords={coords}
                            universe={universe}
                            onLoadSystem={changeSystem}
                            onDiscoverSystem={discoverSystem}
                        />
                        {loading && <LoadingMask
                            emulateClassName={getExpandableClassName('UniverseMap')}/>}
                    </div>
                }
                {!initialLoading &&
                    <div className={loadableComponentClassName}>
                        <SystemActions
                            system={system}
                            names={names}
                            alice={props.facade.alice.address}
                            onTeleportGateway={teleportGateway}
                            onBuildGateway={buildGateway}
                            planetExpanded={planetExpanded || mineralExpanded || shipExpanded || isMapOpen}
                        />
                        {loading && <LoadingMask
                            emulateClassName={getShrankClassName('SystemActions')}/>}
                    </div>
                }
            </React.Fragment>
            {attackingSystem &&
                <CompactShipSelection
                    enemyShips={attackingSystem.planets[attackingPlanetId].selection}
                    playerModules={playerModules}
                    playerShips={playerShips}
                    onDone={attackPlanetAfterSelection}
                    onCancel={cancelAttackingPlanet}
                />
            }
            {reinforcingSystem &&
                <CompactShipSelection
                    onDone={reinforcePlanetAfterSelection}
                    onCancel={cancelReinforcingPlanet}
                    defaultShips={reinforcingSystem.planets[reinforcingPlanetId].selection}
                    playerModules={playerModules}
                    defaultModules={reinforcingSystem.planets[reinforcingPlanetId].modules}
                    defaultTargeting={reinforcingSystem.planets[reinforcingPlanetId].targeting}
                    playerShips={playerShips}
                    isTourOpen={props.isTourOpen}
                    setIsTourOpen={props.setIsTourOpen}
                />
            }
            {replayingCombat &&
                <Combat
                    result={replayingCombat}
                    onCancel={cancelAttackingPlanet}
                />
            }
        </div>
    );
};
