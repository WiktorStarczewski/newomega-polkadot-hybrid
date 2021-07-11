import React, { useEffect, useState } from 'react';
import './MineralsTrade.css';
import { MineralsAssets } from '../../definitions/Planets';
import { Range } from 'react-range';
import numeral from 'numeral';
import _ from 'underscore';

// props: selectedMineralIndex, tradeValues, setTradeValues, systemTrades
export const MineralsTrade = (props) => {
    const tradeFor = props.systemTrades[props.selectedMineralIndex];
    const tradeWhat = props.selectedMineralIndex;
    const maxTrade = tradeFor ? Math.min(props.minerals[tradeFor.exchange_for], tradeFor.amount) : 0;
    const formatWithZero = (num) => {
        return num === 0 ? '0' : numeral(num).format('0.00a');
    }

    const onChangeTradeValue = (newValues) => {
        props.setTradeValues(newValues);
    };

    const renderTradeTrack = ({ props, children }, disabled) => (
        <div
            {...props}
            className="tradeTrack"
            style={{
                ...props.style,
            }}
        >
            <div className="infoText">
                {tradeFor && tradeFor.amount > 0 
                    ? disabled
                        ? <span>Not enough Minerals</span>
                        : <span>Max trade: {formatWithZero(maxTrade)}</span>
                    : <span>They dont need this resource</span>
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

    const renderOfferMineralSelector = () => {
        const clName = 'miniMineralAsset selected';
        const mineralAsset = MineralsAssets[tradeFor.exchange_for];

        return (
            <div className="miniMineralAssetSelector">
                <div 
                    className={clName}
                >
                    <img src={mineralAsset.asset} draggable={false}/>
                </div>
            </div>
        );
    };

    const onTrade = () => {
        props.onTrade(tradeFor.exchange_for, tradeWhat, props.tradeValues[0]);
    };

    const tradeEnabled = props.tradeValues[0] > 0;
    const tradeButtonClassName = 'mineralAction' + (tradeEnabled ? '' : ' disabled');

    return (
        <div className="MineralsTrade">
            <div className="mineralStats mineralDetailPanel">
                <div className="registerInfo">
                    {tradeFor && tradeFor.amount > 0 &&
                        <span>They want to sell up to {tradeFor.amount} {MineralsAssets[tradeWhat].name} for {MineralsAssets[tradeFor.exchange_for].name}</span>
                    }
                </div>
                {tradeFor && tradeFor.amount > 0 && renderOfferMineralSelector()}
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
                <div className={tradeButtonClassName} onClick={tradeEnabled ? onTrade : null}>
                    Buy
                </div>
            </div>
        </div>
    );
};
