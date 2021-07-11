import { GiBarefoot } from 'react-icons/gi';
import { GiCloverSpiked } from 'react-icons/gi';
import { GiBlindfold } from 'react-icons/gi';
import { GiBrokenShield } from 'react-icons/gi';
import { GiBrokenSkull } from 'react-icons/gi';
import { GiBrokenArrow } from 'react-icons/gi';


export const AllEffects = [ 'snare', 'root', 'blind', 'attack_debuff',
    'defence_debuff', 'range_debuff'];

export const Effects = {
    NO_EFFECT: 0,
    SNARE: 1,
    ROOT: 2,
    BLIND: 3,
    ATTACK_DEBUFF: 4,
    DEFENCE_DEBUFF: 5,
    RANGE_DEBUFF: 6,
};

export const EffectNamesLookup = {
    [Effects.NO_EFFECT]: 'Choose Module',
    [Effects.SNARE]: 'Snare',
    [Effects.ROOT]: 'Root',
    [Effects.BLIND]: 'Blind',
    [Effects.ATTACK_DEBUFF]: 'Attack Debuff',
    [Effects.DEFENCE_DEBUFF]: 'Defence Debuff',
    [Effects.RANGE_DEBUFF]: 'Range Debuff',
};

export const DefaultModule = {
    snare: 0,
    root: 0,
    blind: 0,
    attack_debuff: 0,
    defence_debuff: 0,
    range_debuff: 0,
};

export const DefaultEffect = {
    snare: 0,
    root: 0,
    blind: 0,
    attack_debuff: 0,
    defence_debuff: 0,
    range_debuff: 0,
};

export const Modules = [
    {
        name: 'Navi Hack',
        type: Effects.SNARE,
        icon: GiBarefoot,
        techLevel: 1,
        description: 'Hacks the ship navigational systems, reducing speed by 50% for 1 round',
        stats: {
            snare: 100,
            root: 0,
            blind: 0,
            defence_debuff: 0,
            attack_debuff: 0,
            range_debuff: 0,
        },
    },
    {
        name: 'Navi Breakdown',
        type: Effects.ROOT,
        icon: GiCloverSpiked,
        techLevel: 2,
        description: 'Takes over the ship navigational systems, rendering it unable to move for 1 round',
        stats: {
            snare: 0,
            root: 100,
            blind: 0,
            defence_debuff: 0,
            attack_debuff: 0,
            range_debuff: 0,
        },
    },
    {
        name: 'System Neutralize',
        type: Effects.BLIND,
        icon: GiBlindfold,
        techLevel: 3,
        description: 'Takes over the ship critical systems, rendering it unable to attack or move for 1 round',
        stats: {
            snare: 0,
            root: 0,
            blind: 100,
            defence_debuff: 0,
            attack_debuff: 0,
            range_debuff: 0,
        },
    },
    {
        name: 'Weapons Hack',
        type: Effects.ATTACK_DEBUFF,
        icon: GiBrokenSkull,
        techLevel: 0,
        description: 'Hacks the ship weapons, reducing its Attack by 50% for 1 round',
        stats: {
            snare: 0,
            root: 0,
            blind: 0,
            defence_debuff: 0,
            attack_debuff: 100,
            range_debuff: 0,
        },
    },
    {
        name: 'Defences Hack',
        type: Effects.DEFENCE_DEBUFF,
        icon: GiBrokenShield,
        techLevel: 0,
        description: 'Hacks the ship Defences, reducing them by 50% for 1 round',
        stats: {
            snare: 0,
            root: 0,
            blind: 0,
            defence_debuff: 100,
            attack_debuff: 0,
            range_debuff: 0,
        },
    },
    {
        name: 'Range Hack',
        type: Effects.RANGE_DEBUFF,
        icon: GiBrokenArrow,
        techLevel: 0,
        description: 'Hacks the ship targeting, reducing Range by 50% for 1 round',
        stats: {
            snare: 0,
            root: 0,
            blind: 0,
            defence_debuff: 0,
            attack_debuff: 0,
            range_debuff: 100,
        },
    },
];
