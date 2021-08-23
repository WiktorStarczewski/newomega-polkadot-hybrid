import './App.css';
import React, { useEffect, useState, useRef } from 'react';
import { Plugins } from '@capacitor/core';
import _ from 'underscore';
import { ContractFacade } from './facades/ContractFacade';
import { CompactShipSelection } from './scenes/CompactShipSelection';
import { Combat } from './scenes/Combat';
import { OmegaDefaults, picoToUnits, unitsToPico } from './definitions/OmegaDefaults';
import { LoginScreen } from './ui/LoginScreen';
import { LoadingScreen } from './ui/components/LoadingScreen';
import { Settings } from './ui/Settings';
import { RankedCombat } from './ui/components/RankedCombat';
import { Universe } from './ui/components/Universe';
import Drawer from '@material-ui/core/Drawer';
import Snackbar from '@material-ui/core/Snackbar';
import SettingsIcon from '@material-ui/icons/Settings';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import PriorityHighIcon from '@material-ui/icons/PriorityHigh';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import CloseIcon from '@material-ui/icons/Close';
import Rotate90DegreesCcwIcon from '@material-ui/icons/Rotate90DegreesCcw';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import Tour from 'reactour';
import { ManageModules } from './ui/components/ManageModules';
import { QuestProgress } from './ui/components/QuestProgress';
import { LogViewer } from './ui/components/LogViewer';


const { Storage, App } = Plugins;

const Modes = {
    LoginScreen: 1,
    MainScreen: 2,
    ShipSelection: 3,
    Combat: 4,
    OpponentSelection: 5,
    Settings: 6,
    RankedCombat: 7,
    Universe: 8,
    TapToStart: 9,
    Crafting: 10,
};

const tourSteps = [
    {
        selector: '.mainMenu .mainMenuItem:nth-child(1)',
        content: ({ goTo, step }) => (
            <div>
                <h3>
                    Universe
                </h3>
                <h4>
                    Colonise your own personal piece of space! Conquer planets, harvest minerals, produce ships and connect to other players.
                </h4>
                <div className="tourButton" onClick={() => goTo(step)}>Next</div>
            </div>
        ),
    },
    {
        selector: '.mainMenu .mainMenuItem:nth-child(2)',
        content: ({ goTo, step }) => (
            <div>
                <h3>
                    Modules
                </h3>
                <h4>
                    Craft ship Modules and trade them with other players. Modules are ship extensions which make them more powerful. They are unique and issued as NFTs.
                </h4>
                <div className="tourButton" onClick={() => goTo(step)}>Next</div>
            </div>
        ),
    },
    {
        selector: '.mainMenu .mainMenuItem:nth-child(3)',
        content: ({ goTo, step }) => (
            <div>
                <h3>
                    Ranked Combat
                </h3>
                <h4>
                    Test your strategies and win NOT tokens by competing against other players fleets in a ranked system. You have unlimited ships in this mode and you can not lose them.
                </h4>
                <div className="tourButton" onClick={() => goTo(step)}>Next</div>
            </div>
        ),
    },
    {
        selector: '.questsButton',
        content: ({ goTo, step }) => (
            <div>
                <h3>
                    Tasks
                </h3>
                <h4>
                    Tasks are a great way to earn free NOT tokens! You can turn them in around once every 24 hours. Make sure not to miss any!
                </h4>
                <div className="tourButton" onClick={() => goTo(step)}>Next</div>
            </div>
        ),
    },
    {
        selector: '.logsButton',
        content: ({ close }) => (
            <div>
                <h3>
                    Logs
                </h3>
                <h4>
                    If you fought in the last 8 hours, it will show in the Logs and you can replay it. If you get attacked while online, this icon will start blinking to indicate this.
                </h4>
                <div className="tourButton" onClick={close}>Got it!</div>
            </div>
        ),
    },
];

export const OmegaApp = (props) => {
    const [mode, setMode] = useState(Modes.TapToStart);
    const [mainBalance, setMainBalance] = useState(0);
    const blockNumber = useRef(0);
    const [contractFacade, setContractFacade] = useState(null);
    const [toastOpen, setToastOpen] = useState(false);
    const [toastContent, setToastContent] = useState('');
    const [playerName, setPlayerName] = useState(null);
    const [musicPaused, setMusicPaused] = useState(false);
    const [stats, setStats] = useState(null);
    const [tokenCount, setTokenCount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [opponentSelection, setOpponentSelection] = useState(null);
    const [selfSelection, setSelfSelection] = useState(null);
    const [opponentBalance, setOpponentBalance] = useState(null);
    const [selfModules, setSelfModules] = useState(null);
    const [playerModules, setPlayerModules] = useState(null);
    const [fightResult, setFightResult] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [payout, setPayout] = useState(null);
    const [selfDefence, setSelfDefence] = useState(null);
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [isIntroTourOpen, setIsIntroTourOpen] = useState(false);
    const [questPanelOpen, setQuestPanelOpen] = useState(false);
    const [logPanelOpen, setLogPanelOpen] = useState(false);
    const [startWithSystem, setStartWithSystem] = useState(null);
    const [underAttack, setUnderAttack] = useState(false);
    const audio = useRef(null);


    useEffect(() => {
        return () => {
            audio.current && audio.current.pause();
        };
    }, []);

    const introTourSteps = [
        {
            selector: '.settingsWrapper .helpButton',
            content: ({ close }) => (
                <div>
                    <h3>
                        Help System
                    </h3>
                    <h4>
                        Tap this button on any screen to see the tutorial for it. 
                    </h4>
                    <h4>
                        Have a great game!
                    </h4>
                    <div className="tourButton" onClick={async () => {
                        close();
                        await markIntroTourDone();
                    }}> 
                        Got it!
                    </div>
                </div>
            ),
        },
    ];

    const startMusic = () => {
        if (audio.current) {
            return;
        }

        audio.current = new Audio('assets/music/bensound-scifi.mp3');
        audio.current.loop = true;
        audio.current.addEventListener('canplaythrough', event => {
            audio.current.play();
        });
    }

    const toggleMusic = () => {
        if (!audio.current) {
            return;
        }

        if (audio.current.paused) {
            audio.current.play();
        } else {
            audio.current.pause();
        }
        
        setMusicPaused(!musicPaused);
    }

    const appMinimized = () => {
        audio.current && audio.current.pause();
    }

    const appMaximized = () => {
        if (!musicPaused) {
            audio.current && audio.current.play();
        }
    }

    const getPlayerName = async () => {
        const name = await Storage.get({ key: 'OmegaPlayerName' });
        return name.value || OmegaDefaults.PLAYER_NAME;
    }

    const logout = async () => {
        await Storage.remove({ key: 'OmegaPlayerName' });
        await Storage.remove({ key: 'OmegaIntroTourDone' });
        await Storage.remove({ key: 'OmegaMnemonic' });
        setMode(Modes.LoginScreen);
    }

    /**
     * Handler for the player name change action.
     */
    const handlePlayerNameChange = async (e) => {
        const _playerName = e.target.value;
        await Storage.set({ key: 'OmegaPlayerName', value: _playerName });
        setPlayerName(_playerName);
    }

    const checkIntroTour = async () => {
        const introTourDone = await Storage.get({ key: 'OmegaIntroTourDone' });
        if (!introTourDone.value) {
            setIsIntroTourOpen(true);
        }
    }

    const markIntroTourDone = async () => {
        await Storage.set({ key: 'OmegaIntroTourDone', value: true });
    }

    const onToastClose = () => {
        setToastOpen(false);
        setToastContent('');
    }

    const onLoginDone = (options) => {
        setLoading(true);

        _.defer(async () => {
            const result = await options.finisher();
            const name = result[1];

            if (name) {
                handlePlayerNameChange({
                    target: {
                        value: name,
                    },
                });
            }

            App.addListener('appStateChange', (state) => {
                if (state.isActive) {
                    appMaximized();
                } else {
                    appMinimized();
                }
            });

            _initWeb3(result[0]);
        });
    }

    const showSettings = () => {
        setMode(Modes.Settings);
    }

    const genericCancelHandler = () => {
        setMode(Modes.MainScreen);
    }

    const openRankedHandler = () => {
        setMode(Modes.RankedCombat);
    }

    const _formatBalance = (balance) => {
        return balance && balance.toHuman();
    }

    /**
     * Initializes Web3 environment from a mnemonic.
     * Moves to the main screen stage.
     */
    const _initWeb3 = async (mnemonic) => {
        setLoading(true);

        const facade = new ContractFacade();
        await facade.initialize(mnemonic);
        await _checkBalance(facade);
        const _playerName = await getPlayerName();

        await facade.subscribeToBalance(async () => {
            await _checkBalance(facade);
        });

        try {
            await facade.ensureDiscovery();
            await facade.universeRegisterPlayer(_playerName);
        } catch (error) {
            // Assuming player is registered already
        }

        const _stats = await facade.getGameStats();
        setStats(_stats);
        const _tokenCount = await facade.getTokenCount();
        setTokenCount(_tokenCount);

        facade.api.derive.chain.subscribeNewHeads((header) => {
            blockNumber.current = header.number;
        });

        facade.subscribeToFightCompleteEvents((event) => {
            if (event.defenderAddress === facade.alice.address) {
                setUnderAttack(true);
            }
        });

        setContractFacade(facade);
        setPlayerName(_playerName);
        setLoading(false);
        setMode(Modes.MainScreen);

        setTimeout(() => {
            checkIntroTour();
        }, 750);
    }

    /**
     * Checks balance for current account.
     */
    const _checkBalance = async (facade) => {
        // eslint-disable-next-line no-unused-vars
        const { _nonce, data: balance } = await facade.api.query.system.account(facade.alice.address);
        setMainBalance(balance.free);
    }

    const replayFightResult = async (metaResult, _payout) => {
        setLoading(true);

        let result;

        try {
            result = await contractFacade.replay(
                metaResult.seed,
                metaResult.selection_lhs,
                metaResult.selection_rhs,
                metaResult.modules_lhs,
                metaResult.modules_rhs,
                metaResult.targeting_lhs,
                metaResult.targeting_rhs);
        } catch (error) {
            console.log(error);
            setToastContent('Transaction failed (Replay Fight).');
            setToastOpen(true);
            setMode(Modes.MainScreen);
        }

        setSelfSelection(result.selection_lhs);
        setOpponentSelection(result.selection_rhs);
        setFightResult(result);
        setLoading(false);
        setPayout(_payout);
        setMode(Modes.Combat);
    }

    const loadPlayerModules = async () => {
        setLoading(true);
        const _modules = await contractFacade.getPlayerModules();
        setPlayerModules(_modules);
        setLoading(false);
    }

    const registerFleet = async (defence) => {
        await loadPlayerModules();
        setOpponentSelection(null);
        setSelfSelection(defence && defence.selection);
        setSelfModules(defence && defence.modules);
        setMode(Modes.ShipSelection);
    }

    // TODO Move to RankedCombat component
    const unregisterFleet = async () => {
        setLoading(true);

        try {
            await contractFacade.unregisterDefence();
        } catch (error) {
            setToastContent('Transaction failed (Unregister Fleet).');
            setToastOpen(true);
        }

        setMode(Modes.RankedCombat);
        setLoading(false);
    }

    const attackFleet = async (address, selection, modules, defenderBalance) => {
        await loadPlayerModules();
        setOpponent(address);
        setOpponentSelection(selection);
        setOpponentBalance(defenderBalance);
        setMode(Modes.ShipSelection);
    }

    const shipSelectionDone = async (selection, modules, value, targeting) => {
        setLoading(true);

        if (opponentSelection) {
            // Attack
            let result;
            try {
                result = await contractFacade.attack(
                    opponent,
                    selection,
                    modules,
                    unitsToPico(value),
                    targeting
                );

                return replayFightResult(result[0], result[1]);
            } catch (error) {
                setToastContent('Transaction failed (Attack).');
                setToastOpen(true);
            }
        } else {
            // Register defence
            try {
                await contractFacade.registerDefence(
                    selection,
                    modules,
                    playerName,
                    unitsToPico(value),
                    targeting
                );
            } catch (error) {
                setToastContent('Transaction failed (Defence).');
                setToastOpen(true);
            }
        }

        setMode(Modes.RankedCombat);
        setLoading(false);
    }

    const mainBalanceString = _formatBalance(mainBalance);
    const logsButtonClassName = 'logsButton' + (underAttack ? ' underAttack' : '');

    return (
        <div>
            {mode === Modes.LoginScreen &&
                <LoginScreen onDone={onLoginDone}/>
            }
            {mode === Modes.TapToStart &&
                <div className="tapToStart" onClick={() => {
                    startMusic();
                    setMode(Modes.LoginScreen);
                }}>
                    <div className="info">
                        <div className="text pulseBackground">
                            TAP TO START
                        </div>
                    </div>
                </div>
            }
            {!loading && _.contains([
                Modes.MainScreen,
                Modes.RankedCombat,
                Modes.Universe,
                Modes.Crafting
            ], mode) &&
                <div className="mainScreen ui">
                    <div className="mainTitle">
                    </div>
                    {mode === Modes.MainScreen &&
                        <React.Fragment>
                            <div className="playerName">
                                <input autoCorrect="off" type="text" className="playerNameInput" value={playerName}
                                    onChange={handlePlayerNameChange}/>
                            </div>
                            <div className="mainMenu">
                                <div className="mainMenuItem" onClick={() => {
                                    setStartWithSystem(null);
                                    setMode(Modes.Universe);
                                }}>
                                    UNIVERSE
                                </div>
                                <div className="mainMenuItem" onClick={() => {
                                    setMode(Modes.Crafting);
                                }}>
                                    NFTs
                                </div>
                                <div className="mainMenuItem" onClick={() => {
                                    setMode(Modes.RankedCombat);
                                }}>
                                    RANKED
                                </div>
                            </div>
                        </React.Fragment>
                    }
                    {mode === Modes.Crafting &&
                        <ManageModules
                            balance={mainBalance}
                            facade={contractFacade}
                            isTourOpen={isTourOpen}
                            setIsTourOpen={setIsTourOpen}/>
                    }
                    {mode === Modes.RankedCombat &&
                        <RankedCombat
                            facade={contractFacade}
                            onRegisterFleet={registerFleet}
                            onUnregisterFleet={unregisterFleet}
                            onFleetLoaded={setSelfDefence}
                            attackDisabled={!selfDefence}
                            isTourOpen={isTourOpen}
                            setIsTourOpen={setIsTourOpen}
                            onAttackFleet={attackFleet}/>
                    }
                    {mode === Modes.Universe &&
                        <Universe
                            facade={contractFacade}
                            playerName={playerName}
                            isTourOpen={isTourOpen}
                            balance={mainBalance}
                            blockNumber={blockNumber.current}
                            startWithSystem={startWithSystem}
                            setIsTourOpen={setIsTourOpen}/>
                    }
                    <React.Fragment>
                        <div className="mainBalance uiElement bottomElement">
                            <OfflineBoltIcon fontSize="small"/>
                            <span>Balance: {mainBalanceString}</span>
                            <span>&nbsp;&nbsp;|&nbsp;&nbsp;Block: {blockNumber.current && blockNumber.current.toNumber()}</span>
                            <span>&nbsp;&nbsp;|&nbsp;&nbsp;Players: {stats && stats.no_players}</span>
                            <span>&nbsp;&nbsp;|&nbsp;&nbsp;Systems: {stats && stats.no_systems}</span>
                            <span>&nbsp;&nbsp;|&nbsp;&nbsp;NFTs: {tokenCount !== null ? tokenCount : ''}</span>
                        </div>
                        <div className="versionBox uiElement bottomElement">
                        </div>
                    </React.Fragment>
                    <div className="settingsWrapper">
                        <PriorityHighIcon 
                            fontSize="large" 
                            className="questsButton"
                            onClick={() => {
                                setIsTourOpen(false);
                                setIsIntroTourOpen(false);
                                setQuestPanelOpen(true);
                            }}/>
                        <PlaylistPlayIcon
                            fontSize="large"
                            className={logsButtonClassName}
                            onClick={() => {
                                setIsTourOpen(false);
                                setIsIntroTourOpen(false);
                                setUnderAttack(false);
                                setLogPanelOpen(true);
                            }}/>
                        <HelpOutlineIcon 
                            fontSize="large" 
                            className="helpButton"
                            onClick={() => {
                                setIsTourOpen(true);
                                setIsIntroTourOpen(false);
                            }}/>
                        {musicPaused
                            ? <VolumeOffIcon fontSize="large"
                                onClick={toggleMusic}/>
                            : <VolumeUpIcon fontSize="large"
                                onClick={toggleMusic}/>
                        }
                        {mode === Modes.MainScreen
                            ? <SettingsIcon fontSize="large"
                                onClick={showSettings}/>
                            : <CloseIcon fontSize="large"
                                onClick={genericCancelHandler}/>
                        }
                    </div>
                </div>
            }
            {mode === Modes.MainScreen &&
                <Tour
                    steps={tourSteps}
                    isOpen={isTourOpen}
                    onRequestClose={() => { setIsTourOpen(false) }}
                />            
            }
            <Tour
                steps={introTourSteps}
                isOpen={isIntroTourOpen}
                onRequestClose={() => { setIsIntroTourOpen(false) }}
            />
            {mode === Modes.Settings &&
                <Settings onDone={genericCancelHandler}
                    address={contractFacade.alice.address} balance={mainBalanceString}
                    mnemonic={contractFacade.alice.mnemonic}
                    onCancel={genericCancelHandler}
                    onLogout={logout}/>
            }
            {mode === Modes.ShipSelection &&
                <CompactShipSelection
                    selfSelection={selfSelection}
                    playerModules={playerModules}
                    defaultModules={selfModules}
                    balance={picoToUnits(mainBalance.toNumber())}
                    maxBet={opponentSelection
                        ? Math.min(opponentBalance, picoToUnits(mainBalance.toNumber()))
                        : picoToUnits(mainBalance.toNumber())}
                    enemyShips={opponentSelection}
                    isTourOpen={isTourOpen}
                    setIsTourOpen={setIsTourOpen}
                    onDone={shipSelectionDone}
                    onCancel={openRankedHandler}/>
            }
            {mode === Modes.Combat &&
                <Combat selectionLhs={selfSelection}
                    selectionRhs={opponentSelection}
                    result={fightResult}
                    payout={payout}
                    onCancel={openRankedHandler}
                />
            }
            <LoadingScreen loading={loading}/>
            <div className="introVideo">
                <video
                    width="100%"
                    height="100%"
                    autoPlay={true}
                    playsInline={true}
                    muted={true}
                    poster="noposter">

                    <source src="assets/videos/intro.mp4" type="video/mp4"/>
                </video>
            </div>
            <div className="orientationWarning">
                <Rotate90DegreesCcwIcon className="pulse"/>
                <div className="rotate">
                    Please rotate your device
                </div>
                <div>
                    Have you considered downloading the mobile app for optimal experience?
                </div>
            </div>
            <Snackbar
                open={toastOpen}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                autoHideDuration={6000}
                onClose={onToastClose}
                message={toastContent}
            />
            <Drawer
                anchor="right"
                open={questPanelOpen}
                onClose={() => { setQuestPanelOpen(false) }}
            >
                <QuestProgress 
                    facade={contractFacade}
                    isOpen={questPanelOpen} 
                    blockNumber={blockNumber.current}/>
            </Drawer>
            <Drawer
                anchor="right"
                open={logPanelOpen}
                onClose={() => { setLogPanelOpen(false) }}
            >
                <LogViewer
                    facade={contractFacade}
                    onReplay={(result, payout) => {
                        setLogPanelOpen(false);
                        replayFightResult(result, payout);
                    }}
                    onNavigate={(location) => {
                        setLogPanelOpen(false);
                        setStartWithSystem(location);
                        setMode(Modes.Universe);
                    }}
                    isOpen={logPanelOpen}/>
            </Drawer>

        </div>
    );
};
