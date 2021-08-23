import React, { useState, useRef, useEffect } from 'react';
import _ from 'underscore';
import './ModuleCraft.css';
import { Engine, Scene, Vector3, AssetsManager, ArcRotateCamera, HemisphericLight, GlowLayer, Color4 } from '@babylonjs/core';
import '@babylonjs/loaders';
import { OmegaLoadingScreen } from '../common/OmegaLoadingScreen';
import { RewardCraftAsset } from '../definitions/CraftAssets';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import { MineralsAssets } from '../definitions/Planets';
import { unitsToPico, OmegaDefaults } from '../definitions/OmegaDefaults';
import WarningIcon from '@material-ui/icons/Warning';
import numeral from 'numeral';
import { ModuleInfo } from '../ui/components/ModuleInfo';


// props: balance, facade
export const ModuleCraft = (props) => {
    const [isTourOpen, setIsTourOpen] = useState(false);
    const reactCanvas = useRef(null);
    const sceneRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [minerals, setMinerals] = useState(null);
    const [showingResult, setShowingResult] = useState(false);
    const [tokenId, setTokenId] = useState(null);

    const loadPlayerMinerals = async () => {
        const _minerals = await props.facade.getPlayerMinerals();
        setMinerals(_minerals);
    }

    const craft = async () => {
        const waitFor = OmegaDefaults.BLOCK_TIME_SECONDS * 1000;
        setLoading(true);
        setShowingResult(false);
        playAnimations();

        try {
            const combinedResult = await Promise.all([
                props.facade.craftModule(), 
                new Promise(resolve => setTimeout(resolve, waitFor))
            ]);
            const definitionResult = _.first(combinedResult);
            const _tokenId = definitionResult[0];
            const _definition = definitionResult[1];
            await loadPlayerMinerals();
            setLoading(false);
            setShowingResult(_definition);
            setTokenId(_tokenId);
        } catch (error) {
            setLoading(false);
            // TODO show error
        }
    };

    const afterLoadAsset = (scene, rootMesh) => {
        rootMesh.position = new Vector3(0, -2, 0);
        rootMesh.rotation = new Vector3(0, Math.PI / 4, 0);
        rootMesh.scalingDeterminant = 0.0009 * RewardCraftAsset.scale;
        rootMesh.isVisible = true;
    };

    const loadResources = (scene) => {
        return new Promise((resolve, reject) => {
            const assetsManager = new AssetsManager(scene);
            const task = assetsManager.addMeshTask(0, '',
                RewardCraftAsset.asset,
                'scene.gltf');
            task.onSuccess = (task) => {
                afterLoadAsset(scene, task.loadedMeshes[0]);
                task.loadedMeshes = null;
                task.reset();
            };

            assetsManager.onFinish = () => {
                resolve();
            };

            scene._assetsManager = assetsManager;
            assetsManager.load();
        });
    };

    const stopAnimations = (scene) => {
        _.invoke(scene.animationGroups, 'stop', true);
    };

    const playAnimations = () => {
        const speedRatio = 1.2;
        const from = 5;
        const to = 10;

        _.each(sceneRef.current.animationGroups, (group) => {
            group.start(false, speedRatio, from, to);
        });
    };

    const onSceneMount = (canvas, scene) => {
        scene.getEngine().loadingScreen = new OmegaLoadingScreen();
        scene.getEngine().loadingScreen.displayLoadingUI();

        const betaLimit = Math.PI / 2 - (Math.PI / 48);
        const camera = new ArcRotateCamera('camera1',
            Math.PI / 2, betaLimit, 8, Vector3.Zero(), scene);
        camera.minZ = 0.001;
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 8;
        camera.lowerAlphaLimit = Math.PI / 2;
        camera.upperAlphaLimit = Math.PI / 2;
        camera.lowerBetaLimit = betaLimit;
        camera.upperBetaLimit = betaLimit;
        scene.activeCameras.push(camera);
        camera.attachControl(canvas, true);

        const light = new HemisphericLight('light1', new Vector3(0, Math.PI / 2, 0), scene);
        light.intensity = 1.0;

        scene.clearColor = new Color4(0, 0, 0, 0);

        // const background = new Layer('background',
        //     '/assets/images/crafting_bgr.jpg', scene);
        // background.isBackground = true;
        // background.texture.level = 0;
        // background.texture.wAng = 0;

        // scene.onBeforeRenderObservable.add(() => {
        //     const deltaTimeInMillis = scene.getEngine().getDeltaTime();

        //     _.each(scene.meshes, (mesh) => {
        //         if (mesh.isVisible) {
        //             const rpm = 2;
        //             mesh.rotation.y +=
        //                 ((rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000));
        //         }
        //     });
        // });

        scene.getEngine().runRenderLoop(() => {
            scene.render();
        });

        loadResources(scene).then(() => {
            props.setResourcesLoaded(true);
            stopAnimations(scene);
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
            // scene.highlightLayer = new HighlightLayer('hl1', scene);
            // scene.highlightLayer.blurHorizontalSize = 1.0;
            // scene.highlightLayer.blurVerticalSize = 1.0;

            scene.glowLayer = new GlowLayer('glow', scene);
            scene.glowLayer.intensity = 1.33;

            sceneRef.current = scene;
//            OBJFileLoader.SKIP_MATERIALS = true;

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
                scene.glowLayer.dispose();
                // scene.highlightLayer.removeAllMeshes();
                // scene.highlightLayer.dispose();
                _.each(scene.meshes, (mesh) => {
                    if (mesh.material) {
                        // TODO dispose all textures?
                        console.log(' TODO maybe dispose this? ', mesh.material);
                        mesh.material.bumpTexture && mesh.material.bumpTexture.dispose();
                        mesh.material.diffuseTexture && mesh.material.diffuseTexture.dispose();
                        mesh.material.dispose();
                    }
                });
                _.invoke(scene.meshes, 'dispose');
                scene.dispose();
                engine.dispose();
                canvas.parentElement.removeChild(canvas);
//                OBJFileLoader.SKIP_MATERIALS = false;
                if (window) {
                    window.removeEventListener('resize', resize);
                }
            }
        }
    }, [reactCanvas]);

    useEffect(() => {
        if (props.isCraftOpen) {
            loadPlayerMinerals();
        }
    }, [props.isCraftOpen]);

    const generateMineralButton = (index) => {
        if (!minerals) {
            return;
        }
        
        const hasMineral = minerals[index] >= OmegaDefaults.CRAFT_COST_RESOURCES;
        const costClassName = 'cost' + (hasMineral ? '' : ' disabled');

        return <div className="mineralButton">
            <img src={MineralsAssets[index].asset} draggable={false}/>
            {minerals &&
                <span className="owned">
                    Storage: {numeral(minerals[index]).format('0a')}
                </span>
            }
            <span className={costClassName}>
                {!hasMineral && <WarningIcon fontSize="small" className="warningIcon"/>}
                Cost: {numeral(OmegaDefaults.CRAFT_COST_RESOURCES).format('0a')}
            </span>
        </div>
    };

    const mineralCheck = _.find(minerals, (mineral) => {
        return mineral < OmegaDefaults.CRAFT_COST_RESOURCES;
    });
    const hasEnoughMinerals = !mineralCheck && mineralCheck !== 0;
    const canCraft = !loading && props.balance >= unitsToPico(1) && hasEnoughMinerals;
    const craftButtonClassName = 'craftButton' + (canCraft ? '' : ' disabled');
    const craftResultClassName = 'craftResult' + (showingResult ? ' active' : '');
    const mainClassName = 'ModuleCraft';

    return (
        <div className={mainClassName}>
            <div ref={reactCanvas}>
            </div>
            {props.resourcesLoaded &&
                <div className="ui">
                    <div className={craftButtonClassName} onClick={canCraft ? craft : null}>
                        <div className="iconWrapper">
                            <OfflineBoltIcon/>
                            <span>1</span>
                        </div>
                        <span>
                            Craft
                        </span>
                    </div>
                    <div className="craftPanel leftPanel">
                        {generateMineralButton(0)}
                        {generateMineralButton(1)}
                    </div>
                    <div className="craftPanel rightPanel">
                        {generateMineralButton(2)}
                        {generateMineralButton(3)}
                    </div>
                    <div className={craftResultClassName}>
                        {showingResult && tokenId &&
                            <ModuleInfo module={showingResult} tokenId={tokenId}/>
                        }
                    </div>
                </div>
            }
        </div>
    );
}
