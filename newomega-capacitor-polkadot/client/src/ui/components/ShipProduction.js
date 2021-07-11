import React, { useEffect, useState } from 'react';
import './ShipProduction.css';
import { Ships } from '../../definitions/Ships';
import { MineralsAssets } from '../../definitions/Planets';
import CloseIcon from '@material-ui/icons/Close';
import { Range } from 'react-range';
import { OmegaDefaults } from '../../definitions/OmegaDefaults';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import _ from 'underscore';
import numeral from 'numeral';

// props: minerals, shipExpanded, setShipExpanded, onClose, playerShips
export const ShipProduction = (props) => {
    const [selectedShipIndex, setSelectedShipIndex] = useState(props.shipExpanded ? 0 : null);    
    const [tradeValues, setTradeValues] = useState([0]);
    
    const onShipClick = (index) => {
        setTradeValues([0]);

        if (index === selectedShipIndex && props.shipExpanded) {
            props.setShipExpanded(false);
        } else if (index === selectedShipIndex && !props.shipExpanded) {
            props.setShipExpanded(true);
        } else {
            props.setShipExpanded(true);
            setSelectedShipIndex(index);
        }
    };

    useEffect(() => {
        setTradeValues([0]);
    }, [props.playerShips]);

    const onChangeTradeValue = (newValues) => {
        setTradeValues(newValues);
    };
    
    const onProduce = () => {
        props.onProduce(selectedShipIndex, tradeValues[0]);
    };

    const renderTradeTrack = ({ props, children}, disabled) => (
        <div
            {...props}
            className="tradeTrack"
            style={{
                ...props.style,
            }}
        >
            <div className="infoText">
                {disabled 
                    ? 'Not enough Minerals'
                    : 'Move the slider to adjust number of ships'
                }
            </div>
            {children}
        </div>
    );

    const renderEnabledTradeTrack = ({ props, children }) => {
        return renderTradeTrack({ props, children }, false);
    };

    const renderDisabledTradeTrack = ({ props, children }) => {
        return renderTradeTrack({ props, children }, true);
    };

    const renderTradeThumb = ({ props }) => (
        <div
            {...props}
            className="tradeThumb"
            style={{
                ...props.style,
            }}
        >
            {tradeValues[0]}
        </div>
    );

    const getShipCost = () => {
        return Ships[selectedShipIndex].stats.cp * OmegaDefaults.SHIP_COST_PER_CP;
    };

    const maxAvailable = selectedShipIndex !== null
        ? Math.floor(props.minerals[selectedShipIndex] / getShipCost())
        : 0;
    const canProduce = tradeValues[0] > 0;
    const produceClassName = 'shipAction' + (canProduce ? '' : ' disabled');
    const currentCost = selectedShipIndex !== null ? tradeValues[0] * getShipCost() : 0;

    const showMinerals = () => {
        return (
            <React.Fragment>
                <div className="ships">
                    {_.map(Ships, (shipAsset, index) => {
                        const shipClassName = 'ship' +
                            (selectedShipIndex !== index && props.shipExpanded ? ' unselected' : '');

                        return (
                            <div className={shipClassName} key={index} onClick={() => { onShipClick(index); }}>
                                <img src={shipAsset.thumbnail} draggable={false}/>
                                <div className="moreDetails">
                                    <span className="shipName">{numeral(props.playerShips[index]).format('0a')} {shipAsset.name}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {selectedShipIndex !== null && 
                    <div className="shipDetail">
                        <div className="closeDetailPanel shipDetailPanel"
                            onClick={() => { onShipClick(selectedShipIndex) }}>
                            <ArrowDropUpIcon size="large"/>
                        </div>
                        <div className="shipProductionInner">
                            <div className="shipStats shipDetailPanel">
                                <div>
                                    Shipyard: {props.playerShips[selectedShipIndex]}
                                </div>
                                <div className="tradeBreak"/>
                                <div>
                                    Cost Per Ship: {getShipCost()} {MineralsAssets[selectedShipIndex].name}
                                </div>
                                <div>
                                    In Storage: {props.minerals[selectedShipIndex]} {MineralsAssets[selectedShipIndex].name}
                                </div>
                                <div>
                                    Spending: {currentCost} {MineralsAssets[selectedShipIndex].name}
                                </div>
                                <div className="tradeBreak"/>
                                <div className="tradeValueSelector">
                                    {maxAvailable > 0 &&
                                        <Range
                                            values={tradeValues}
                                            step={1}
                                            min={0}
                                            max={maxAvailable}
                                            onChange={onChangeTradeValue}
                                            renderTrack={renderEnabledTradeTrack}
                                            renderThumb={renderTradeThumb}
                                        />
                                    }
                                    {maxAvailable === 0 &&
                                        <Range
                                            values={[0]}
                                            step={1}
                                            min={0}
                                            max={1}
                                            disabled={true}
                                            renderTrack={renderDisabledTradeTrack}
                                            renderThumb={renderTradeThumb}
                                        />                                        
                                    }
                                </div>
                            </div>
                            <div className="shipActions shipDetailPanel">
                                <div className={produceClassName} onClick={canProduce ? onProduce : null}>
                                    Produce
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </React.Fragment>
        );
    };

    const mineralsClassName = 'ShipProduction' + (props.shipExpanded ? ' expanded' : '');

    return (
        <div className={mineralsClassName}>
            {showMinerals()}
        </div>
    );
};
