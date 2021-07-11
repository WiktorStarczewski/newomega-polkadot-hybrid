import React, { useState, useRef, useEffect } from 'react';
import _ from 'underscore';
import { Engine, Scene, Vector3, AssetsManager, Layer,
    SceneLoader, Texture, StandardMaterial, ArcRotateCamera, HemisphericLight } from '@babylonjs/core';
import '@babylonjs/loaders';
import { OBJFileLoader } from '@babylonjs/loaders';
import { Ships, MAX_OFEACH_SHIP } from '../definitions/Ships';
import { Fittings, FIT_TO_STAT } from '../definitions/Common';
import { OmegaLoadingScreen } from '../common/OmegaLoadingScreen';
import './ShipSelection.css';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import Repeatable from 'react-repeatable';
import { GiSubmarineMissile } from 'react-icons/gi';
import { BiShield } from 'react-icons/bi';
import { FaBalanceScale } from 'react-icons/fa';

const getCurrentCP = (selectedShips) => {
    return _.reduce(selectedShips, (memo, num, index) => {
        return memo + (num || 0) * Ships[index].stats.cp;
    }, 0);
};

const getStartingVariants = (defaultVariants, variants) => {
    if (!variants) {
        return _.clone(defaultVariants);
    }

    return _.clone(variants);
}

// props: ships (optional), defaultShips, onDone, onCancel, customTitle, noSmallFleetWarning
export const ShipSelection = (props) => {
    const defaultShips = props.reinforcing ? props.defaultShips : [0, 0, 0, 0];
    const currentShipRef = useRef(0);
    const [ currentShip, setCurrentShip ] = useState(0);
    const [ selectedShips, setSelectedShips ] = useState(defaultShips);
    const [ selectedVariants, setSelectedVariants ] = useState(getStartingVariants([0, 0, 0, 0], props.variants));
    const [ currentCp, setCurrentCp ] = useState(getCurrentCP(defaultShips));
    const [ resourcesLoaded, setResourcesLoaded ] = useState(false);
    const [ notEnoughShips, setNotEnoughShips ] = useState(false);
    const reactCanvas = useRef(null);

    const nextShip = () => {
        const newShip = currentShip + 1;
        const newShipSafe = newShip >= Ships.length ? 0 : newShip;
        currentShipRef.current = newShipSafe;
        setCurrentShip(newShipSafe);
    };

    const prevShip = () => {
        const newShip = currentShip - 1;
        const newShipSafe = newShip < 0 ? Ships.length - 1 : newShip;
        currentShipRef.current = newShipSafe;
        setCurrentShip(newShipSafe);
    };

    const addShip = () => {
        const cost = Ships[currentShip].stats.cp;
        const currentCp = getCurrentCP(selectedShips);
        const currentNumberOfShips = selectedShips[currentShip] || 0;

        const canAddShipyardMax = props.reinforcing
            ? props.ships[currentShip] + props.defaultShips[currentShip]
            : props.ships
                ? props.ships[currentShip]
                : Number.MAX_SAFE_INTEGER;

        const canAddShip =
            currentCp + cost <= props.maxCp &&
            selectedShips[currentShip] < MAX_OFEACH_SHIP &&
            canAddShipyardMax >= currentNumberOfShips + 1;

        if (canAddShip) {
            const newShips = _.clone(selectedShips);
            newShips[currentShip] = currentNumberOfShips + 1;
            setSelectedShips(newShips);
            setCurrentCp(getCurrentCP(newShips));
        }

        setNotEnoughShips(false);
    };

    const removeShip = () => {
        if (selectedShips[currentShip] > 0) {
            const newShips = _.clone(selectedShips);
            newShips[currentShip]--;
            setSelectedShips(newShips);
            setCurrentCp(getCurrentCP(newShips));
        }
    };

    const onDone = () => {
        props.onDone(selectedShips, selectedVariants);
    };

    const afterLoadShip = (scene, rootMesh, shipIndex) => {
        rootMesh.position = Vector3.Zero();
        rootMesh.rotation = Ships[shipIndex].visuals.fightRotationLhs.clone();
        rootMesh.scalingDeterminant = 0.001 * Ships[shipIndex].scale;
        rootMesh.isVisible = false;

        rootMesh.material = new StandardMaterial(`texture{shipIndex}`, scene);
        rootMesh.material.bumpTexture = new Texture(Ships[shipIndex].asset + Ships[shipIndex].textures.normals, scene);
        rootMesh.material.diffuseTexture = new Texture(Ships[shipIndex].asset + Ships[shipIndex].textures.diffuse, scene);

        rootMesh._shipIndex = shipIndex;
        _.each(rootMesh.getChildMeshes(), (mesh) => {
            mesh._shipIndex = shipIndex;
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

    const onSceneMount = (canvas, scene) => {
        scene.getEngine().loadingScreen = new OmegaLoadingScreen();
        scene.getEngine().loadingScreen.displayLoadingUI();

        const camera = new ArcRotateCamera('camera1',
            Math.PI / 2, Math.PI / 2, 9.0, Vector3.Zero(), scene);
        camera.minZ = 0.001;
        camera.lowerRadiusLimit = 9.0;
        camera.upperRadiusLimit = 9.0;
        scene.activeCameras.push(camera);
        camera.attachControl(canvas, true);

        const light = new HemisphericLight('light1', new Vector3(0, Math.PI / 2, 0), scene);
        light.intensity = 2.0;

        const background = new Layer('background',
            '/assets/images/ship_selection.jpg', scene);
        background.isBackground = true;
        background.texture.level = 0;
        background.texture.wAng = 0;

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

    const checkEnoughShipsAndDone = () => {
        const notEnoughShips = !props.noSmallFleetWarning && currentCp < props.maxCp;
        setNotEnoughShips(notEnoughShips);
        if (!notEnoughShips) {
            onDone();
        }
    };

    const onClickDefensiveFit = () => {
        const cloned = _.clone(selectedVariants);
        cloned[currentShip] = Fittings.Defensive;
        setSelectedVariants(cloned);
    };

    const onClickOffensiveFit = () => {
        const cloned = _.clone(selectedVariants);
        cloned[currentShip] = Fittings.Offensive;
        setSelectedVariants(cloned);
    };

    const onClickNormalFit = () => {
        const cloned = _.clone(selectedVariants);
        cloned[currentShip] = Fittings.Normal;
        setSelectedVariants(cloned);
    };


    useEffect(() => {
        if (reactCanvas.current) {
            const canvas = document.createElement('canvas');
            reactCanvas.current.appendChild(canvas);

            const engine = new Engine(canvas, true, null, true);
            engine.getCaps().parallelShaderCompile = false;
//            engine.disableTextureBindingOptimization = true;
            const scene = new Scene(engine);

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

    const fittingToDefence = () => {
        const lookup = {
            [Fittings.Normal]: 0,
            [Fittings.Defensive]: FIT_TO_STAT,
            [Fittings.Offensive]: -FIT_TO_STAT,
        };

        return lookup[selectedVariants[currentShip]];
    };

    const fittingToAttack = () => {
        const lookup = {
            [Fittings.Normal]: 0,
            [Fittings.Defensive]: -FIT_TO_STAT,
            [Fittings.Offensive]: FIT_TO_STAT,
        };

        return lookup[selectedVariants[currentShip]];
    };

    const variant = selectedVariants[currentShip];
    const fittingNormalClass = 'fitting normal ' +
        (variant === Fittings.Normal ? 'active' : '');
    const fittingDefClass = 'fitting defensive ' +
        (variant === Fittings.Defensive ? 'active' : '');
    const fittingOffClass = 'fitting offensive ' +
        (variant === Fittings.Offensive ? 'active' : '');

    const attackBottom = Ships[currentShip].stats.attack.base + fittingToAttack();
    const attackTop = Ships[currentShip].stats.attack.base + fittingToAttack() +
        Ships[currentShip].stats.attack.variable;
    const defenceClassName = selectedVariants[currentShip] !== Fittings.Normal ? 'boostedStat' : '';
    const attackClassName = selectedVariants[currentShip] !== Fittings.Normal ? 'boostedStat' : '';
    const shipsInShipyard = props.ships && (props.reinforcing
        ? props.ships[currentShip] + props.defaultShips[currentShip] - selectedShips[currentShip]
        : props.ships[currentShip] - selectedShips[currentShip]);


    return (
        <div className="ShipSelection">
            <div ref={reactCanvas}>
            </div>
            {resourcesLoaded &&
                <div className="ui">
                    <div className="uiElement shipName">
                        {Ships[currentShip].name}
                    </div>
                    <div className="uiElement sideBox shipStats">
                        <div className="statBox">
                            <div>
                                HP: {Ships[currentShip].stats.hp}
                            </div>
                            <div className={attackClassName}>
                                Attack: {attackBottom} - {attackTop}
                            </div>
                            <div className={defenceClassName}>
                                Defence: {Ships[currentShip].stats.defence + fittingToDefence()}
                            </div>
                            <div>
                                Speed: {Ships[currentShip].stats.speed}
                            </div>
                            <div>
                                Range: {Ships[currentShip].stats.range}
                            </div>
                            <div>
                                Initiative: {(Ships.length - currentShip) * 10}
                            </div>
                            <div>
                                Provocation: {(currentShip + 1) * 10}
                            </div>
                            <div>
                                +50% vs {currentShip === 0
                                    ? Ships[Ships.length - 1].name
                                    : Ships[currentShip - 1].name}
                            </div>
                        </div>
                        <div className="fittingsOuter">
                            <div className={fittingDefClass} onClick={onClickDefensiveFit}>
                                <BiShield/>
                            </div>
                            <div className={fittingNormalClass} onClick={onClickNormalFit}>
                                <FaBalanceScale/>
                            </div>
                            <div className={fittingOffClass} onClick={onClickOffensiveFit}>
                                <GiSubmarineMissile/>
                            </div>
                        </div>
                    </div>
                    <div className="uiElement sideBox shipControls">
                        <div className="addOrRemoveShip addShip">
                            <Repeatable onClick={addShip} onHold={addShip}>
                                <AddCircleOutlineIcon fontSize="large"/>
                            </Repeatable>
                        </div>
                        <div>
                            Max CP: <span className="maxCp">{props.maxCp}</span>
                        </div>
                        <div>
                            CP Cost: {Ships[currentShip].stats.cp}
                        </div>
                        <div>
                            Used Ships: {selectedShips[currentShip] || 0}
                        </div>
                        {props.ships &&
                            <div>
                                In Shipyard: {shipsInShipyard}
                            </div>
                        }
                        <div>
                            Used CP: {currentCp}
                        </div>
                        <div className="addOrRemoveShip removeShip">
                            <Repeatable onClick={removeShip} onHold={removeShip}>
                                <RemoveCircleOutlineIcon fontSize="large"/>
                            </Repeatable>
                        </div>
                    </div>
                    <div className="uiElement shipDescription">
                        {Ships[currentShip].description}
                    </div>
                    <div className="uiElement chevron left" onClick={prevShip}>
                        <ArrowLeftIcon fontSize="large"/>
                    </div>
                    <div className="uiElement chevron right" onClick={nextShip}>
                        <ArrowRightIcon fontSize="large"/>
                    </div>
                    <div className="uiElement doneBox bottomBox" onClick={checkEnoughShipsAndDone}>
                        DONE
                    </div>
                    <div className="uiElement cancelBox bottomBox" onClick={props.onCancel}>
                        BACK
                    </div>
                    <div className="omegaTip">
                        <div className="title">
                            {props.customTitle || 'Ship Selection'}
                        </div>
                        <div className="explanation">
                            <div className="tip">
                                The amount of ships in a fight is determined by the Command Power (CP) of the Defender fleet.
                            </div>
                            <div className="tip">
                                Each ship costs a certain amount of CP.
                            </div>
                        </div>
                    </div>
                </div>
            }
            {notEnoughShips &&
                <div className="modal">
                    <div className="modal-popup">
                        <div className="modal-body">
                            <div className="modal-title">Your Fleet CP is lower than your opponent</div>
                            <div>Tip: Add ships to your fleet with the + button to the right of ship portrait.</div>
                        </div>
                        <div className="modal-buttons">
                            <div className="modal-button left" onClick={() => { setNotEnoughShips(false); }}>
                                Back
                            </div>
                            <div className="modal-button right" onClick={() => {
                                setNotEnoughShips(false);
                                onDone();
                            }}>
                                Start Anyway
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}
