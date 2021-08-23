import React, { useEffect, useState } from 'react';
import { blocksTillNextFreeDiscovery, blocksToTimeString, isDiscoveryFree, unitsToPico } from '../../definitions/OmegaDefaults';
import './UniverseMap.css';
import { UniverseMapCanvas } from './UniverseMapCanvas';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import HomeIcon from '@material-ui/icons/Home';


// props: universe, onDiscoverSystem, onLoadSystem, names, planetExpanded, blockNumber, freeActions, balance
export const UniverseMap = (props) => {
    const mainClassName = 'UniverseMap';
    const freeDiscovery = isDiscoveryFree(props.blockNumber, props.freeActions.discovery);
    const blocksLeftDiscovery = blocksTillNextFreeDiscovery(props.blockNumber, props.freeActions.discovery);
    const blocksLeftTime = !freeDiscovery && blocksToTimeString(blocksLeftDiscovery);
    const canDiscoverOwner = props.alice === props.system.position.root;
    const canDiscoverBalance = freeDiscovery || props.balance >= unitsToPico(1);
    const canDiscover = canDiscoverBalance && canDiscoverOwner;

    const onDiscover = () => {
        props.onDiscoverSystem(freeDiscovery);
    };

    const goHome = () => {
        props.onLoadSystem({
            root: props.alice,
            system_id: 0,
        });
    }

    const discoverButtonClassName = 'discoverButton' + (canDiscover ? '' : ' disabled');

    return (
        <div className={mainClassName}>
            <div className="paddedInner">
                <div className="title">
                    <span className="titleMain">Universe Map</span>
                    {canDiscoverOwner && canDiscoverBalance
                        ? <span>&nbsp;&nbsp;|&nbsp;&nbsp;Tap a System to open it</span>
                        : !canDiscoverOwner
                            ? <span>&nbsp;&nbsp;|&nbsp;&nbsp;No System discovery allowed in foreign Universe</span>
                            : <span>&nbsp;&nbsp;|&nbsp;&nbsp;Balance too low for Discovery</span>
                    }
                    {freeDiscovery
                        ? <React.Fragment>
                            <span>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                            <span className="freeDiscovery">Free Discovery available!</span>
                        </React.Fragment>
                        : canDiscoverOwner && <React.Fragment>
                            <span>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                            <OfflineBoltIcon fontSize="small"/>
                            <span>1 for Discovery, {blocksLeftDiscovery} Blocks until Free ({blocksLeftTime})</span>
                        </React.Fragment>
                    }
                </div>
                <UniverseMapCanvas 
                    system={props.system}
                    alice={props.alice}
                    universe={props.universe}
                    onLoadSystem={props.onLoadSystem}
                    systemCoords={props.systemCoords}
                />
                <div className={discoverButtonClassName} onClick={canDiscover ? onDiscover : null}>
                    {!freeDiscovery &&
                        <div className="iconWrapper">
                            <OfflineBoltIcon/>
                            <span>1</span>
                        </div>
                    }
                    <span>
                        DISCOVER
                    </span>
                </div>
            </div>
            <div className="homeIcon" onClick={goHome}>
                <HomeIcon fontSize="large"/>
            </div>
        </div>
    );
};
