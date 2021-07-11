import { Vector3 } from '@babylonjs/core';
import _ from 'underscore';

export const getOwnedPlanets = (system, alice) => {
    return _.where(system.planets, {
        owner: alice,
    }).length;
};

export const isSystemOwner = (system, alice) => {
    return getOwnedPlanets(system, alice) >= 3;
};

export const Planets = [
    {
        asset: 'assets/images/planets/planet_1.png',
    },
    {
        asset: 'assets/images/planets/planet_2.png',
    },
    {
        asset: 'assets/images/planets/planet_3.png',
    },
    {
        asset: 'assets/images/planets/planet_4.png',
    },
    {
        asset: 'assets/images/planets/planet_5.png',
    },
    {
        asset: 'assets/images/planets/planet_6.png',
    },
    {
        asset: 'assets/images/planets/planet_7.png',
    },
    {
        asset: 'assets/images/planets/planet_8.png',
    },
    {
        asset: 'assets/images/planets/planet_9.png',
    },
    {
        asset: 'assets/images/planets/planet_10.png',
    },
    {
        asset: 'assets/images/planets/planet_11.png',
    },
    {
        asset: 'assets/images/planets/planet_12.png',
    },
    {
        asset: 'assets/images/planets/planet_13.png',
    },
    {
        asset: 'assets/images/planets/planet_14.png',
    },
    {
        asset: 'assets/images/planets/planet_15.png',
    },
    {
        asset: 'assets/images/planets/planet_16.png',
    },
    {
        asset: 'assets/images/planets/planet_17.png',
    },
    {
        asset: 'assets/images/planets/planet_18.png',
    },
    {
        asset: 'assets/images/planets/planet_19.png',
    },
    {
        asset: 'assets/images/planets/planet_20.png',
    },
    {
        asset: 'assets/images/planets/planet_21.png',
    },
    {
        asset: 'assets/images/planets/planet_22.png',
    },
    {
        asset: 'assets/images/planets/planet_23.png',
    },
    {
        asset: 'assets/images/planets/planet_24.png',
    },
    {
        asset: 'assets/images/planets/planet_25.png',
    },
];

export const MineralsAssets = [
    {
        name: 'Clesium',
        asset: 'assets/images/minerals/mineral_1.png',
    },
    {
        name: 'Debrine',
        asset: 'assets/images/minerals/mineral_2.png',
    },
    {
        name: 'Meclese',
        asset: 'assets/images/minerals/mineral_3.png',
    },
    {
        name: 'Jeblite',
        asset: 'assets/images/minerals/mineral_4.png',
    },
];

export const Gateway = {
    assetIn: 'assets/images/szpieg_portal.png',
    assetOut: 'assets/images/szpieg_gateway.png',
};

export const Shipyard = {
    asset: 'assets/images/bryce.png',
};

export const Embassy = {
    asset: 'assets/images/embassy.png',
};

export const proofToClassName = (proof) => {
    const lookup = {
        100: 'primal',
        85: 'legendary',
        75: 'epic',
        50: 'rare',
        30: 'common',
    };

    let clName = '';
    _.each(_.keys(lookup).reverse(), (lookupKey) => {
        if (proof < lookupKey) {
            clName = lookup[lookupKey];
        }
    });

    return clName;
};

export const getHarvestable = (planet, currentBlockNumber) => {
    const maxHarvestableBlocks = 24000;
    const blockCount = Math.min(currentBlockNumber - planet.last_harvested, maxHarvestableBlocks);

    return Math.floor(blockCount / 100) * planet.level * planet.mineral_proof;
};

export const getHarvestablePerHour = (planet) => {
    const blockSeconds = 3;
    const blocksInMinute = 60 / blockSeconds;
    const blocksInHour = 60 * blocksInMinute;

    return ((blocksInHour / 100) * planet.level * planet.mineral_proof).toFixed(1);
};