import { GiBarefoot } from 'react-icons/gi';
import { GiCloverSpiked } from 'react-icons/gi';
import { GiBlindfold } from 'react-icons/gi';
import { GiBrokenShield } from 'react-icons/gi';
import { GiBrokenSkull } from 'react-icons/gi';
import { GiBrokenArrow } from 'react-icons/gi';

const moduleNamesPrefixesString = 'Robust Gaping Large Dazzling Delicate Assorted Detailed Harmonious Miniature Closed Small Internal Broad Combative Tested Swift Distinct Strong Decorous Perpetual Futuristic Automatic Boundless Substantial Valuable Self-Sufficient Rational Programmed Bionic Extreme Essential Dynamic ';
const moduleNamesPrefixes = moduleNamesPrefixesString.split(' ');

const moduleNamesMiddleString = 'Adamantite Atium Bavarium Cavorite Chelonium Chronoton Corrodium Durium Harbenite Inerton Lerasium Nanite Octiron Polydenum Radianite Regalite Runite Scrith Septium Taydenite Timonium Uridium Xirdalium Xithricite';
const moduleNamesMiddle = moduleNamesMiddleString.split(' ');

const moduleNamesSuffixesString = 'Orchestrator Expeditor Engager Integrator Enhancer Converger Cultivator Deployer Evolver Generator Incubator Optimizer Reactor Emulator Eradicator Exterminator Protector';
const moduleNamesSuffixes = moduleNamesSuffixesString.split(' ');

export const tokenIdToName = (tokenId) => {
    return moduleNamesPrefixes[tokenId % moduleNamesPrefixes.length] + ' ' +
        moduleNamesMiddle[(tokenId * 5) % moduleNamesMiddle.length] + ' ' +
        moduleNamesSuffixes[(tokenId * 7) % moduleNamesSuffixes.length];
};

export const AllEffects = [ 'snare', 'root', 'blind', 'attack_debuff',
    'defence_debuff', 'range_debuff'];
export const EffectNamesLookup = [ 'Snare', 'Root', 'Blind', '-Atk', '-Def', '-Range' ];

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
