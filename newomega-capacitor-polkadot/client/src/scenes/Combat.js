import React, { useState, useEffect, useRef } from 'react';
import _ from 'underscore';
import { Engine, Scene, Vector3, Color3, Mesh, AssetsManager, StandardMaterial, Texture, Layer,
    Animation, ArcRotateCamera, HighlightLayer, HemisphericLight, Color4 } from '@babylonjs/core';
import '@babylonjs/loaders';
import { OBJFileLoader } from '@babylonjs/loaders';
import { Ships, GOLD_PER_CP } from '../definitions/Ships';
import { balanceToDisplay } from '../definitions/OmegaDefaults';
import { DefaultModule, DefaultEffect, AllEffects,
    Effects, EffectNamesLookup } from '../definitions/Modules';
import { OmegaLoadingScreen } from '../common/OmegaLoadingScreen';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import './Combat.css';

const LASER_LENGTH_MS = 1000;
const ROUND_LENGTH_MS = 2000;
const LHS_COLOR = Color3.Yellow();
const RHS_COLOR = Color3.Green();


// props: result, payout
export const Combat = (props) => {
    const [ round, setRound ] = useState(0);
    const [ showingResult, setShowingResult ] = useState(false);
    const [ combatLog, setCombatLog ] = useState('');
    const [ resourcesLoaded, setResourcesLoaded ] = useState(false);
    const [ interrupt ] = useState({});
    const [ runningEffectsLhs, setRunningEffectsLhs ] = useState(
        [ _.clone(DefaultModule), _.clone(DefaultModule),
        _.clone(DefaultModule), _.clone(DefaultModule) ]);
    const [ runningEffectsRhs, setRunningEffectsRhs ] = useState(
        [ _.clone(DefaultModule), _.clone(DefaultModule),
        _.clone(DefaultModule), _.clone(DefaultModule) ]);
    const reactCanvas = useRef(null);
    let shipMeshesLhs = [ [], [], [], [] ];
    let shipMeshesRhs = [ [], [], [], [] ];

    const afterImportMeshes = (scene, rootMesh, currentShip,
        basePosition, count, direction, isLhs) => {

        const highlightLayer = scene.getHighlightLayerByName('hl1');

        rootMesh.position = new Vector3(basePosition + currentShip * direction, 0, 0);
        rootMesh.rotation = isLhs
            ? Ships[currentShip].visuals.fightRotationLhs.clone()
            : Ships[currentShip].visuals.fightRotationRhs.clone();

        rootMesh.scalingDeterminant = 0.00017 * Ships[currentShip].scale;
        rootMesh.material = new StandardMaterial(`texture{currentShip}`, scene);
        rootMesh.material.diffuseTexture = new Texture(Ships[currentShip].asset + Ships[currentShip].textures.diffuse, scene);

        if (isLhs) {
            shipMeshesLhs[currentShip] = [ rootMesh ];
            highlightLayer.addMesh(rootMesh, LHS_COLOR);
            _.each(rootMesh.getChildMeshes(), (mesh) => {
                highlightLayer.addMesh(mesh, LHS_COLOR);
            });
        } else {
            shipMeshesRhs[currentShip] = [ rootMesh ];
            highlightLayer.addMesh(rootMesh, RHS_COLOR);
            _.each(rootMesh.getChildMeshes(), (mesh) => {
                highlightLayer.addMesh(mesh, RHS_COLOR);
            });
        }

        for (let i = 0; i < count - 1; i++) {
            const clonedMesh = rootMesh.clone();

            highlightLayer.addMesh(clonedMesh, isLhs ? LHS_COLOR : RHS_COLOR);
            _.each(clonedMesh.getChildMeshes(), (childMesh) => {
                highlightLayer.addMesh(childMesh, isLhs ? LHS_COLOR : RHS_COLOR);
            });

            if (i % 2 === 0) {
                clonedMesh.position.z -= (Math.floor(i / 2) + 1) * Ships[currentShip].combatScale;
            } else {
                clonedMesh.position.z += (Math.floor(i / 2) + 1) * Ships[currentShip].combatScale;
            }

            if (isLhs) {
                shipMeshesLhs[currentShip].push(clonedMesh);
            } else {
                shipMeshesRhs[currentShip].push(clonedMesh);
            }
        }
    };


    const loadResources = (scene) => {
        return new Promise((resolve, reject) => {
            const assetsManager = new AssetsManager(scene);

            for (let index = 0; index < Ships.length; index++) {
                shipMeshesLhs[index] = [];
                shipMeshesRhs[index] = [];

                const countLhs = props.result.selection_lhs[index];
                const countRhs = props.result.selection_rhs[index];
                if (countLhs > 0 || countRhs > 0) {
                    const task = assetsManager.addMeshTask(index, '',
                        Ships[index].asset,
                        Ships[index].fileName);
                    task.onSuccess = (task) => {
                        let mesh = task.loadedMeshes[0];
                        if (countLhs > 0) {
                            afterImportMeshes(scene, mesh,
                                index, 10, countLhs, 1, true);
                            mesh = mesh.clone();
                        }
                        if (countRhs > 0) {
                            afterImportMeshes(scene, mesh,
                                index, -10, countRhs, -1, false);
                        }
                        task.loadedMeshes = null;
                        task.reset();
                    };
                }
            }

            assetsManager.onFinish = () => {
                resolve();
            };

            scene._assetsManager = assetsManager;

            assetsManager.load();
        });
    };

    const moveShips = (scene, move, isLhs) => {
        const meshes = isLhs ? shipMeshesLhs[move.source] : shipMeshesRhs[move.source];
        const alreadyThereLhs = _.filter(shipMeshesLhs, (meshes) => {
            return meshes[0] && meshes[0].position.x === move.target_position;
        });
        const alreadyThereRhs = _.filter(shipMeshesRhs, (meshes) => {
            return meshes[0] && meshes[0].position.x === move.target_position;
        });
        const alreadyThere = alreadyThereLhs.length + alreadyThereRhs.length;

        const posYLhs = _.map(alreadyThereLhs, (meshes) => {
            return meshes[0] ? meshes[0].position.y : Number.MAX_SAFE_INTEGER;
        });
        const posYRhs = _.map(alreadyThereRhs, (meshes) => {
            return meshes[0] ? meshes[0].position.y : Number.MAX_SAFE_INTEGER;
        });

        let targetY = alreadyThere;
        for (let proposalY = 0; proposalY < alreadyThere; proposalY++) {
            if (!_.contains(posYLhs, proposalY) &&
                !_.contains(posYRhs, proposalY)) {
                targetY = proposalY;
            }
        }

        return Promise.all(_.map(meshes, (mesh) => {
            return new Promise((resolve/*, reject*/) => {
                if (mesh.position.x === move.target_position) {
                    return resolve();
                }

                const framerate = 20;
                const slide = new Animation(_.uniqueId(), 'position.x', framerate,
                    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
                const direction = isLhs ? -1 : 1;
                const keyFrames = [
                    {
                        frame: 0,
                        value: mesh.position.x,
                    },
                    {
                        frame: framerate,
                        value: mesh.position.x + Math.abs(move.target_position - mesh.position.x) * direction,
                    },
                    {
                        frame: 2*framerate,
                        value: move.target_position,
                    }
                ];
                slide.setKeys(keyFrames);

                const adjustY = new Animation(_.uniqueId(), 'position.y', framerate,
                    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
                const keyFramesAdjustY = [
                    {
                        frame: 0,
                        value: mesh.position.y,
                    },
                    {
                        frame: framerate,
                        value: mesh.position.y + ((targetY - mesh.position.y) / 2),
                    },
                    {
                        frame: 2*framerate,
                        value: targetY,
                    }
                ];
                adjustY.setKeys(keyFramesAdjustY);

                mesh.animations = [ slide, adjustY ];
                scene.beginAnimation(mesh, 0, 2 * framerate, false, 2, resolve);
            });
        }));
    };

    const applyHpsToVisuals = (scene, target, isLhs, shipHpsLhs, shipHpsRhs) => {
        const hpPerShip = Ships[target].stats.hp;
        const hpsLeft = isLhs ? shipHpsRhs[target] : shipHpsLhs[target];
        const shipsLeft = Math.max(Math.ceil(hpsLeft / hpPerShip), 0);
        let meshes = isLhs ? shipMeshesRhs[target] : shipMeshesLhs[target];
        const shipsToRemove = meshes.length - shipsLeft;

        for (let removeIndex = 0; removeIndex < shipsToRemove; removeIndex++) {
            const meshToRemove = meshes.shift();

            // IMPROVEME only createasync once
            // ParticleHelper.CreateAsync('explosion', scene).then((set) => {
            //     set.systems.forEach(s => {
            //         s.worldOffset = meshToRemove.position;
            //         s.disposeOnStop = true;
            //         s.maxSize = 0.01;
            //         s.minSize = 0.001;
            //     });
            //     set.systems = [ set.systems[0] ];
            //     set.start();
            // });

            meshToRemove.dispose();
        }
    };

    let localLog = '';

    const logAttack = (move, isLhs) => {
        const prefix = isLhs ? '[Attacker]' : '[Defender]';
        const newEntry = `${prefix} ${Ships[move.source].name} hits ${Ships[move.target].name} for ${move.damage} damage.`;
        localLog = newEntry + '\n' + localLog;
        setCombatLog(localLog);
    };

    const logRoundStart = (round) => {
        const newEntry = `Round ${round + 1} begins.\n\n`;
        localLog = newEntry + localLog;
        setCombatLog(localLog);
    };

    const showLaser = (scene, source, sourceMesh, targetMesh, isLhs) => {
        const mat = new StandardMaterial('laserMat', scene);
        mat.alpha = 0.6;
        mat.diffuseColor = isLhs ? LHS_COLOR : RHS_COLOR;
        mat.backFaceCulling = false;

        const lines = Mesh.CreateTube('laser', [
            sourceMesh.position,
            targetMesh.position
        ], Ships[source].visuals.beamWidth, 64, null, 0, scene, false, Mesh.FRONTSIDE);
        lines.material = mat;
        lines.convertToFlatShadedMesh();

        setTimeout(() => {
            lines.dispose();
        }, LASER_LENGTH_MS);
    };

    const showAttacks = (scene, move, isLhs) => {
        // for ships, each ship attacks next ship [0..n] meshes
        const sourceMeshes = isLhs ? shipMeshesLhs : shipMeshesRhs;
        const targetMeshes = isLhs ? shipMeshesRhs : shipMeshesLhs;
        _.each(sourceMeshes[move.source], (sourceMesh, ind) => {
            if (!targetMeshes[move.target] || !targetMeshes[move.target].length) {
                return;
            }

            const targetMeshIndex = ind % targetMeshes[move.target].length;
            const targetMesh = targetMeshes[move.target][targetMeshIndex];

            showLaser(scene, move.source, sourceMesh, targetMesh, isLhs);
        });
    };

    const playMove = (scene, move, isLhs, shipHpsLhs, shipHpsRhs) => {
        let movePromise;

        if (!move) {
            return new Promise((resolve) => {
                resolve();
            });
        }

        movePromise = moveShips(scene, move, isLhs);

        if (move.move_type === 1) {
            movePromise = movePromise.then(() => {
                return new Promise((resolve, reject) => {
                    showAttacks(scene, move, isLhs);
                    const shipHps = isLhs ? shipHpsRhs : shipHpsLhs;
                    shipHps[move.target] -= move.damage;
                    applyHpsToVisuals(scene, move.target, isLhs, shipHpsLhs,
                        shipHpsRhs);
                    logAttack(move, isLhs);

                    setTimeout(resolve, ROUND_LENGTH_MS);
                });
            });
        }

        const newEffectsLhs = _.map(move.effects_lhs, (effect, index) => {
            return _.clone(shipHpsLhs[index] > 0
                ? effect
                : DefaultEffect);
        });

        const newEffectsRhs = _.map(move.effects_rhs, (effect, index) => {
            return _.clone(shipHpsRhs[index] > 0
                ? effect
                : DefaultEffect);
        });

        setRunningEffectsLhs(newEffectsLhs);
        setRunningEffectsRhs(newEffectsRhs);

        return movePromise;
    };

    const playMoves = (scene, lhsMoves, rhsMoves, shipHpsLhs, shipHpsRhs) => {
        const _recursiveMover = (ind, mainResolver) => {
            const lhsMove = lhsMoves[ind];
            const rhsMove = rhsMoves[ind];

            if (interrupt.interrupted) {
                return mainResolver();
            }

            const movePromiseLhs = playMove(scene, lhsMove, true, shipHpsLhs, shipHpsRhs);
            const movePromiseRhs = playMove(scene, rhsMove, false, shipHpsLhs, shipHpsRhs);

            Promise.all([movePromiseLhs, movePromiseRhs]).then(() => {
                if (ind + 1 < Math.max(lhsMoves.length, rhsMoves.length)) {
                    _recursiveMover(ind + 1, mainResolver);
                } else {
                    mainResolver();
                }
            });
        }

        return new Promise((resolve, reject) => {
            _recursiveMover(0, resolve);
        });
    };

    const playRound = (scene, round, shipHpsLhs, shipHpsRhs) => { // recursive
        if (round >= props.result.rounds) {
            setShowingResult(true);
            return;
        }

        if (interrupt.interrupted) {
            return;
        }

        setRound(round);
        logRoundStart(round);

        const lhsMoves = _.filter(props.result.lhs_moves, (move) => {
            return move.round === round && move.move_type !== 0;
        });
        const rhsMoves = _.filter(props.result.rhs_moves, (move) => {
            return move.round === round && move.move_type !== 0;
        });

        const lhsMovesPadded = _.map(_.range(Ships.length), (shipIndex) => {
            return _.findWhere(lhsMoves, {
                source: shipIndex,
            });
        });

        const rhsMovesPadded = _.map(_.range(Ships.length), (shipIndex) => {
            return _.findWhere(rhsMoves, {
                source: shipIndex,
            });
        });

        playMoves(scene, lhsMovesPadded, rhsMovesPadded, shipHpsLhs, shipHpsRhs).then(() => {
            playRound(scene, round + 1, shipHpsLhs, shipHpsRhs);
        });
    };

    const playCombat = (scene) => {
        const shipHpsLhs = _.map(props.result.selection_lhs, (count, index) => {
            return Ships[index].stats.hp * count;
        });
        const shipHpsRhs = _.map(props.result.selection_rhs, (count, index) => {
            return Ships[index].stats.hp * count;
        });

        playRound(scene, 0, shipHpsLhs, shipHpsRhs);
    };

    const onSceneMount = (canvas, scene) => {
        scene.getEngine().loadingScreen = new OmegaLoadingScreen();

        const camera = new ArcRotateCamera('camera1',
            Math.PI / 2, Math.PI / 6, 36, Vector3.Zero(), scene);
        camera.minZ = 0.001;
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 36;
        scene.activeCameras.push(camera);
        camera.attachControl(canvas, true);

        const light = new HemisphericLight('light1', new Vector3(0, 0, 1), scene);
        light.intensity = 0.7;

        scene.clearColor = new Color4(0, 0, 0, 0);

        // const background = new Layer('background',
        //     '/assets/images/sector.jpg', scene);
        // background.isBackground = true;
        // background.texture.level = 0;
        // background.texture.wAng = 0;

        scene.getEngine().runRenderLoop(() => {
            scene.render();
        })

        const emptyFight = _.isEmpty(_.compact(props.result.selection_lhs)) &&
            _.isEmpty(_.compact(props.result.selection_rhs));

        const playerFn = () => {
            setResourcesLoaded(true);
            playCombat(scene);
        };

        if (!emptyFight) {
            loadResources(scene).then(playerFn);
        } else {
            playerFn();
        }
    };

    const getWinnerString = () => {
        if (props.result.lhs_dead) {
            return 'Defender Wins';
        } else if (props.result.rhs_dead) {
            return 'Attacker Wins';
        } else {
            return 'Draw';
        }
    }

    useEffect(() => {
        if (reactCanvas.current) {
            const canvas = document.createElement('canvas');
            reactCanvas.current.appendChild(canvas);

            const engine = new Engine(canvas, true, { stencil: true }, true);
            engine.getCaps().parallelShaderCompile = false;
            // engine.disableTextureBindingOptimization = true;
            const scene = new Scene(engine);
            const highlightLayer = new HighlightLayer('hl1', scene);
            highlightLayer.blurHorizontalSize = 0.2;
            highlightLayer.blurVerticalSize = 0.2;

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
                scene._assetsManager && scene._assetsManager.reset();
                highlightLayer.removeAllMeshes();
                highlightLayer.dispose();
                _.each(scene.meshes, (mesh) => {
                    if (mesh.material) {
                        mesh.material.diffuseTexture && mesh.material.diffuseTexture.dispose();
                        mesh.material.dispose();
                    }
                });
                _.invoke(scene.meshes, 'dispose');
                scene.dispose();
                engine.dispose();
                shipMeshesRhs = null;
                shipMeshesLhs = null;
                canvas.parentElement.removeChild(canvas);
                OBJFileLoader.SKIP_MATERIALS = false;
                if (window) {
                    window.removeEventListener('resize', resize);
                }
            }
        }
    }, [reactCanvas]);

    const getShipsLost = (isLhs, elClassName) => {
        const shipsLost = isLhs
            ? props.result.ships_lost_lhs
            : props.result.ships_lost_rhs;

        return (
            <div className={elClassName}>
                <div className="shipsLostTitle">
                    {isLhs? 'Attacker' : 'Defender'} Ships Lost:
                </div>
                <div className="shipsLostInner">
                    {_.map(Ships, (ship, index) => {
                        return (
                            <div className="shipLostInfo" key={index}>
                                {ship.name}: {shipsLost[index]}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    const getPayoutInfo = () => {
        return props.payout
            ? (
                <div className="payoutInfo">
                    Payout: {balanceToDisplay(props.payout)}
                    <OfflineBoltIcon fontSize="small"/>
                </div>
            )
            : <div/>;
    }

    const showShipEffects = (isLhs) => {
        const className = "shipEffectsList " + (isLhs ? 'lhs' : 'rhs');
        const runningEffects = isLhs ? runningEffectsLhs : runningEffectsRhs;

        const showRunningEffects = (index, effect, effIndex) => {
            if (runningEffects[index][effect] > 0) {
                return (
                    <div className="effect" key={effIndex}>
                        <div className="effectName">
                            {EffectNamesLookup[effIndex]}
                        </div>
                    </div>
                );
            }
        };

        return (
            <div className={className}>
                {_.map(Ships, (ship, index) => {
                    return <div key={index} className="shipEffect">
                        <div className="shipName">
                            {ship.name}
                        </div>
                        {_.map(AllEffects, (effect, effIndex) => {
                            return showRunningEffects(index, effect, effIndex);
                        })}
                    </div>
                })}
            </div>
        );
    }

    const resultDialogClassName = `resultDialog ${props.result.rhs_dead ? 'victory' : ''}`;
    const mainClassName = 'Combat' + (resourcesLoaded ? ' loaded' : '');

    return (
        <div className={mainClassName}>
            <div ref={reactCanvas}>
            </div>
            {resourcesLoaded &&
                <div className="ui">
                    <div className="uiElement combatLog">
                        <pre>{combatLog}</pre>
                    </div>
                    <div className="uiElement doneBox bottomBox" onClick={() => {
                        setShowingResult(true);
                        interrupt.interrupted = true;
                    }}>
                        FINISH
                    </div>
                    <div className="uiElement shipEffects">
                        {showShipEffects(true)}
                        {showShipEffects(false)}
                    </div>
                    <div className="uiElement currentRound">
                        Round {round+1}
                    </div>
                    <div className="miniLogoBox"></div>
                    {showingResult &&
                        <div className="result">
                            <div className={resultDialogClassName}>
                                <div className="winner">
                                    {getWinnerString()}
                                </div>
                                <div className="shipsLost">
                                    {getShipsLost(true, 'shipsLostLhs')}
                                    {getShipsLost(false, 'shipsLostRhs')}
                                </div>
                                <div className="payout">
                                    {getPayoutInfo()}
                                </div>
                                <div className="exitButton" onClick={props.onCancel}>
                                    EXIT
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    );
}
