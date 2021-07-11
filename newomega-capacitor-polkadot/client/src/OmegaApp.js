import './App.css';
import React, { Component } from 'react';
import { Plugins } from '@capacitor/core';
import _ from 'underscore';
import { ContractFacade } from './facades/ContractFacade';
import { CompactShipSelection } from './scenes/CompactShipSelection';
import { Combat } from './scenes/Combat';
import { OmegaDefaults, picoToUnits, unitsToPico } from './definitions/OmegaDefaults';
import { Targeting } from './definitions/Ships';
import { LoginScreen } from './ui/LoginScreen';
import { LoadingScreen } from './ui/components/LoadingScreen';
import { Settings } from './ui/Settings';
import { RankedCombat } from './ui/components/RankedCombat';
import { Universe } from './ui/components/Universe';
import { Ships } from './definitions/Ships';
import Snackbar from '@material-ui/core/Snackbar';
import SettingsIcon from '@material-ui/icons/Settings';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import CloseIcon from '@material-ui/icons/Close';
import Rotate90DegreesCcwIcon from '@material-ui/icons/Rotate90DegreesCcw';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import Tour from 'reactour';


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
        content: ({ close }) => (
            <div>
                <h3>
                    Ranked Combat
                </h3>
                <h4>
                    Test your strategies and win NOT tokens by competing against other players fleets in a ranked system.
                </h4>
                <div className="tourButton" onClick={close}>Got it!</div>
            </div>
        ),
    },
];


export default class OmegaApp extends Component {
    constructor(props) {
        super(props);

        this.defaultLoadedState = {
            mode: Modes.MainScreen,
            loading: false,
            defenders: null,
            opponentSelection: null,
            selfSelection: null,
            opponentModules: null,
            opponentBalance: null,
            selfModules: null,
            fightResult: null,
            opponent: null,
            payout: null,
            selfDefence: null,
            isTourOpen: false,
            isIntroTourOpen: false,
        };

        this.defaultUnloadedState = {
            mode: Modes.TapToStart,
            ownAccount: null,
            mainBalance: 0,
            ethPrice: 1.0,
            blockNumber: 0,
            contractFacade: null,
            toastOpen: false,
            toastContent: '',
            playerName: null,
            musicPaused: false,
            blockNumber: 0,
            unseenFights: [],
            stats: null,
        };

        this.state = {
            ...this.defaultLoadedState,
            ...this.defaultUnloadedState,
        };

        this.introTourSteps = [
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
                            await this.markIntroTourDone();
                        }}> 
                            Got it!
                        </div>
                    </div>
                ),
            },
        ];
    }

    componentWillUnmount() {
        this.audio && this.audio.pause();
    }

    startMusic() {
        if (this.audio) {
            return;
        }

        this.audio = new Audio('assets/music/bensound-scifi.mp3');
        this.audio.loop = true;
        this.audio.addEventListener('canplaythrough', event => {
            this.audio.play();
        });
    }

    toggleMusic() {
        if (!this.audio) {
            return;
        }

        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }

        this.setState({
            musicPaused: !this.state.musicPaused,
        });
    }

    appMinimized() {
        this.audio && this.audio.pause();
    }

    appMaximized() {
        if (!this.state.musicPaused) {
            this.audio && this.audio.play();
        }
    }

    async getPlayerName() {
        const name = await Storage.get({ key: 'OmegaPlayerName' });
        return name.value || OmegaDefaults.PLAYER_NAME;
    }

    /**
     * Handler for the player name change action.
     */
    async handlePlayerNameChange(e) {
        const playerName = e.target.value;
        // window.localStorage.setItem('OmegaPlayerName', playerName);
        await Storage.set({ key: 'OmegaPlayerName', value: playerName });
        this.setState({
            playerName,
        });
    }

    async checkIntroTour() {
        const introTourDone = await Storage.get({ key: 'OmegaIntroTourDone' });
        if (!introTourDone.value) {
            this.setState({
                isIntroTourOpen: true,
            });
        }
    }

    async markIntroTourDone() {
        await Storage.set({ key: 'OmegaIntroTourDone', value: true });
    }

    showError(error, toastOnly) {
        const baseState = toastOnly
            ? {}
            : this.defaultLoadedState;

        return this.setState({
            ...baseState,
            toastOpen: true,
            toastContent: `Transaction failed (${error.code})`,
        });
    }

    _selectionToCp(selection) {
        return _.reduce(selection, (memo, num, index) => {
            return memo + (num || 0) * Ships[index].stats.cp;
        }, 0);
    }

    estimateUsdCost(gas) {
        const oneGwei = 0.000000001;
        return (gas * oneGwei * this.state.ethPrice).toFixed(6);
    }

    etherToUsd(eth) {
        try {
            const ethFloat = parseFloat(eth);
            return (ethFloat * this.state.ethPrice).toFixed(2);
        } catch (error) {
            return 0;
        }
    }

    onToastClose() {
        this.setState({
            toastOpen: false,
            toastContent: '',
        });
    }

    onLoginDone(options) {
        this.setState({
            loading: true,
        }, () => {
            _.defer(() => {
                const result = options.finisher();
                const name = result[1];

                if (name) {
                    this.handlePlayerNameChange({
                        target: {
                            value: name,
                        },
                    });
                }

                App.addListener('appStateChange', (state) => {
                    if (state.isActive) {
                        this.appMaximized();
                    } else {
                        this.appMinimized();
                    }
                });

                this._initWeb3(result[0]);
            });
        });
    }

    showSettings() {
        this.setState({
            mode: Modes.Settings,
        });
    }

    genericCancelHandler() {
        this.setState(this.defaultLoadedState);
    }

    openRankedHandler() {
        this.setState({
            ...this.defaultLoadedState,
            mode: Modes.RankedCombat,
        });
    }

    /**
     * Formats a DOT balance.
     */
    _formatBalance(balance) {
        return balance && balance.toHuman();
    }

    /**
     * Initializes Web3 environment from a mnemonic.
     * Moves to the main screen stage.
     */
    async _initWeb3(mnemonic) {
        this.setState({
            loading: true,
        });

        const facade = new ContractFacade();
        await facade.initialize(mnemonic);
        await this._checkBalance(facade);
        const playerName = await this.getPlayerName();

        await facade.subscribeToBalance(async () => {
            await this._checkBalance(facade);
        })

        try {
            await facade.universeRegisterPlayer(playerName);
        } catch (error) {
            // Assuming player is registered already
        }

        const stats = await facade.getGameStats();
        this.setState({ stats });

        facade.api.derive.chain.subscribeNewHeads((header) => {
            this.setState({
                blockNumber: header.number,
            });
        });

        // facade.api.query.system.events((events) => {
        //     events.forEach((record) => {
        //         // Extract the phase, event and the event types
        //         const { event, phase } = record;
        //         const types = event.typeDef;
          
        //         // Show what we are busy with
        //         console.log(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);
        //         console.log(`\t\t${event.meta.documentation.toString()}`);

        //         // Loop through each of the parameters, displaying the type and data
        //         event.data.forEach((data, index) => {
        //           console.log(`\t\t\t${types[index].type}: ${data.toJSON()}`);
        //         });
        //     });
        // });

        this.setState({
            contractFacade: facade,
            mode: Modes.MainScreen,
            loading: false,
            playerName,
        });

        setTimeout(() => {
            this.checkIntroTour();
        }, 750);
    }

    /**
     * Checks balance for current account.
     */
    async _checkBalance(facade) {
        // eslint-disable-next-line no-unused-vars
        const { _nonce, data: balance } = await facade.api.query.system.account(facade.alice.address);

        this.setState({
            mainBalance: balance.free,
        });
    }

    async replayFightResult(metaResult, payout) {
        this.setState({
            loading: true,
        });

        let result;

        try {
            result = await this.state.contractFacade.replay(
                metaResult.seed,
                metaResult.selection_lhs,
                metaResult.selection_rhs,
                metaResult.modules_lhs,
                metaResult.modules_rhs,
                metaResult.targeting_lhs,
                metaResult.targeting_rhs);
        } catch (error) {
            console.log(error);
            return this.setState({
                ...this.defaultLoadedState,
                toastOpen: true,
                toastContent: 'Transaction failed (Replay Fight).',
            });
        }

        this.setState({
            mode: Modes.Combat,
            selfSelection: result.selection_lhs,
            opponentSelection: result.selection_rhs,
            fightResult: result,
            loading: false,
            payout,
        });
    }

    registerFleet(defence) {
        this.setState({
            mode: Modes.ShipSelection,
            opponentSelection: null,
            selfSelection: defence && defence.selection,
            selfModules: defence && defence.modules,
        });
    }

    // TODO Move to RankedCombat component
    async unregisterFleet() {
        this.setState({
            loading: true,
        });

        try {
            await this.state.contractFacade.unregisterDefence();
        } catch (error) {
            return this.setState({
                ...this.defaultLoadedState,
                toastOpen: true,
                toastContent: 'Transaction failed (Unregister Fleet).',
            });
        }

        this.setState({
            ...this.defaultLoadedState,
            mode: Modes.RankedCombat,
        });
    }

    attackFleet(address, selection, modules, defenderBalance) {
        this.setState({
            mode: Modes.ShipSelection,
            opponent: address,
            opponentSelection: selection,
            opponentBalance: defenderBalance,
            // TODO reveal modules?
        });
    }

    async shipSelectionDone(selection, modules, value, targeting) {
        this.setState({
            loading: true,
        });

        if (this.state.opponentSelection) {
            // Attack
            let result;
            try {
                result = await this.state.contractFacade.attack(
                    this.state.opponent,
                    selection,
                    modules,
                    unitsToPico(value),
                    targeting
                );

                return this.replayFightResult(result[0], result[1]);
            } catch (error) {
                this.setState({
                    toastOpen: true,
                    toastContent: 'Transaction failed (Attack).',
                });
            }
        } else {
            // Register defence
            try {
                await this.state.contractFacade.registerDefence(
                    selection,
                    modules,
                    this.state.playerName,
                    unitsToPico(value),
                    targeting
                );
            } catch (error) {
                this.setState({
                    toastOpen: true,
                    toastContent: 'Transaction failed (Defence).',
                });
            }
        }

        this.setState({
            ...this.defaultLoadedState,
            mode: Modes.RankedCombat,
        });
    }

    render() {
        const mainBalanceString = this._formatBalance(this.state.mainBalance);

        return (
            <div>
                {this.state.mode === Modes.LoginScreen &&
                    <LoginScreen onDone={this.onLoginDone.bind(this)}/>
                }
                {this.state.mode === Modes.TapToStart &&
                    <div className="tapToStart" onClick={() => {
                        this.startMusic();
                        this.setState({
                            mode: Modes.LoginScreen,
                        });
                    }}>
                        <div className="info">
                            <div className="text pulseBackground">
                                TAP TO START
                            </div>
                        </div>
                    </div>
                }
                {!this.state.loading && _.contains([
                    Modes.MainScreen,
                    Modes.RankedCombat,
                    Modes.Universe
                ], this.state.mode) &&
                    <div className="mainScreen ui">
                        <div className="mainTitle">
                        </div>
                        {this.state.mode === Modes.MainScreen &&
                            <React.Fragment>
                                <div className="playerName">
                                    <input autoCorrect="off" type="text" className="playerNameInput" value={this.state.playerName}
                                        onChange={this.handlePlayerNameChange.bind(this)}/>
                                </div>
                                <div className="mainMenu">
                                    <div className="mainMenuItem" onClick={() => {
                                        this.setState({ mode: Modes.Universe})
                                    }}>
                                        UNIVERSE
                                    </div>
                                    <div className="mainMenuItem" onClick={() => {
                                        this.setState({ mode: Modes.RankedCombat})
                                    }}>
                                        RANKED
                                    </div>
                                </div>
                            </React.Fragment>
                        }
                        {this.state.mode === Modes.RankedCombat &&
                            <RankedCombat
                                facade={this.state.contractFacade}
                                onRegisterFleet={this.registerFleet.bind(this)}
                                onUnregisterFleet={this.unregisterFleet.bind(this)}
                                onFleetLoaded={(defence) => this.setState({ selfDefence: defence })}
                                attackDisabled={!this.state.selfDefence}
                                isTourOpen={this.state.isTourOpen}
                                setIsTourOpen={(value) => this.setState({
                                   isTourOpen: value, 
                                })}
                                onAttackFleet={this.attackFleet.bind(this)}/>
                        }
                        {this.state.mode === Modes.Universe &&
                            <Universe
                                facade={this.state.contractFacade}
                                playerName={this.state.playerName}
                                isTourOpen={this.state.isTourOpen}
                                balance={this.state.mainBalance}
                                blockNumber={this.state.blockNumber}
                                setIsTourOpen={(value) => this.setState({
                                   isTourOpen: value, 
                                })}/>
                        }
                        <React.Fragment>
                            <div className="mainBalance uiElement bottomElement">
                                <OfflineBoltIcon fontSize="small"/>
                                <span>Balance: {mainBalanceString}</span>
                                <span>&nbsp;&nbsp;|&nbsp;&nbsp;Block: {this.state.blockNumber && this.state.blockNumber.toNumber()}</span>
                                <span>&nbsp;&nbsp;|&nbsp;&nbsp;Players: {this.state.stats && this.state.stats.no_players}</span>
                            </div>
                            <div className="versionBox uiElement bottomElement">
                            </div>
                        </React.Fragment>
                        <div className="settingsWrapper">
                            <HelpOutlineIcon fontSize="large" className="helpButton"
                                onClick={() => this.setState({ 
                                    isTourOpen: true,
                                    isIntroTourOpen: false,
                                })}/>
                            {this.state.musicPaused
                                ? <VolumeOffIcon fontSize="large"
                                    onClick={this.toggleMusic.bind(this)}/>
                                : <VolumeUpIcon fontSize="large"
                                    onClick={this.toggleMusic.bind(this)}/>
                            }
                            {this.state.mode === Modes.MainScreen
                                ? <SettingsIcon fontSize="large"
                                    onClick={this.showSettings.bind(this)}/>
                                : <CloseIcon fontSize="large"
                                    onClick={this.genericCancelHandler.bind(this)}/>
                            }
                        </div>
                    </div>
                }
                {this.state.mode === Modes.MainScreen &&
                    <Tour
                        steps={tourSteps}
                        isOpen={this.state.isTourOpen}
                        onRequestClose={() => this.setState({ isTourOpen: false })}
                    />            
                }
                <Tour
                    steps={this.introTourSteps}
                    isOpen={this.state.isIntroTourOpen}
                    onRequestClose={() => this.setState({ isIntroTourOpen: false })}
                />
                {this.state.mode === Modes.Settings &&
                    <Settings onDone={() => { this.setState(this.defaultLoadedState) }}
                        address={this.state.contractFacade.alice.address} balance={mainBalanceString}
                        mnemonic={this.state.contractFacade.alice.mnemonic}
                        onCancel={this.genericCancelHandler.bind(this)}/>
                }
                {this.state.mode === Modes.ShipSelection &&
                    <CompactShipSelection
                        selfSelection={this.state.selfSelection}
                        selfModules={this.state.selfModules}
                        balance={picoToUnits(this.state.mainBalance.toNumber())}
                        maxBet={this.state.opponentSelection
                            ? Math.min(this.state.opponentBalance, picoToUnits(this.state.mainBalance.toNumber()))
                            : picoToUnits(this.state.mainBalance.toNumber())}
                        enemyShips={this.state.opponentSelection}
                        isTourOpen={this.state.isTourOpen}
                        setIsTourOpen={(value) => this.setState({
                            isTourOpen: value, 
                        })}
                        onDone={this.shipSelectionDone.bind(this)}
                        onCancel={this.openRankedHandler.bind(this)}/>
                }
                {this.state.mode === Modes.Combat &&
                    <Combat selectionLhs={this.state.selfSelection}
                        selectionRhs={this.state.opponentSelection}
                        result={this.state.fightResult}
                        payout={this.state.payout}
                        onCancel={(this.openRankedHandler.bind(this))}
                    />
                }
                <LoadingScreen loading={this.state.loading}/>
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
                    open={this.state.toastOpen}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    autoHideDuration={6000}
                    onClose={this.onToastClose.bind(this)}
                    message={this.state.toastContent}
                />
            </div>
        );
    }
}

