import React, { useEffect, useState } from 'react';
import './Leaderboard.css';
import { GiPodium, GiTrophyCup } from 'react-icons/gi';
import LinearProgress from '@material-ui/core/LinearProgress';
import _ from 'underscore';

// props: facade
export const Leaderboard = (props) => {
    const [loading, setLoading] = useState(false);
    const [leaderboard, setLeaderboard] = useState(null);
    const [names, setNames] = useState(null);

    const getLeaderboard = () => {
        return (
            <div className="leaderboard">
                {_.map(leaderboard, (entry, index) => {
                    return (
                        <div className="leaderboardEntry" key={entry.address}>
                            <div className="position">
                                {index + 1}
                            </div>
                            <div className="playerName">
                                {names[entry.address]}
                            </div>
                            <div className="playerWins">
                                Wins: {entry.ranked_wins}
                            </div>
                            <div className="playerLosses">
                                Losses: {entry.ranked_losses}
                            </div>
                            <div className="medal">
                                {index === 0 && <GiTrophyCup/>}
                                {index === 1 && <GiTrophyCup/>}
                                {index === 2 && <GiTrophyCup/>}
                            </div>
                        </div>
                    );
                })}
            </div>  
        );
    }

    const getPodium = () => {
        return (
            <div className="podium">
                {false &&
                    <div className="standing standing1">
                        {leaderboard.length > 0 && names[leaderboard[0].address]}
                    </div>
                }
                <GiPodium className="podiumIcon"/>
                {false && 
                    <div className="bottomStanding">
                        <div className="standing standing2">
                            {leaderboard.length > 1 && names[leaderboard[1].address]}                    
                        </div>
                        <div className="standing standing3">
                            {leaderboard.length > 2 && names[leaderboard[2].address]}
                        </div>    
                    </div>
                }
            </div>
        );
    }

    const sortLeaderboard = (_leaderboard) => {
        return _leaderboard.sort((a, b) => {
            if (a.ranked_wins > b.ranked_wins) {
                return -1;
            } else if (b.ranked_wins > a.ranked_wins) {
                return 1;
            }

            if (a.ranked_losses < b.ranked_losses) {
                return -1;
            } else if (b.ranked_losses < a.ranked_losses) {
                return 1;
            }

            if (a.ranked_wins + a.ranked_losses > b.ranked_wins + b.ranked_losses) {
                return -1;
            } else if (b.ranked_wins + b.ranked_losses > a.ranked_wins + a.ranked_losses) {
                return 1;
            }

            return 0;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        const _leaderboard = await props.facade.getLeaderboard();
        const accountsToTranslate = _.pluck(_leaderboard, 'address');
        const _names = await props.facade.getPlayerNames(accountsToTranslate);
        setLeaderboard(sortLeaderboard(_leaderboard));
        setNames(_.object(accountsToTranslate, _names));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="Leaderboard">
            {loading && <LinearProgress/>}
            {!loading && leaderboard && getPodium()}
            {!loading && leaderboard && getLeaderboard()}
            {props.children}
        </div>
    );
};
