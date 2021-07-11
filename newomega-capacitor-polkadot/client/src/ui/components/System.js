import React, { useEffect, useState } from 'react';
import './System.css';
import { Planets } from '../../definitions/Planets';
import { ACCOUNT_DEFAULT } from '../../definitions/Common';
import { MineralsAssets, proofToClassName, getHarvestable, getHarvestablePerHour } from '../../definitions/Planets';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import { isSystemOwner } from '../../definitions/Planets';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';
import _ from 'underscore';
import { OmegaDefaults, unitsToPico } from '../../definitions/OmegaDefaults';

// props: system, names, planetExpanded, setPlanetExpanded, onAttackPlanet, alice, 
//        isAttackable, blockNumber, onHarvestAll, onHarvestPlanet, balance, onRenamePlanet, onUpgradePlanet
export const System = (props) => {
    const [selectedPlanetIndex, setSelectedPlanetIndex] = useState(props.planetExpanded ? 0 : null);
    const [newName, setNewName] = useState('');
    const [enteringNewName, setEnteringNewName] = useState(false);

    const onPlanetClick = (index) => {
        if (index === selectedPlanetIndex && props.planetExpanded) {
            props.setPlanetExpanded(false);
        } else if (index === selectedPlanetIndex && !props.planetExpanded) {
            props.setPlanetExpanded(true);
        } else {
            props.setPlanetExpanded(true);
            setSelectedPlanetIndex(index);
        }
    };

    const onAttackPlanet = () => {
        props.onAttackPlanet(props.system, selectedPlanetIndex);
    };

    const onReinforcePlanet = () => {
        props.onReinforcePlanet(props.system, selectedPlanetIndex);
    };

    const onHarvestPlanet = () => {
        props.onHarvestPlanet(props.system, selectedPlanetIndex);
    };

    const onRenamePlanet = () => {
        props.onRenamePlanet(props.system, selectedPlanetIndex, newName);
    }

    const onUpgradePlanet = () => {
        props.onUpgradePlanet(props.system, selectedPlanetIndex);
    }

    const onHarvestAll = () => {
        props.onHarvestAll();
    }

    const getSelection = (planet) => {
        return planet.selection.join(' | ');
    };

    const getSelectedPlanet = () => {
        return selectedPlanetIndex !== null
            ? props.system.planets[selectedPlanetIndex]
            : null;
    };

    const nameInputChanged = (e) => {
        setNewName(e.target.value);
    };

    const startNameInput = () => {
        setEnteringNewName(true);
    };

    const cancelNameInput = () => {
        setEnteringNewName(false);
    };

    const canUpgradePlanet = (planet) => {
        return planet && planet.level < OmegaDefaults.MAX_PLANET_LEVEL && props.balance >= unitsToPico(2);
    }

    const showPlanets = () => {
        const selectedPlanet = getSelectedPlanet();
        const gradeClassName = 'grade ' + (selectedPlanet ? proofToClassName(selectedPlanet.mineral_proof) : '');
        const harvestable = selectedPlanet && getHarvestable(selectedPlanet, props.blockNumber);
        const harvestablePerHour = selectedPlanet && getHarvestablePerHour(selectedPlanet, props.blockNumber);
        const harvestableClassName = 'planetAction ' + (selectedPlanet && !harvestable ? 'disabled' : '');
        const harvestAllClassName = 'planetAction ' + (props.balance < unitsToPico(1) ? 'disabled' : ''); 
        const renameClassName = 'planetAction ' + (props.balance < unitsToPico(1) ? 'disabled' : ''); 
        const modalClassName = 'planetNameEntryModal ' + (enteringNewName ? '' : 'disabled');
        const upgradeClassName = selectedPlanet && ('planetAction ' + (canUpgradePlanet(selectedPlanet) ? '' : ' disabled'));

        const onUpgradeClick = () => {
            if (canUpgradePlanet(selectedPlanet)) {
                onUpgradePlanet();
            }
        };

        return (
            <React.Fragment>
                <div className="planets">
                    {_.map(props.system.planets, (planet, index) => {
                        const planetClassName = 'planet' +
                            (selectedPlanetIndex !== index && props.planetExpanded ? ' unselected' : '');
                        const ownerClassName = 'owner' +
                            (props.alice === planet.owner ? ' own': '')
                        const planetLevelClassName = 'planetLevel' +
                            (props.alice === planet.owner ? ' own': '')

                        return (
                            <div className={planetClassName} key={index} onClick={() => { onPlanetClick(index); }}>
                                <img src={Planets[planet.planet_type].asset} draggable={false}/>
                                <div className="moreDetails">
                                    <span className={ownerClassName}>Owned by {props.names && props.names[planet.owner]}</span>
                                    {planet.name &&
                                        <React.Fragment>
                                            <br/>
                                            <span className="planetName">{planet.name}</span>
                                        </React.Fragment>
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="planetDetail">
                    {selectedPlanet &&
                        <div className="closeDetailPanel planetDetailPanel"
                            onClick={() => { onPlanetClick(selectedPlanetIndex) }}>
                            <ArrowDropUpIcon size="large"/>
                        </div>
                    }
                    <div className="planetStats planetDetailPanel">
                        <div>
                            Level: {selectedPlanet && selectedPlanet.level}
                        </div>
                        <div>
                            Mineral: {selectedPlanet && MineralsAssets[selectedPlanet.mineral_type].name} 
                            <span className={gradeClassName}> (Grade {selectedPlanet && selectedPlanet.mineral_proof})</span>
                        </div>
                        <div>
                            Harvest/Hour: {selectedPlanet && harvestablePerHour}
                        </div>
                        <div>
                            Harvestable: {selectedPlanet && harvestable}
                        </div>
                        <div>
                            Defence: {selectedPlanet && getSelection(selectedPlanet)}
                        </div>
                    </div>
                    <div className="planetActions planetDetailPanel">
                        {selectedPlanet && props.alice !== selectedPlanet.owner && props.isAttackable &&
                            <div className="planetAction" onClick={onAttackPlanet}>
                                Attack
                            </div>
                        }
                        {selectedPlanet && props.alice !== selectedPlanet.owner && !props.isAttackable &&
                            <React.Fragment>
                                <div className="cantAttackExplain">
                                    To attack this Planet, you need to control an adjacent System, or the System connected via a Gateway.
                                </div>
                                <div className="planetAction disabled">
                                    Attack
                                </div>
                            </React.Fragment>
                        }
                        {selectedPlanet && props.alice === selectedPlanet.owner &&
                            <div className="planetAction" onClick={onReinforcePlanet}>
                                Garrison
                            </div>
                        }
                        {selectedPlanet && props.alice === selectedPlanet.owner &&
                            <div className={harvestableClassName} onClick={harvestable ? onHarvestPlanet : null}>
                                Harvest
                            </div>
                        }
                        {selectedPlanet && props.alice === selectedPlanet.owner &&
                            <div className={renameClassName} onClick={startNameInput}>
                                <div>
                                    <div className="iconWrapper">
                                        <OfflineBoltIcon/>
                                        <span>1</span>
                                    </div>
                                    <span>
                                        Rename
                                    </span>
                                </div>
                            </div>
                        }
                        {selectedPlanet && props.alice === selectedPlanet.owner &&
                            <div className={upgradeClassName} onClick={onUpgradeClick}>
                                <div>
                                    <div className="iconWrapper">
                                        <OfflineBoltIcon/>
                                        <span>2</span>
                                    </div>
                                    <span>
                                        Upgrade
                                    </span>
                                </div>
                            </div>
                        }
                        {selectedPlanet && props.alice === selectedPlanet.owner && 
                            <div className={harvestAllClassName} onClick={onHarvestAll}>
                                <div>
                                    <div className="iconWrapper">
                                        <OfflineBoltIcon/>
                                        <span>1</span>
                                    </div>
                                    <span>
                                        Harvest All
                                    </span>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <div className={modalClassName}>
                    <div className="centeredBox">
                        <input className="planetNameInput"
                            onChange={nameInputChanged}
                            value={newName}
                            placeholder="TAP TO ENTER PLANET NAME"/>
                        <div className="buttonBox doneBox" onClick={() => {
                            cancelNameInput();
                            onRenamePlanet();
                        }}>
                            DONE
                        </div>
                        <div className="buttonBox cancelBox" onClick={cancelNameInput}>
                            CANCEL
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    };

    const systemClassName = 'System' + (props.planetExpanded ? ' expanded' : '');

    return (
        <div className={systemClassName}>
            {showPlanets()}
        </div>
    );
};
