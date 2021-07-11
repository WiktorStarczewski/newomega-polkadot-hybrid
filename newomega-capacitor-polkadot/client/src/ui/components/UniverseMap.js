import React, { useEffect, useState } from 'react';
import { blocksTillNextFreeDiscovery, blocksToTimeString, isDiscoveryFree, unitsToPico } from '../../definitions/OmegaDefaults';
import './UniverseMap.css';
import { UniverseMapCanvas } from './UniverseMapCanvas';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';

// props: universe, onDiscoverSystem, onLoadSystem, names, planetExpanded, blockNumber, freeActions, balance
export const UniverseMap = (props) => {
    const mainClassName = 'UniverseMap' + (props.planetExpanded ? ' shrank' : '');
    const freeDiscovery = isDiscoveryFree(props.blockNumber, props.freeActions.discovery);
    const blocksLeftDiscovery = blocksTillNextFreeDiscovery(props.blockNumber, props.freeActions.discovery);
    const blocksLeftTime = !freeDiscovery && blocksToTimeString(blocksLeftDiscovery);
    const canDiscoverOwner = props.alice === props.system.position.root;
    const canDiscoverBalance = freeDiscovery || props.balance >= unitsToPico(1);

    return (
        <div className={mainClassName}>
            <div className="paddedInner">
                <div className="title">
                    <span className="titleMain">Universe Map</span>
                    {canDiscoverOwner && canDiscoverBalance
                        ? <span>&nbsp;&nbsp;|&nbsp;&nbsp;Tap + to discover new Systems</span>
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
                    universe={props.universe}
                    system={props.system}
                    names={props.names}
                    alice={props.alice}
                    onDiscoverSystem={props.onDiscoverSystem}
                    onLoadSystem={props.onLoadSystem}
                    canDiscover={canDiscoverOwner && canDiscoverBalance}
                    freeDiscovery={freeDiscovery}
                />
            </div>
        </div>
    );
};
