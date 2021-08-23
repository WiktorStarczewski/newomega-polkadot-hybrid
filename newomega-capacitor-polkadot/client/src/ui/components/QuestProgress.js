import React, { useEffect, useState } from 'react';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import './QuestProgress.css';
import { blocksToTimeString, OmegaDefaults } from '../../definitions/OmegaDefaults';
import { LinearProgress } from '@material-ui/core';


// props: facade, isOpen, blockNumber
export const QuestProgress = (props) => {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [freeActions, setFreeActions] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        const _progress = await props.facade.getPlayerQuestProgress();
        const _freeActions = await props.facade.getFreeActions();
        setProgress(_progress);
        setFreeActions(_freeActions);
        setLoading(false);
    }

    const claim = async () => {
        setLoading(true);
        await props.facade.claimQuest();
        await fetchData();
        setLoading(false);
    };

    const showCurrentProgress = () => {
        const generateItem = (title, current, max) => {
            const isDone = current >= max;
            const itemClassName = 'progressItem ' + (isDone ? ' done' : '');

            return (
                <div className={itemClassName}>
                    <div className="progressItemTitle">
                        {title}
                    </div>
                    <div className="progressItemProgress">
                        {current} / {max}
                    </div>
                </div>
            );
        };

        return (
            <div className="currentProgress">
                {generateItem('Capture Planets', progress.planet_capture, 5)}
                {generateItem('Win Ranked Fights', progress.ranked_wins, 5)}
                {generateItem('Craft Ship Modules', progress.module_craft, 1)}
                {generateItem('Harvest Planets', progress.planet_harvest, 5)}
                {generateItem('Produce Ships', progress.produce_ships, 4)}
                {generateItem('Discover Systems', progress.discover, 3)}
                {generateItem('Build Gateways', progress.build_gateway, 1)}
                {generateItem('Register Minerals trade', progress.register_mineral_trade, 1)}
                {generateItem('Upgrade Planets', progress.upgrade_planet, 1)}
            </div>
        );
    };

    const canClaimComplete = progress && progress.planet_capture >= 5 &&
        progress.ranked_wins >= 5 && progress.module_craft >= 1 && progress.planet_harvest >= 5 &&
        progress.produce_ships >= 4 && progress.discover >= 3 && progress.build_gateway >= 1 &&
        progress.register_mineral_trade >= 1 && progress.upgrade_planet >= 1;
    const canClaimElapsed = freeActions && (props.blockNumber - freeActions.task_claim >= OmegaDefaults.TASK_CLAIM_FREQUENCY_BLOCKS);
    const canClaim = !loading && canClaimComplete && canClaimElapsed;
    const claimButtonClassName = 'claimButton' + (canClaim ? '' : ' disabled');
    const nextClaim = freeActions ? freeActions.task_claim + OmegaDefaults.TASK_CLAIM_FREQUENCY_BLOCKS : 0;

    useEffect(() => {
        props.isOpen && fetchData();
    }, [props.isOpen]);

    return (
        <div className="QuestProgress">
            {loading && <LinearProgress/>}
            <div className="title">
                Tasks
            </div>
            <div className="explanation">
                Complete tasks every day to earn NOT tokens!
            </div>
            {progress && showCurrentProgress()}
            {!canClaimElapsed && freeActions && nextClaim &&
                <div className="lastClaimed">
                    <div>
                        Last claimed: Block {freeActions.task_claim}
                    </div>
                    <div>
                        Next claim possible: Block {nextClaim} ({blocksToTimeString(Math.max(0, nextClaim - props.blockNumber - 1))})
                    </div>
                </div>
            }
            <div className={claimButtonClassName} onClick={canClaim ? claim : null}>
                <span>CLAIM </span><OfflineBoltIcon/>5
            </div>
        </div>
    );
};