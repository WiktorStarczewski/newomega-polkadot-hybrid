import React, { useEffect, useState } from 'react';
import './SystemActions.css';
import { Gateway, Embassy } from '../../definitions/Planets';

// props: system, names, onTeleportGateway, onBuildGateway, planetExpanded, onEmbassyOpen
export const SystemActions = (props) => {
    const onTeleportGatewayOut = () => {
        props.onTeleportGateway(props.system.gateway_out.target);
    }

    const onTeleportGatewayIn = () => {
        props.onTeleportGateway(props.system.gateway_in.target);
    }

    const onBuildGateway = () => {
        props.onBuildGateway();
    }

    const onEmbassyOpen = () => {
        props.onEmbassyOpen();
    }

    const gatewayOutAction = () => {
        const canBuildGateway = props.system.position.root ===
            props.alice;
        const buildGatewayActionClass = 'gatewayAction' +
            (canBuildGateway ? '' : ' disabled');

        return props.system.gateway_out.built
            ? (
                <div
                    className="gatewayAction"
                    onClick={onTeleportGatewayOut}
                >
                    Teleport
                </div>
            )
            : (
                <div
                    className={buildGatewayActionClass}
                    onClick={canBuildGateway ? onBuildGateway : undefined}
                >
                    Build
                </div>
            );
    };

    const gatewayInAction = () => {
        return props.system.gateway_in.built
            ? (
                <div
                    className="gatewayAction"
                    onClick={onTeleportGatewayIn}
                >
                    Teleport
                </div>
            ) : (
                <div
                    className="gatewayAction disabled"
                >
                    Teleport
                </div>
            );
    };

    const embassyAction = () => {
        return (
            <div
                className="gatewayAction disabled"
            >
                War
            </div>
        );
    };

    const mainClassName = 'SystemActions' + (props.planetExpanded ? ' shrank' : '');
    return (
        <div className={mainClassName}>
            <div className="gateway">
                <img src={Gateway.assetOut} draggable={false}/>
                <div>
                    Gateway
                </div>
                <div className="gatewayTarget">
                    To: {props.names[props.system.gateway_out.target.root]}
                </div>
                {gatewayOutAction()}
            </div>
            <div className="gateway">
                <img src={Gateway.assetIn} draggable={false}/>
                <div>
                    Portal
                </div>
                <div className="gatewayTarget">
                    From: {props.names[props.system.gateway_in.target.root]}
                </div>
                {gatewayInAction()}
            </div>
            {props.system.position.root !== props.alice && 
                <div className="gateway">
                    <img src={Embassy.asset} draggable={false}/>
                    <div>
                        Embassy
                    </div>
                    <div className="gatewayTarget">
                        Status: Peace
                    </div>
                    {embassyAction()}
                </div>
            }
        </div>
    );
};
