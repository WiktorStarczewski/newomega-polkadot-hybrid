import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Group, Text } from 'react-konva';
import _ from 'underscore';
import './UniverseMapCanvas.css';
import { isSystemOwner } from '../../definitions/Planets';

// props: universe, system, onDiscoverSystem, onLoadSystem, names, alice, canDiscover, blockNumber, freeActions
export const UniverseMapCanvas = (props) => {
    const childWrap = useRef(null);
    const [height, setHeight] = useState(null);
    const [discoverable, setDiscoverable] = useState(null);
    const BOX_WIDTH = 40;

    const getDiscoverable = () => {
        const discoverable = [];

        _.each(props.universe, (system) => {
            _.each([-1, 0, 1], (offsetX) => {
                _.each([-1, 0, 1], (offsetY) => {
                    const proposedX = system.position.position_x + offsetX;
                    const proposedY = system.position.position_y + offsetY;

                    if (proposedX < 0 || proposedY < 0) {
                        return;
                    }

                    if (!_.find(props.universe, (systemIter) => {
                        return systemIter.position.position_x === proposedX &&
                            systemIter.position.position_y === proposedY;
                    })) {
                        discoverable.push({
                            position: {
                                root: system.position.root,
                                position_x: proposedX,
                                position_y: proposedY,
                            },
                        });
                    }
                });
            });
        });

        return discoverable;
    };

    const isRoot = (system) => {
        return system.position.position_x === 0 &&
            system.position.position_y === 0;
    };

    const isCurrent = (system) => {
        return system.position.position_x === props.system.position.position_x &&
            system.position.position_y === props.system.position.position_y;
    }

    const getColor = (system) => {
        return isSystemOwner(system, props.alice) ? '#73ffbe' : '#FFFFFF';
    };

    const getStrokeColor = (system) => {
        return isCurrent(system) ? '#2196F3' : undefined;
    }

    const getDiscoverableColor = () => {
        return '#767676';
    };

    const getDiscoverableFillColor = () => {
        return props.freeDiscovery ? '#73ffbe' : '#FFFFFF';
    };

    const dragBound = (pos) => {
        const positionsX = _.map(props.universe, (system) => {
            return system.position.position_x;
        });
        const positionsY = _.map(props.universe, (system) => {
            return system.position.position_y;
        });
        const maxX = -Math.max(...positionsX) - 1;
        const maxY = -Math.max(...positionsY) - 1;

        return {
            x: Math.min(pos.x, 0),
            y: Math.min(pos.y, 0),
            // TODO add bounds equal to max position of all
        };
    };

    const onStageClick = (e) => {
        const x = !_.isUndefined(e.evt.layerX)
            ? Math.floor(e.evt.layerX / BOX_WIDTH) // click
            : Math.floor(e.currentTarget.pointerPos.x / BOX_WIDTH); // tap
        const y = !_.isUndefined(e.evt.layerY)
            ? Math.floor(e.evt.layerY / BOX_WIDTH)
            : Math.floor(e.currentTarget.pointerPos.y / BOX_WIDTH);

        const discoverableFound = _.find(discoverable, (disIter) => {
            return disIter.position.position_x === x &&
                disIter.position.position_y === y;
        });

        if (props.canDiscover && discoverableFound) {
            return props.onDiscoverSystem(discoverableFound, props.freeDiscovery);
        }

        const systemFound = _.find(props.universe, (sysIter) => {
            return sysIter.position.position_x === x &&
                sysIter.position.position_y === y;
        });

        if (systemFound) {
            props.onLoadSystem(systemFound);
        }
    }

    const HEIGHT = 100;

    useEffect(() => {
        setHeight(childWrap.current.clientHeight);
        setDiscoverable(getDiscoverable());
    }, [childWrap.current, props.universe]);

    return (
        <div className="UniverseMapCanvas">
            <div ref={childWrap} className="canvasInner">
                {height && discoverable &&
                    <Stage
                        draggable={true}
                        width={window.innerWidth / 2}
                        height={height}
                        dragBoundFunc={dragBound}
                        onClick={onStageClick}
                        onTap={onStageClick}
                    >
                        <Layer>
                            {_.map(props.universe, (system, index) => {
                                let statusText = '';
                                if (system.gateway_out.built) {
                                    statusText += '⬆';
                                }
                                if (system.gateway_in.built) {
                                    statusText += '⬇';
                                }

                                return (
                                    <Group 
                                        key={index}
                                    >
                                        <Rect
                                            x={system.position.position_x * BOX_WIDTH + 1}
                                            y={system.position.position_y * BOX_WIDTH + 1}
                                            width={BOX_WIDTH - 2}
                                            height={BOX_WIDTH - 2}
                                            fill={getColor(system)}
                                            stroke={getStrokeColor(system)}
                                        />
                                        {!_.isEmpty(statusText) &&
                                            <Text
                                                text={statusText}
                                                padding={4}
                                                fontSize={16}
                                                x={system.position.position_x * BOX_WIDTH + 1}
                                                y={system.position.position_y * BOX_WIDTH + 1}
                                            />
                                        }
                                    </Group>
                                );
                            })}
                            {props.canDiscover && _.map(discoverable, (system, index) => (
                                <Group
                                    key={index}
                                >
                                    <Rect
                                        x={system.position.position_x * BOX_WIDTH + 1}
                                        y={system.position.position_y * BOX_WIDTH + 1}
                                        width={BOX_WIDTH - 2}
                                        height={BOX_WIDTH - 2}
                                        fill={getDiscoverableColor()}
                                    />
                                    <Text
                                        text="+"
                                        fill={getDiscoverableFillColor()}
                                        fontSize={24}
                                        x={system.position.position_x * BOX_WIDTH + 1 + BOX_WIDTH / 2 - 8}
                                        y={system.position.position_y * BOX_WIDTH + 1 + BOX_WIDTH / 2 - 12}
                                    />
                                </Group>
                            ))}
                        </Layer>
                    </Stage>
                }
            </div>
        </div>
    );
}
