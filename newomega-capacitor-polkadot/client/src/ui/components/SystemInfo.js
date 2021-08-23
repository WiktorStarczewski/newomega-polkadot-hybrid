import React, { useEffect, useState } from 'react';
import './SystemInfo.css';
import { isSystemOwner, getOwnedPlanets, MineralsAssets } from '../../definitions/Planets';
import { Ships } from '../../definitions/Ships';
import _ from 'underscore';
import numeral from 'numeral';

// props: system, names, alice, minerals, playerShips
export const SystemInfo = (props) => {
    const isOwner = isSystemOwner(props.system, props.alice);
    const ownedPlanets = getOwnedPlanets(props.system, props.alice);
    const ownerClassName = 'owner' + (isOwner ? ' own' : '');

    const formatWithZero = (num) => {
        return num === 0 ? '0' : numeral(num).format('0.0a');
    };

    const getResources = () => {
        return _.map(MineralsAssets, (mineral, index) => {
            return mineral.name + ' ' + formatWithZero(props.minerals[index]);
        }).join(' | ');
    };

    const getShips = () => {
        return _.map(Ships, (ship, index) => {
            return ship.name + ' ' + numeral(props.playerShips[index]).format('0a');
        }).join(' | ');
    };

    // console.log('names ', props.names);

    return (
        <div className="SystemInfo">
            <div className={ownerClassName}>
                <div className="status">
                    <span>System ID: </span>
                    <span className="systemRoot">{props.names[props.system.position.root]}</span>
                    <span className="systemRoot"> {props.system.position.system_id}</span>
                </div>
                <div className="status resources">
                    {getResources()}
                </div>
                <div className="status ships">
                    {getShips()}
                </div>
            </div>
        </div>
    );
};
