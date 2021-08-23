import React, { useState, useRef, useEffect } from 'react';
import _ from 'underscore';
import './CompactShipSelection.css';
import { Engine, Scene, Vector3, AssetsManager, Layer, Color3, Viewport, Frustum, Matrix,
    HighlightLayer, StandardMaterial, Texture, ArcRotateCamera, HemisphericLight, Color4 } from '@babylonjs/core';
import '@babylonjs/loaders';
import { OBJFileLoader } from '@babylonjs/loaders';
import { Ships, MAX_OFEACH_SHIP, Targeting, TargetingToIcon, TargetingToDescription,
    TargetingToTitle } from '../definitions/Ships';
import { tokenIdToName } from '../definitions/Modules';
import { OmegaLoadingScreen } from '../common/OmegaLoadingScreen';
import { OmegaDefaults } from '../definitions/OmegaDefaults';
import { BetSelector } from '../ui/components/BetSelector';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import HelpIcon from '@material-ui/icons/Help';
import Tour from 'reactour';
import MoreIcon from '@material-ui/icons/More';
import InfoIcon from '@material-ui/icons/Info';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Repeatable from 'react-repeatable';
import Drawer from '@material-ui/core/Drawer';
import numeral from 'numeral';
import { ModuleInfo } from '../ui/components/ModuleInfo';


const getCurrentCP = (selectedShips) => {
    return _.reduce(selectedShips, (memo, num, index) => {
        return memo + (num || 0) * Ships[index].stats.cp;
    }, 0);
};

// props: onDone, onCancel, enemyShips, enemyModules, playerShips, modules, balance, selfSelection, maxBet,
//  defaultTargeting
export const CompactShipSelection = (props) => {
    const defaultShips = props.defaultShips || [0, 0, 0, 0];
    const [currentCp, setCurrentCp ] = useState(getCurrentCP(defaultShips));
    const currentShipRef = useRef(0);
    const [currentShip, setCurrentShip] = useState(0);
    const [selectedShips, setSelectedShips] = useState(defaultShips);
    const [selectedModules, setSelectedModules] = useState(props.defaultModules || [null, null, null, null]);
    const [selectedTargeting, setSelectedTargeting] = useState(props.defaultTargeting || Targeting.Furthest);
    const [choosingModuleFor, setChoosingModuleFor] = useState(null);
    const [resourcesLoaded, setResourcesLoaded] = useState(false);
    const [modulesPanelOpen, setModulesPanelOpen] = useState(false);
    const [targetingPanelOpen, setTargetingPanelOpen] = useState(false);
    const [infoVisible, setInfoVisible] = useState(false);
    const [bet, setBet] = useState(OmegaDefaults.MIN_BET);
    const [isTourOpen, setIsTourOpen] = useState(false);
    const reactCanvas = useRef(null);
    const maxCp = props.enemyShips && getCurrentCP(props.enemyShips);

    const loadSpecificShip = (shipIndex) => {
        currentShipRef.current = shipIndex;
        setCurrentShip(shipIndex);
    }

    const addShip = (currentShip) => {
        const cost = Ships[currentShip].stats.cp;
        const currentCp = getCurrentCP(selectedShips);
        const currentNumberOfShips = selectedShips[currentShip] || 0;

        const canAddShip =
            (!props.enemyShips || (currentCp + cost <= maxCp)) &&
            selectedShips[currentShip] < MAX_OFEACH_SHIP &&
            (!props.playerShips || (currentNumberOfShips + 1 <= props.playerShips[currentShip] + defaultShips[currentShip]));

        if (canAddShip) {
            const newShips = _.clone(selectedShips);
            newShips[currentShip] = currentNumberOfShips + 1;
            setSelectedShips(newShips);
            setCurrentCp(getCurrentCP(newShips));
        }
    };

    const removeShip = (currentShip) => {
        if (selectedShips[currentShip] > 0) {
            const newShips = _.clone(selectedShips);
            newShips[currentShip]--;
            setSelectedShips(newShips);
            setCurrentCp(getCurrentCP(newShips));
        }
    };

    const onDone = () => {
        props.onDone(selectedShips, selectedModules, bet, selectedTargeting);
    };

    const ShipToPosition = {
        0: new Vector3(4.5, 0, 0),
        1: new Vector3(1.5, 0, 0),
        2: new Vector3(-1.5, 0, 0),
        3: new Vector3(-4.5, 0, 0),
    };

    const afterLoadShip = (scene, rootMesh, shipIndex) => {
        rootMesh.position = Vector3.Zero();
        rootMesh.rotation = Ships[shipIndex].visuals.fightRotationLhs.clone();
        rootMesh.scalingDeterminant = 0.0009 * Ships[shipIndex].scale;
        rootMesh.isVisible = false;

        rootMesh.material = new StandardMaterial(`texture{shipIndex}`, scene);
        rootMesh.material.bumpTexture = new Texture(Ships[shipIndex].asset + Ships[shipIndex].textures.normals, scene);
        rootMesh.material.diffuseTexture = new Texture(Ships[shipIndex].asset + Ships[shipIndex].textures.diffuse, scene);

        rootMesh._shipIndex = shipIndex;
    };

    const loadCurrentShip = (scene) => {
        _.each(scene.meshes, (mesh) => {
            mesh.isVisible = false;
        });

        const currentMeshes = _.where(scene.meshes, {
            _shipIndex: currentShipRef.current,
        });

        _.each(currentMeshes, (mesh) => {
            mesh.isVisible = true;
        });
    };

    const loadResources = (scene) => {
        return new Promise((resolve, reject) => {
            const assetsManager = new AssetsManager(scene);
            _.each(Ships, (ship, index) => {
                const task = assetsManager.addMeshTask(index, '',
                    Ships[index].asset,
                    Ships[index].fileName);
                task.onSuccess = (task) => {
                    afterLoadShip(scene, task.loadedMeshes[0], index);
                    task.loadedMeshes = null;
                    task.reset();
                };
            });

            assetsManager.onFinish = () => {
                resolve();
            };

            scene._assetsManager = assetsManager;

            assetsManager.load();
        });
    };

    const onSceneMount = (canvas, scene) => {
        scene.getEngine().loadingScreen = new OmegaLoadingScreen();
        scene.getEngine().loadingScreen.displayLoadingUI();

        const camera = new ArcRotateCamera('camera1',
            Math.PI / 2, Math.PI / 2, 8.0, Vector3.Zero(), scene);
        camera.minZ = 0.001;
        camera.lowerAlphaLimit = Math.PI / 2;
        camera.upperAlphaLimit = Math.PI / 2;
        camera.lowerBetaLimit = Math.PI / 2;
        camera.upperBetaLimit = Math.PI / 2;
        camera.lowerRadiusLimit = 8.0;
        camera.upperRadiusLimit = 8.0;
        scene.activeCameras.push(camera);
        camera.attachControl(canvas, true);

        const light = new HemisphericLight('light1', new Vector3(0, Math.PI / 2, 0), scene);
        light.intensity = 2.0;

        scene.clearColor = new Color4(0, 0, 0, 0);

        // const background = new Layer('background',
        //     '/assets/images/bgr_ship_selection_ver2.jpg', scene);
        // background.isBackground = true;
        // background.texture.level = 0;
        // background.texture.wAng = 0;

        scene.onBeforeRenderObservable.add(() => {
            const deltaTimeInMillis = scene.getEngine().getDeltaTime();

            _.each(scene.meshes, (mesh) => {
                if (mesh.isVisible) {
                    const rpm = 2;
                    mesh.rotation.y +=
                        ((rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000));
                    mesh.rotation.z +=
                        ((rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000));
                }
            });
        });

        scene.getEngine().runRenderLoop(() => {
            loadCurrentShip(scene);
            scene.render();
        });

        loadResources(scene).then(() => {
            setResourcesLoaded(true);
        });
    };

    useEffect(() => {
        if (reactCanvas.current) {
            const canvas = document.createElement('canvas');
            reactCanvas.current.appendChild(canvas);

            const engine = new Engine(canvas, true, null, true);
            engine.getCaps().parallelShaderCompile = false;
            // engine.disableTextureBindingOptimization = true;
            const scene = new Scene(engine);
            scene.highlightLayer = new HighlightLayer('hl1', scene);
            scene.highlightLayer.blurHorizontalSize = 1.0;
            scene.highlightLayer.blurVerticalSize = 1.0;

            OBJFileLoader.SKIP_MATERIALS = true;

            if (scene.isReady()) {
                onSceneMount(canvas, scene);
            } else {
                scene.onReadyObservable.addOnce(scene => onSceneMount(canvas, scene));
            }

            const resize = () => {
                scene.getEngine().resize();
            }

            if (window) {
                window.addEventListener('resize', resize);
            }

            return () => {
                scene._assetsManager.reset();
                scene.highlightLayer.removeAllMeshes();
                scene.highlightLayer.dispose();
                _.each(scene.meshes, (mesh) => {
                    if (mesh.material) {
                        mesh.material.bumpTexture.dispose();
                        mesh.material.diffuseTexture.dispose();
                        mesh.material.dispose();
                    }
                });
                _.invoke(scene.meshes, 'dispose');
                scene.dispose();
                engine.dispose();
                canvas.parentElement.removeChild(canvas);
                OBJFileLoader.SKIP_MATERIALS = false;
                if (window) {
                    window.removeEventListener('resize', resize);
                }
            }
        }
    }, [reactCanvas]);

    const showSelection = (isOwn) => {
        return _.map(Ships, (ship, index) => {
            const shipCount = isOwn ? selectedShips[index] : props.enemyShips && props.enemyShips[index];
            const selectedModule = selectedModules[index];
            const selectedModuleName = selectedModule && tokenIdToName(selectedModule);

            const onModuleClick = () => {
                if (!isOwn) {
                    return;
                }

                setChoosingModuleFor(index);
                setModulesPanelOpen(true);
                setIsTourOpen(false);
            }

            return (
                <div key={index} className="shipSelectionBox">
                    {isOwn &&
                        <div className="shipName">
                            {ship.name}
                        </div>
                    }
                    <div className="counter">
                        {isOwn &&
                            <div className="addOrRemoveShip removeShip">
                                <Repeatable onClick={() => { removeShip(index) }}
                                    onHold={() => { removeShip(index) }}>
                                    <RemoveCircleOutlineIcon fontSize="large"/>
                                </Repeatable>
                            </div>
                        }
                        <div className="shipCount">
                            {shipCount || 0}
                        </div>
                        {isOwn &&
                            <div className="addOrRemoveShip addShip">
                                <Repeatable onClick={() => { addShip(index) }}
                                    onHold={() => { addShip(index) }}>
                                    <AddCircleOutlineIcon fontSize="large"/>
                                </Repeatable>
                            </div>
                        }
                    </div>
                    {isOwn &&
                        <div className="modules" onClick={onModuleClick}>
                            <span>
                                {selectedModuleName || 'Choose Module..'}
                            </span>
                            <MoreIcon fontSize="small"/>
                        </div>
                    }
                    {!isOwn &&
                        <div className="enemyPointer">
                            <ExpandMoreIcon fontSize="large"/>
                        </div>
                    }
                </div>
            );
        });
    }

    const showDrawer = () => {
        const onModuleClick = (tokenId) => {
            const newModules = _.clone(selectedModules);
            newModules[choosingModuleFor] = tokenId;
            setSelectedModules(newModules);
            setModulesPanelOpen(false);
        };

        const getModuleClassName = (tokenId) => {
            const isSelected = (selectedModules[choosingModuleFor] === tokenId);
            return `module ${isSelected ? 'selected' : ''}`;
        };

        return (
            <Drawer
                anchor="right"
                open={modulesPanelOpen}
                onClose={() => { setModulesPanelOpen(false) }}
            >
                {props.playerModules.length === 0 &&
                    <div className="noModules">
                        <div className="noModulesInner">
                            <div>
                                You do not own any Modules
                            </div>
                            <div className="noModulesTip">
                                TIP: Go back to starting screen to craft them
                            </div>
                        </div>
                    </div>
                }
                <div className="drawerModules">
                    {_.map(props.playerModules, (mod, moduleIndex) => {
                        const tokenId = mod[0];
                        const moduleDefinition = mod[1];

                        return (
                            <div
                                className={getModuleClassName(tokenId)}
                                key={moduleIndex}
                                onClick={() => { onModuleClick(tokenId) }}
                            > 
                                <ModuleInfo tokenId={tokenId} module={moduleDefinition}/>
                            </div>                            
                        );
                    })}
                </div>
            </Drawer>
        );
    }

    const showTargetingDrawer = () => {
        const onTargetingClick = (targeting) => {
            setSelectedTargeting(targeting);
            setTargetingPanelOpen(false);
        };

        const getTargetingClassName = (targeting) => {
            const isSelected = selectedTargeting === targeting;
            return `targeting module ${isSelected ? 'selected' : ''}`;
        };

        return (
            <Drawer
                anchor="right"
                open={targetingPanelOpen}
                onClose={() => { setTargetingPanelOpen(false) }}
            >
                <div className="targetings">
                    {_.map(Targeting, (targeting, targetingIndex) => (
                        <div
                            className={getTargetingClassName(targeting)}
                            key={targetingIndex}
                            onClick={() => { onTargetingClick(targeting) }}
                        >
                            <div className="targetingIcon moduleIcon">
                                {TargetingToIcon[targeting]({ fontSize: 'large' })}
                            </div>
                            <div className="targetingInfo moduleInfo">
                                <div className="targetingName moduleName">
                                    {TargetingToTitle[targeting]}
                                </div>
                            </div>
                            <div className="targetingDescription moduleDescription">
                                {TargetingToDescription[targeting]}
                            </div>
                        </div>
                    ))}
                </div>
            </Drawer>
        );
    }

    const getCountString = (index) => {
        return _.compact([
            props.playerShips && `Shipyard: ${numeral(props.playerShips[index]).format('0a')}`,
            props.enemyShips && `Target: ${props.enemyShips[index]}`,
            props.defaultShips && `Garrison: ${props.defaultShips[index]}`
        ]).join('  |  ');
    };

    const isBetEnabled = props.maxBet && props.balance > 0;
    const tourSteps = _.compact([
        {
            selector: '.shipSelector',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Ships
                    </h3>
                    <h5>
                        There are four basic types of ships in New Omega.
                        On the buttons, you might also see additional information, depending on the action you're taking:
                        <ul>
                            <li>Target: Shows the composition of fleet you're fighting against</li>
                            <li>Shipyard: Shows the amount of ships in your Shipyard</li>
                        </ul>
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),    
        },
        isBetEnabled && {
            selector: '.BetSelector',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Betting
                    </h3>
                    <h5>
                        Drag the slider to change your bet value. When registering home fleets, you can bet up to your balance. When attacking, you also can't bet more than the balance of fleet you're attacking.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),    
        },
        {
            selector: '.infoPanel svg',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Ship Statistics
                    </h3>
                    <h5>
                        To see detailed information about ships parameters in combat, tap here.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),    
        },
        {
            selector: '.ownSelection',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Fleet Selection
                    </h3>
                    <h5>
                        You control the composition of your fleet by adding and removing ships with + and - buttons. Hold the buttons to do it quicker.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),    
        },
        {
            selector: '.modules',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Fleet Selection
                    </h3>
                    <h5>
                        You should also choose Modules to install on your ships. Modules enhance ships with additional capabilities, such as effects applied on hit.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),    
        },
        {
            selector: '.targetingInfo',
            content: ({ goTo, step, close }) => (
                <div>
                    <h3>
                        Targeting
                    </h3>
                    <h5>
                        Finally, choose the Targeting your fleet is going to apply in the fight. There are multiple to choose from, and they apply to all ships.
                    </h5>
                    <div className="tourButton" onClick={close}>Got It!</div>
                </div>
            ),    
        },
    ]);

    const mainClassName = 'CompactShipSelection' + (resourcesLoaded ? ' loaded' : '');

    return (
        <div className={mainClassName}>
            <div ref={reactCanvas}>
            </div>
            {resourcesLoaded &&
                <div className="ui">
                    <div className="shipSelector">
                        {_.map(Ships, (ship, index) => {
                            const selectorClassName = 'shipSelectorShip' + (currentShip === index ? ' selected' : '');
                            return (
                                <div 
                                    className={selectorClassName} 
                                    key={index}
                                    onClick={() => { loadSpecificShip(index) }}
                                >
                                    <span className="shipSelectorShipCount">{getCountString(index)}</span>
                                    <img src={ship.thumbnail}/>
                                    <span className="shipSelectorShipName">{ship.name}</span>
                                </div>
                            );
                        })}
                    </div>
                    {isBetEnabled &&
                        <BetSelector
                            bet={bet}
                            max={Math.min(props.maxBet, props.balance)}
                            onChange={setBet}
                        />
                    }
                    <div className="infoPanel">
                        <InfoIcon size="large" onClick={() => { setInfoVisible(!infoVisible) }}/>
                        {infoVisible &&
                            <div className="infoInner">
                                {_.map(Ships, (ship, index) => (
                                    <div key={index} className="infoShip">
                                        <div>
                                            HP: {Ships[index].stats.hp}
                                        </div>
                                        <div>
                                            Attack: {Ships[index].stats.attack.base} - {Ships[index].stats.attack.base + Ships[index].stats.attack.variable}
                                        </div>
                                        <div>
                                            Defence: {Ships[index].stats.defence}
                                        </div>
                                        <div>
                                            Speed: {Ships[index].stats.speed}
                                        </div>
                                        <div>
                                            Range: {Ships[index].stats.range}
                                        </div>
                                        <div>
                                            Initiative: {(Ships.length - index) * 10}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        }
                    </div>
                    <div className="helpWrapper">
                        <HelpIcon size="large" onClick={() => setIsTourOpen(true)}/>
                    </div>
                    <div className="ownSelection selection">
                        <div className="selectionInner">
                            {showSelection(true)}
                        </div>
                        {props.enemyShips &&
                            <div className="currentCp">
                                Command Power: {getCurrentCP(selectedShips)} / {maxCp}
                            </div>
                        }
                    </div>
                    <div className="targetingInfo" onClick={() => {
                        setTargetingPanelOpen(true);
                        setIsTourOpen(false);
                    }}>
                        <span>
                            Targeting: {TargetingToTitle[selectedTargeting]}
                        </span>
                        <MoreIcon/>
                    </div>
                    <div className="uiElement doneBox bottomBox" onClick={onDone}>
                        DONE
                    </div>
                    <div className="uiElement cancelBox bottomBox" onClick={props.onCancel}>
                        BACK
                    </div>
                    <React.Fragment>
                        {showDrawer()}
                    </React.Fragment>
                    <React.Fragment>
                        {showTargetingDrawer()}
                    </React.Fragment>
                    <Tour
                        steps={tourSteps}
                        isOpen={isTourOpen}
                        onRequestClose={() => setIsTourOpen(false)}
                    />
                </div>
            }
        </div>
    );
}
