import React, { useEffect, useState } from 'react';
import './MineralsOffer.css';
import { MineralsAssets } from '../../definitions/Planets';
import { Range } from 'react-range';
import numeral from 'numeral';
import _ from 'underscore';

// props: selectedMineralIndex, tradeValues, setTradeValues, ownTrades
export const MineralsOffer = (props) => {
    const getSelectedTradeMineralIndexDefault = () => {
        return props.ownTrades[props.selectedMineralIndex].exchange_for;
    };

    const [selectedTradeMineralIndex, setSelectedTradeMineralIndex] = useState(getSelectedTradeMineralIndexDefault());
    const onChangeTradeValue = (newValues) => {
        props.setTradeValues(newValues);
    };

    useEffect(() => {
        if (props.selectedMineralIndex === selectedTradeMineralIndex) {
            setSelectedTradeMineralIndex((getSelectedTradeMineralIndexDefault() + 1) % MineralsAssets.length);
        } else {
            setSelectedTradeMineralIndex(getSelectedTradeMineralIndexDefault());
        }
    }, [props.selectedMineralIndex]);

    const renderTradeTrack = ({ props, children }, disabled) => (
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
                    : 'Move the slider to adjust the trade'
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

    const tradeValue = numeral(props.tradeValues[0]).format('0.0a');
    const renderTradeThumb = ({ props }) => (
        <div
            {...props}
            className="tradeThumb"
            style={{
                ...props.style,
            }}
        >
            {tradeValue}
        </div>
    );

    const maxTrade = props.minerals[props.selectedMineralIndex] + props.ownTrades[props.selectedMineralIndex].amount;
    const formatWithZero = (num) => {
        return num === 0 ? '0' : numeral(num).format('0.00a');
    }
    const currentSellingAmount = props.selectedMineralIndex !== null ? props.ownTrades[props.selectedMineralIndex].amount : 0;

    const renderOfferMineralSelector = () => (
        <div className="miniMineralAssetSelector">
            {_.compact(_.map(MineralsAssets, (mineralAsset, index) => {
                if (index === props.selectedMineralIndex) {
                    return;
                }
                
                const clName = 'miniMineralAsset ' + (selectedTradeMineralIndex === index ? 'selected' : '');
                return (
                    <div 
                        className={clName}
                        key={index} 
                        onClick={() => { 
                            if (index !== props.selectedMineralIndex) { 
                                setSelectedTradeMineralIndex(index);
                            } 
                        }}
                    >
                        <img src={mineralAsset.asset} draggable={false}/>
                    </div>
                );
            }))}  
        </div>
    );

    const onRegisterSale = () => {
        props.onRegisterSale(props.selectedMineralIndex, selectedTradeMineralIndex, props.tradeValues[0]);
    };

    const tradeEnabled = true;
    const tradeButtonClassName = 'mineralAction' + (tradeEnabled ? '' : ' disabled');

    return (
        <div className="MineralsOffer">
            <div className="mineralStats mineralDetailPanel">
                {currentSellingAmount > 0 &&
                    <div className="registerInfo">
                        Currently selling: {numeral(currentSellingAmount).format('0.00a')}
                    </div>
                }
                <div className="registerInfo">
                    You can register {formatWithZero(props.minerals[props.selectedMineralIndex])} to trade for:
                </div>
                {renderOfferMineralSelector()}
                <div className="tradeBreak"/>
                <div className="tradeValueSelector">
                    {maxTrade > 0 && 
                        <Range
                            values={props.tradeValues}
                            step={1}
                            min={0}
                            max={maxTrade}
                            onChange={onChangeTradeValue}
                            renderTrack={renderEnabledTradeTrack}
                            renderThumb={renderTradeThumb}
                        />
                    }
                    {maxTrade === 0 &&
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
            <div className="mineralActions mineralDetailPanel">
                <div className={tradeButtonClassName} onClick={tradeEnabled ? onRegisterSale : null}>
                    Create Sale
                </div>
            </div>
        </div>
    );
};
