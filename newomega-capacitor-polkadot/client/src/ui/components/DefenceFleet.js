import React, { useEffect, useState } from 'react';
import './DefenceFleet.css';
import { BiShield } from 'react-icons/bi';
import { balanceToDisplay } from '../../definitions/OmegaDefaults';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';

// props: facade, onRegisterFleet, onUnregisterFleet, onFleetLoaded, loading, setLoading
export const DefenceFleet = (props) => {
    const [defence, setDefence] = useState(null);
    const [ownStanding, setOwnStanding] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const defence = await props.facade.getOwnDefence();
                setDefence(defence);
                props.onFleetLoaded(defence);
            } catch (error) {
                props.onFleetLoaded(null);
            }

            try {
                const ownStanding = await props.facade.getOwnStanding();
                setOwnStanding(ownStanding);
            } catch (error) {
            }

            props.setLoading(false);
        }

        fetchData();
    }, []);

    const registerFleet = () => {
        props.onRegisterFleet(defence);
    };

    const unregisterFleet = () => {
        props.onUnregisterFleet();
    };

    const rankedWins = ownStanding ? ownStanding.ranked_wins : 0;
    const rankedLosses = ownStanding ? ownStanding.ranked_losses : 0;

    return (
        <div className="DefenceFleet">
            <div className="iconTitle">
                Home Fleet
            </div>
            <BiShield className="defenceIcon"/>
            {!props.loading && !defence &&
                <div className="registerFleet">
                    <div className="registerButton" onClick={registerFleet}>
                        Register Fleet
                    </div>
                </div>
            }
            {!props.loading && defence &&
                <div className="fleetStatus">
                    <div>
                        Global: {rankedWins} Wins {rankedLosses} Losses
                    </div>
                    <div>
                        Home Fleet: {defence.wins} Wins {defence.losses} Losses
                    </div>
                    <div className="fleetBalance">
                        <OfflineBoltIcon/>
                        {balanceToDisplay(defence.value)}
                    </div>
                </div>
            }
            {!props.loading && defence &&
                <div className="unregisterFleet">
                    <div className="registerButton" onClick={unregisterFleet}>
                        Cash Out
                    </div>
                </div>
            }
        </div>
    );
};
