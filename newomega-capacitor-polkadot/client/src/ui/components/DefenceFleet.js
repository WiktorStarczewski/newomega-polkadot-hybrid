import React, { useEffect, useState } from 'react';
import './DefenceFleet.css';
import { GiPodium } from 'react-icons/gi';
import { balanceToDisplay } from '../../definitions/OmegaDefaults';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import { Modal } from '@material-ui/core';
import { Leaderboard } from './Leaderboard';
import CloseIcon from '@material-ui/icons/Close';

// props: facade, onRegisterFleet, onUnregisterFleet, onFleetLoaded, loading, setLoading
export const DefenceFleet = (props) => {
    const [defence, setDefence] = useState(null);
    const [ownStanding, setOwnStanding] = useState(null);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);

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

    const openLeaderboard = () => {
        setLeaderboardOpen(true);
    };

    const closeLeaderboard = () => {
        setLeaderboardOpen(false);
    };

    const rankedWins = ownStanding ? ownStanding.ranked_wins : 0;
    const rankedLosses = ownStanding ? ownStanding.ranked_losses : 0;

    return (
        <div className="DefenceFleet">
            <div className="homeFleetIcon" onClick={openLeaderboard}>
                <GiPodium className="defenceIcon"/>
                <div className="iconTitle">
                    Leaderboard
                </div>
            </div>
            <div className="fleetStatus">
                {!props.loading && defence && <React.Fragment>
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
                    </React.Fragment>
                }
            </div>
            {!props.loading && !defence &&
                <div className="registerFleet">
                    <div className="registerButton" onClick={registerFleet}>
                        Register Fleet
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
            <Modal 
                open={leaderboardOpen}
                onClose={closeLeaderboard}
            >
                <Leaderboard facade={props.facade}>
                    <div className="modalCloseIcon" onClick={closeLeaderboard}>
                        <CloseIcon fontSize="large"/>
                    </div>
                </Leaderboard>
            </Modal>
        </div>
    );
};
