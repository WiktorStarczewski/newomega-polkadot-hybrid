import React, { useEffect, useState } from 'react';
import { ModuleInfo } from './ModuleInfo';
import './AuctionInfo.css';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import { picoToUnits } from '../../definitions/OmegaDefaults';

export const AuctionInfo = (props) => {
    const isOwnAuction = props.seller === props.alice;

    const cancelAuction = () => {
        props.onCancel(props.tokenId);
    }

    const buyAuction = () => {
        props.onBuy(props.seller, props.tokenId, props.price);
    }

    const canBuy = props.balance >= props.price;
    const buyAuctionButtonClassName = 'buyAuctionButton' + (canBuy ? '' : ' disabled');

    return (
        <div className="AuctionInfo">
            <ModuleInfo 
                module={props.module}
                tokenId={props.tokenId}/>
            <div className="price">
                <OfflineBoltIcon fontSize="small"/>
                {picoToUnits(props.price)}
            </div>
            {!isOwnAuction && 
                <div className={buyAuctionButtonClassName} onClick={canBuy ? buyAuction : null}>
                    Buy
                </div>
            }
            {isOwnAuction &&
                <div className="cancelAuctionButton" onClick={cancelAuction}>
                    Cancel
                </div>
            }
        </div>
    )
};