import React, { useEffect, useState } from 'react';
import './Minerals.css';
import { MineralsAssets } from '../../definitions/Planets';
import CloseIcon from '@material-ui/icons/Close';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import { MineralsTrade } from './MineralsTrade';
import { MineralsOffer } from './MineralsOffer';
import { Range } from 'react-range';
import { isSystemOwner } from '../../definitions/Planets';
import _, { select } from 'underscore';
import numeral from 'numeral';

// props: minerals, mineralExpanded, setMineralExpanded, onClose, system, ownTrades, systemTrades, alice
export const Minerals = (props) => {
    const [selectedMineralIndex, setSelectedMineralIndex] = useState(props.mineralExpanded ? 0 : null);

    const getTradeValuesOfferDefault = (index) => {
        const safeIndex = !index && index !== 0 ? selectedMineralIndex : index;
        return [
            safeIndex !== null ? props.ownTrades[safeIndex].amount : 0,
        ];
    };
    
    const [tradeValuesOffer, setTradeValuesOffer] = useState(getTradeValuesOfferDefault());
    const [tradeValuesTrade, setTradeValuesTrade] = useState([0]);
    
    const onMineralClick = (index) => {
        setTradeValuesOffer(getTradeValuesOfferDefault(index));
        setTradeValuesTrade([0]);

        if (index === selectedMineralIndex && props.mineralExpanded) {
            props.setMineralExpanded(false);
        } else if (index === selectedMineralIndex && !props.mineralExpanded) {
            props.setMineralExpanded(true);
        } else {
            props.setMineralExpanded(true);
            setSelectedMineralIndex(index);
        }
    };

    const formatWithZero = (num) => {
        return num === 0 ? '0' : numeral(num).format('0.00a');
    }

    const showMinerals = () => {
        return (
            <React.Fragment>
                <div className="minerals">
                    {_.map(MineralsAssets, (mineralAsset, index) => {
                        const mineralClassName = 'mineral' +
                            (selectedMineralIndex !== index && props.mineralExpanded ? ' unselected' : '');

                        return (
                            <div className={mineralClassName} key={index} onClick={() => { onMineralClick(index); }}>
                                <img src={mineralAsset.asset} draggable={false}/>
                                <div className="moreDetails">
                                    <span className="mineralName">{formatWithZero(props.minerals[index])} {mineralAsset.name}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {selectedMineralIndex !== null && 
                    <div className="mineralDetail">
                        <div className="closeDetailPanel mineralDetailPanel"
                            onClick={() => { onMineralClick(selectedMineralIndex) }}>
                            <ArrowDropUpIcon size="large"/>
                        </div>
                        <MineralsOffer
                            minerals={props.minerals}
                            selectedMineralIndex={selectedMineralIndex}
                            ownTrades={props.ownTrades}
                            tradeValues={tradeValuesOffer}
                            setTradeValues={setTradeValuesOffer}
                            onRegisterSale={props.onRegisterSale}/>
                        {props.system.position.root !== props.alice &&
                            <MineralsTrade 
                                minerals={props.minerals}
                                selectedMineralIndex={selectedMineralIndex}
                                systemTrades={props.systemTrades}
                                tradeValues={tradeValuesTrade}
                                setTradeValues={setTradeValuesTrade}
                                onTrade={props.onTrade}/>
                        }
                    </div>
                }
            </React.Fragment>
        );
    };

    const mineralsClassName = 'Minerals' + (props.mineralExpanded ? ' expanded' : '');

    return (
        <div className={mineralsClassName}>
            {showMinerals()}
        </div>
    );
};
