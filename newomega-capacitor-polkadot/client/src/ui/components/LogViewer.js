import React, { useEffect, useState } from 'react';
import './LogViewer.css';
import { blocksToTimeString, OmegaDefaults } from '../../definitions/OmegaDefaults';
import _ from 'underscore';
import LinearProgress from '@material-ui/core/LinearProgress';


// props: facade, isOpen, blockNumber
export const LogViewer = (props) => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState(null);
    const [names, setNames] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        const _logs = await props.facade.getRankedFightCompleteEvents();
        const accountsToTranslate = _.uniq(_.union(_.pluck(_logs, 'attackerAddress'), _.pluck(_logs, 'defenderAddress')));
        const _names = await props.facade.getPlayerNames(accountsToTranslate);
        setNames(_.object(accountsToTranslate, _names));
        setLogs(_logs.reverse());
        setLoading(false);
    };

    const navigate = (location) => {
        props.onNavigate(location);
    };

    const replay = (result, payout) => {
        props.onReplay(result, payout);
    };

    const showLogs = () => {
        const generateItem = (log, index) => {
            const isDone = false;
            const itemClassName = 'logItem ' + (isDone ? ' done' : '');
            const isUniverseEvent = log.identifier === 'UniverseFightComplete';

            const eventToName = {
                'UniverseFightComplete': 'Universe Fight',
                'RankedFightComplete': 'Ranked Fight',
            };

            return (
                <div className={itemClassName} key={index}>
                    <div className="type">
                        {eventToName[log.identifier]}
                    </div>
                    <div className="participants">
                        {names[log.attackerAddress]} vs {names[log.defenderAddress]}
                    </div>
                    <div className="actions">
                        {isUniverseEvent && 
                            <div className="actionButton navigateButton" onClick={() => navigate(log.payoutOrLocation)}>
                                LOCATION
                            </div>
                        }
                        <div className="actionButton viewFightButton" onClick={() => replay(log.fightResult, !isUniverseEvent ? log.payoutOrLocation : null)}>
                            REPLAY
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div className="currentLogs">
                {logs.length === 0 &&
                    <div className="noLogs">
                        <div className="noLogsInner">
                            <div>
                                No Logs
                            </div>
                            <div className="noLogsTip">
                                It's been quiet! Time to conquer!
                            </div>
                        </div>
                    </div>
                }

                {_.map(logs, generateItem)}
            </div>
        );
    };

    useEffect(() => {
        props.isOpen && fetchData();
    }, [props.isOpen]);

    return (
        <div className="LogViewer">
            {loading && <LinearProgress/>}
            <div className="title">
                Logs
            </div>
            <div className="explanation">
                All fights that happened in the past 8 hours
            </div>
            {logs && showLogs()}
        </div>
    );
};