import './LoginScreen.css';
import React, { useEffect, useState } from 'react';
import _ from 'underscore';
import { Plugins } from '@capacitor/core';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { OmegaDefaults } from '../definitions/OmegaDefaults';

const { Storage } = Plugins;


export const LoginScreen = (props) => {
    const [enteringMnemonic, setEnteringMnemonic] = useState(false);
    const [mnemonic, setMnemonic] = useState('');
    const [enteringName, setEnteringName] = useState(false);
    const [name, setName] = useState('');
    const [ensuredLogin, setEnsuredLogin] = useState(false);

    /**
     * Handler for the sign up action.
     * Generates a mnemonic and stores it in local storage.
     */
    const signUp = () => {
        props.onDone({
            finisher: async () => {
                const mnemonic = mnemonicGenerate();
                await Storage.set({ key: 'OmegaMnemonic', value: mnemonic });
                return [mnemonic, name];
            },
        });
    }

    const logIn = (mnemonic) => {
        props.onDone({
            finisher: async () => {
                return [mnemonic, null];
            },
        });
    }

    /**
     * Performs a login from mnemonic.
     */
    const logInFromMnemonic = () => {
        logIn(mnemonic);
    }

    /**
     * Finishes the login flow, returning the mnemonic.
     */

    useEffect(() => {
        const asyncAction = async () => {
            const mnemonic = await Storage.get({ key: 'OmegaMnemonic' });

            if (!_.isEmpty(mnemonic.value)) {
                logIn(mnemonic.value);
            }

            setEnsuredLogin(true);
        };

        asyncAction();
    }, []);

    /**
     * Handler for the mnemonic input changed.
     */
    const mnemonicInputChanged = (e) => {
        setMnemonic(e.target.value);
    }

    const nameInputChanged = (e) => {
        setName(e.target.value);
    }

    /**
     * Enters the visual state of putting in the mnemonic.
     */
    const startMnemonicInput = () => {
        setEnteringMnemonic(true);
    }

    const startNameInput = () => {
        setEnteringName(true);
    }

    return (
        <div className="LoginScreen">
            <div className="ui">
                <div className="mainTitle">
                </div>
                {enteringName &&
                    <div className="loginDetails">
                        <input className="nameInput"
                            onChange={nameInputChanged}
                            value={name}
                            placeholder="TAP TO ENTER YOUR NAME"/>
                    </div>
                }
                {enteringMnemonic &&
                    <div className="loginDetails">
                        <textarea className="mnemonicInput"
                            onChange={mnemonicInputChanged}
                            value={mnemonic}
                            placeholder="Enter your 12-word mnemonic (password)"/>
                    </div>
                }
                {ensuredLogin && !enteringMnemonic && !enteringName &&
                    <div className="mainMenu">
                        <div className="mainMenuItem" onClick={startNameInput}>
                            <div>
                                SIGN UP
                            </div>
                            <div className="explain">
                                <div>
                                    Create a new Account. No email required.
                                </div>
                            </div>
                        </div>
                        <div className="mainMenuItem" onClick={startMnemonicInput}>
                            <div>
                                LOG IN
                            </div>
                            <div className="explain">
                                I have an Account already.
                            </div>
                        </div>
                    </div>
                }
                {enteringMnemonic &&
                    <div className="uiElement doneBox bottomBox"
                        onClick={logInFromMnemonic}>
                        LOG IN
                    </div>
                }
                {enteringName &&
                    <div className="uiElement doneBox bottomBox"
                        onClick={signUp}>
                        SIGN UP
                    </div>
                }
            </div>
        </div>
    );
};
