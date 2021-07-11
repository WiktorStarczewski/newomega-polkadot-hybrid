import { Color3, Vector3 } from '@babylonjs/core';
import { GiPathDistance, GiHealthIncrease, GiHealthDecrease, GiSpeedometer,
    GiBowArrow, GiBrokenArrow } from 'react-icons/gi';
import { RiPinDistanceFill } from 'react-icons/ri';
import { IoMdSpeedometer } from 'react-icons/io';
import { FiShield, FiShieldOff } from 'react-icons/fi';

export const GOLD_PER_CP = 100;
export const MAX_OFEACH_SHIP = 100;

export const Targeting = {
    Furthest: 'Furthest',
    Closest: 'Closest',
    HighestHp: 'HighestHp',
    LowestHp: 'LowestHp',
    HighestSpeed: 'HighestSpeed',
    LowestSpeed: 'LowestSpeed',
    HighestDefence: 'HighestDefence',
    LowestDefence: 'LowestDefence',
    HighestAttack: 'HighestAttack',
    LowestAttack: 'LowestAttack',
};

export const TargetingToIcon = {
    [Targeting.Furthest]: GiPathDistance,
    [Targeting.Closest]: RiPinDistanceFill,
    [Targeting.HighestHp]: GiHealthIncrease,
    [Targeting.LowestHp]: GiHealthDecrease,
    [Targeting.HighestSpeed]: GiSpeedometer,
    [Targeting.LowestSpeed]: IoMdSpeedometer,
    [Targeting.HighestDefence]: FiShield,
    [Targeting.LowestDefence]: FiShieldOff,
    [Targeting.HighestAttack]: GiBowArrow,
    [Targeting.LowestAttack]: GiBrokenArrow,
};

export const TargetingToTitle = {
    [Targeting.Furthest]: 'Furthest',
    [Targeting.Closest]: 'Closest',
    [Targeting.HighestHp]: 'Highest HP',
    [Targeting.LowestHp]: 'Lowest HP',
    [Targeting.HighestSpeed]: 'Highest Speed',
    [Targeting.LowestSpeed]: 'Lowest Speed',
    [Targeting.HighestDefence]: 'Highest Defence',
    [Targeting.LowestDefence]: 'Lowest Defence',
    [Targeting.HighestAttack]: 'Highest Attack',
    [Targeting.LowestAttack]: 'Lowest Attack',
};

export const TargetingToDescription = {
    [Targeting.Furthest]: 'Ships will try to target ships furthest from them, within their extended range',
    [Targeting.Closest]: 'Ships will try to target ships closest to them, within their extended range',
    [Targeting.HighestHp]: 'Ships will try to target ships with highest nominal Hit Points, within their extended range',
    [Targeting.LowestHp]: 'Ships will try to target ships with lowest nominal Hit Points, within their extended range',
    [Targeting.HighestSpeed]: 'Ships will try to target ships with highest current Speed, within their extended range',
    [Targeting.LowestSpeed]: 'Ships will try to target ships with lowest current Speed, within their extended range',
    [Targeting.HighestDefence]: 'Ships will try to target ships with highest current Defence, within their extended range',
    [Targeting.LowestDefence]: 'Ships will try to target ships with lowest current Defence, within their extended range',
    [Targeting.HighestAttack]: 'Ships will try to target ships with highest current Attack, within their extended range',
    [Targeting.LowestAttack]: 'Ships will try to target ships with lowest current Attack, within their extended range',
};

export const Ships = [
    {
        name: 'Stinger',
        asset: 'assets/obj-drone-v0-red-manga/',
        thumbnail: 'assets/images/ships/model_stinger.png',
        fileName: 'source/Drone V0 SciFi OBJ.obj.obj',
        textures: {
            diffuse: 'textures/DroneRedMangaDiffuse.tga-min.png',
            normals: 'textures/DroneRedMangaNormals.tga-min.png',
        },
        description: 'Cheap, quick and agile, the Stinger can be used as a quick strike weapon, able to reach enemy lines quickest. Can not withstand much heat though.',
        stats: {
            cp: 1,
            hp: 120,
            attack: {
                base: 80,
                variable: 20,
            },
            defence: 20,
            speed: 12,
            range: 12,
        },
        scale: 1200,
        combatScale: 0.6,
        visuals: {
            beamWidth: Math.PI / 256,
            fightRotationLhs: new Vector3(-Math.PI / 2, Math.PI / 2, 0),
            fightRotationRhs: new Vector3(-Math.PI / 2, -Math.PI / 2, 0),


            // rotationModifierY: 4,
            // rotationOffsetY: Math.PI / 2,
        },
    },
    {
        name: 'Icarus',
        asset: 'assets/obj-pilotles-drone-v1-sci-fi/',
        thumbnail: 'assets/images/ships/model_icarius.png',
        fileName: 'source/PilotlesDrone V1 SciFi OBJ.obj',
        textures: {
            diffuse: 'textures/DroneSciFiDiffuse.tga-min.png',
            normals: 'textures/DroneSciFiNormals.tga-min.png',
        },
        description: 'As lightest of the heavier ships, the Icarus retains some of the speed and maneuverability of the frigate while offering big improvements in the hull and weaponry.',
        stats: {
            cp: 3,
            hp: 150,
            attack: {
                base: 65,
                variable: 20,
            },
            defence: 30,
            speed: 8,
            range: 25,
        },
        scale: 1000,
        combatScale: 0.9,
        visuals: {
            fightRotationLhs: new Vector3(-Math.PI / 2, Math.PI / 2, 0),
            fightRotationRhs: new Vector3(-Math.PI / 2, -Math.PI / 2, 0),

            beamWidth: Math.PI / 96,
            // rotationModifierY: 2,
            // rotationOddOffsetY: Math.PI,
        },
    },
    {
        name: 'Scorpio',
        thumbnail: 'assets/images/ships/model_scorpio.png',
        asset: 'assets/obj-drone-v9-cybertech/',
        fileName: 'source/Drone V9 Cybertech OBJ.obj',
        textures: {
            diffuse: 'textures/Drone_V4_CyberTech_Diffuse.tga-min.png',
            normals: 'textures/Drone_V4_CyberTech_Normals.tga-min.png',
        },
        description: 'The Scorpio is an effective killing machine, providing both active support and serving as an artillery line raining heavy damage on enemy ships.',
        stats: {
            cp: 4,
            hp: 220,
            attack: {
                base: 65,
                variable: 20,
            },
            defence: 35,
            speed: 5,
            range: 50,
        },
        scale: 1000,
        combatScale: 0.9,
        visuals: {
            fightRotationLhs: new Vector3(-Math.PI / 2, -Math.PI / 2, 0),
            fightRotationRhs: new Vector3(-Math.PI / 2, -Math.PI * 3 / 2, 0),

            beamWidth: Math.PI / 96,
        },
    },
    {
        name: 'Hyperion',
        // asset: 'assets/obj-zeneca-brute/',
        // fileName: 'Zeneca Brute.obj',

        asset: 'assets/obj-drone-v2-sci-fi/',
        thumbnail: 'assets/images/ships/model_hyperion.png',
        fileName: 'source/Drone V2 SciFi OBJ.obj',
        textures: {
            diffuse: 'textures/DroneSciFiDiffuse.tga-min.png',
            normals: 'textures/DroneSciFiNormals.tga-min.png',
        },

        description: 'Fitted with state of the art weaponry and protection, the Hyperion is the ultimate fighting force in the galaxy.',
        stats: {
            cp: 10,
            hp: 450,
            attack: {
                base: 80,
                variable: 20,
            },
            defence: 40,
            speed: 1,
            range: 100,
        },
        //scale: 600,
        scale: 1400,
        combatScale: 1.2,
        visuals: {
            fightRotationLhs: new Vector3(-Math.PI / 2, Math.PI / 2, 0),
            fightRotationRhs: new Vector3(-Math.PI / 2, -Math.PI / 2, 0),

            beamWidth: Math.PI / 64,
        },
    },
];
