import './LoginScreen.css';
import React from 'react';
import _ from 'underscore';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { OmegaDefaults } from '../definitions/OmegaDefaults';


// TODO reintroduce capacitor storage

export class LoginScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            enteringMnemonic: false,
            mnemonic: '',
            enteringName: false,
            name: '',
            ensuredLogin: false,
        };
    }

    /**
     * Handler for the sign up action.
     * Generates a mnemonic and stores it in local storage.
     */
    signUp() {
        this.props.onDone({
            finisher: () => {
                const mnemonic = mnemonicGenerate();
                localStorage.setItem('OmegaMnemonic', mnemonic);
                return [mnemonic, this.state.name];
            },
        });
    }

    /**
     * Performs a login from mnemonic.
     */
    logInFromMnemonic() {
        this.logIn(this.state.mnemonic);
    }

    /**
     * Finishes the login flow, returning the mnemonic.
     */
    logIn(mnemonic) {
        this.props.onDone({
            finisher: () => {
                return [mnemonic, null];
            },
        });
    }

    componentDidMount() {
        const mnemonic = localStorage.getItem('OmegaMnemonic');

        if (!_.isEmpty(mnemonic)) {
            this.logIn(mnemonic);
        }

        this.setState({
            ensuredLogin: true,
        });
    }

    /**
     * Handler for the mnemonic input changed.
     */
    mnemonicInputChanged(e) {
        this.setState({
            mnemonic: e.target.value,
        });
    }

    nameInputChanged(e) {
        this.setState({
            name: e.target.value,
        });
    }

    /**
     * Enters the visual state of putting in the mnemonic.
     */
    startMnemonicInput() {
        this.setState({
            enteringMnemonic: true,
        });
    }

    startNameInput() {
        this.setState({
            enteringName: true,
        });
    }

    render() {
        return (
            <div className="LoginScreen">
                <div className="ui">
                    <div className="mainTitle">
                    </div>
                    {this.state.enteringName &&
                        <div className="loginDetails">
                            <input className="nameInput"
                                onChange={this.nameInputChanged.bind(this)}
                                value={this.state.name}
                                placeholder="TAP TO ENTER YOUR NAME"/>
                        </div>
                    }
                    {this.state.enteringMnemonic &&
                        <div className="loginDetails">
                            <textarea className="mnemonicInput"
                                onChange={this.mnemonicInputChanged.bind(this)}
                                value={this.state.mnemonic}
                                placeholder="Enter your 12-word mnemonic (password)"/>
                        </div>
                    }
                    {this.state.ensuredLogin && !this.state.enteringMnemonic && !this.state.enteringName &&
                        <div className="mainMenu">
                            <div className="mainMenuItem" onClick={this.startNameInput.bind(this)}>
                                <div>
                                    SIGN UP
                                </div>
                                <div className="explain">
                                    <div>
                                        Create a new Account. No email required.
                                    </div>
                                </div>
                            </div>
                            <div className="mainMenuItem" onClick={this.startMnemonicInput.bind(this)}>
                                <div>
                                    LOG IN
                                </div>
                                <div className="explain">
                                    I have an Account already.
                                </div>
                            </div>
                        </div>
                    }
                    {this.state.enteringMnemonic &&
                        <div className="uiElement doneBox bottomBox"
                            onClick={this.logInFromMnemonic.bind(this)}>
                            LOG IN
                        </div>
                    }
                    {this.state.enteringName &&
                        <div className="uiElement doneBox bottomBox"
                            onClick={this.signUp.bind(this)}>
                            SIGN UP
                        </div>
                    }
                </div>
            </div>
        );
    }
};
