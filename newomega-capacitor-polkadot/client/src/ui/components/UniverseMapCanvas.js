import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Image, Rect, Group, Text, Line } from 'react-konva';
import _ from 'underscore';
import './UniverseMapCanvas.css';
import { isSystemOwner } from '../../definitions/Planets';
import useImage from 'use-image';


const spiral = (n) => {
    const r = Math.floor((Math.sqrt(n + 1) - 1) / 2) + 1;
    const p = (8 * r * (r - 1)) / 2;
    const en = r * 2;
    const a = (1 + n - p) % (r * 8);
    const pos = [0, 0, r];
    switch (Math.floor(a / (r * 2))) {
        case 0:
            {
                pos[0] = a - r;
                pos[1] = -r;
            }
            break;
        case 1:
            {
                pos[0] = r;
                pos[1] = (a % en) - r;

            }
            break;
        case 2:
            {
                pos[0] = r - (a % en);
                pos[1] = r;
            }
            break;
        case 3:
            {
                pos[0] = -r;
                pos[1] = r - (a % en);
            }
            break;
    }
    return pos;
}


// props: universe, system, onDiscoverSystem, onLoadSystem, names, alice, canDiscover, blockNumber, freeActions
export const UniverseMapCanvas = (props) => {
    const childWrap = useRef(null);
    const [height, setHeight] = useState(null);
    const [systemImage] = useImage('assets/images/system_icon.png');
    const BOX_WIDTH = 100;
    const INNER_PADDING = 5;
    const allSystems = useRef(null);

    const systemIdToPosition = (systemId) => {
        if (systemId === 0) {
            return {
                x: 0,
                y: 0,
            };
        }

        const pos = spiral(systemId - 1);

        return {
            x: pos[0],
            y: pos[1],
        };
    };

    const getSystems = () => {
        const lines = [];
        const images = [];
        const gatewayMarkers = [];
        allSystems.current = [];

        _.each(_.range(props.universe.length + 1), (systemId) => {
            const position = systemIdToPosition(systemId);
            const prevPosition = systemId > 0 && systemIdToPosition(systemId - 1);
            const isExistingSystem = systemId < props.universe.length;
            const system = isExistingSystem && props.universe[systemId];
            const isCurrentSystem = isExistingSystem && props.systemCoords.system_id === systemId;
            const isRootSystem = isExistingSystem && systemId === 0;

            if (systemId > 0 && isExistingSystem) {
                lines.push(<Line 
                    x={prevPosition.x * BOX_WIDTH + BOX_WIDTH / 2}
                    y={prevPosition.y * BOX_WIDTH + BOX_WIDTH / 2}
                    points={[0, 0, (position.x - prevPosition.x) * BOX_WIDTH, (position.y - prevPosition.y) * BOX_WIDTH]}
                    stroke="white"
                    opacity={1}  
                    strokeWidth={3}  
                    key={systemId}                        
                />);
            }

            images.push(
                <Group key={systemId} opacity={isExistingSystem ? 1 : 0.3}>
                    <Image 
                        image={systemImage}
                        shadowColor={isCurrentSystem ? '#FFEE58' : '#FFFFFF'}
                        shadowBlur={isCurrentSystem || isRootSystem ? 24 : 0}
                        shadowOpacity={1}
                        x={position.x * BOX_WIDTH + INNER_PADDING}
                        y={position.y * BOX_WIDTH + INNER_PADDING}
                        width={BOX_WIDTH - 2 * INNER_PADDING}
                        height={BOX_WIDTH - 2 * INNER_PADDING}
                    />
                </Group>
            );

            const GATEWAY_MARKER_FONT_SIZE = 24;
            if (system && system.gateway_in.built) {
                gatewayMarkers.push(
                    <Text 
                        key={systemId * 2}
                        x={position.x * BOX_WIDTH + INNER_PADDING}
                        y={position.y * BOX_WIDTH + INNER_PADDING}
                        stroke="white"
                        fontSize={GATEWAY_MARKER_FONT_SIZE}
                        text="▼"/>
                );
            }

            if (system && system.gateway_out.built) {
                gatewayMarkers.push(
                    <Text 
                        key={systemId * 2 + 1}
                        x={(position.x + 1) * BOX_WIDTH - INNER_PADDING - GATEWAY_MARKER_FONT_SIZE}
                        y={position.y * BOX_WIDTH + INNER_PADDING}
                        stroke="white"
                        fontSize={GATEWAY_MARKER_FONT_SIZE}
                        text="▲"/>
                );
            }

            if (isExistingSystem) {
                allSystems.current.push({
                    x: position.x,
                    y: position.y,
                    systemId,
                });
            }
        });

        return (
            <React.Fragment>
                {lines}
                {images}
                {gatewayMarkers}
            </React.Fragment>
        );
    }


    // const dragBound = (pos) => {
    //     const positionsX = _.map(props.universe, (system) => {
    //         return system.position.position_x;
    //     });
    //     const positionsY = _.map(props.universe, (system) => {
    //         return system.position.position_y;
    //     });
    //     const maxX = -Math.max(...positionsX) - 1;
    //     const maxY = -Math.max(...positionsY) - 1;

    //     return {
    //         x: Math.min(pos.x, 0),
    //         y: Math.min(pos.y, 0),
    //         // TODO add bounds equal to max position of all
    //     };
    // };

    const onStageClick = (e) => {
        const applyScrollX = (value) => {
            return value + e.currentTarget.offsetX() - e.currentTarget.position().x;
        }
        const applyScrollY = (value) => {
            return value + e.currentTarget.offsetY() - e.currentTarget.position().y;
        }

        const x = e.evt.type.indexOf('touch') < 0
            ? Math.floor(applyScrollX(e.evt.layerX) / BOX_WIDTH) // click
            : Math.floor(applyScrollX(e.currentTarget.pointerPos.x) / BOX_WIDTH); // tap
        const y = e.evt.type.indexOf('touch') < 0
            ? Math.floor(applyScrollY(e.evt.layerY) / BOX_WIDTH) // click
            : Math.floor(applyScrollY(e.currentTarget.pointerPos.y) / BOX_WIDTH); // tap

        const systemFound = _.findWhere(allSystems.current, {
            x,
            y,
        });

        if (systemFound) {
            props.onLoadSystem({
                root: props.system.position.root,
                system_id: systemFound.systemId,
            });
        }
    }

    useEffect(() => {
        setHeight(childWrap.current.clientHeight);
    }, [childWrap.current]);

//                        dragBoundFunc={dragBound}
//                        onClick={onStageClick}
//                        onTap={onStageClick}


    return (
        <div className="UniverseMapCanvas">
            <div ref={childWrap} className="canvasInner">
                {height &&
                    <Stage
                        draggable={true}
                        width={window.innerWidth}
                        height={height}
                        offsetX={-window.innerWidth / 2 + (BOX_WIDTH / 2)}
                        offsetY={-height / 2 + (BOX_WIDTH / 2)}
                        onClick={onStageClick}
                        onTap={onStageClick}
                    >
                        <Layer> 
                            {getSystems()}
                        </Layer>
                    </Stage>
                }
            </div>
        </div>
    );
}
