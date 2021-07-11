export const OmegaDefaults = {
    VERSION_STRING: 'Version: 1.0 (c) NewOmega',
    NETWORK: 'Polkadot (New Omega Network)',
    PLAYER_NAME: 'Anonymous',
    MIN_BET: 0,
    MAX_BET: 10000,
    MAX_PLANET_LEVEL: 100,
    BLOCK_TIME_SECONDS: 3,
    FREE_DISCOVERY_FREQUENCY_BLOCKS: 1000, // facade.rs
    SHIP_COST_PER_CP: 10,
    //    RPC_PROVIDER: 'ws://127.0.0.1:9944', // wss://rpc.polkadot.io
    RPC_PROVIDER: 'wss://newomega.network',
};

//    RPC_PROVIDER: 'wss://beresheet1.edgewa.re',
    // RPC_PROVIDER: 'wss://rpc.dusty.plasmnet.io',

export const picoToUnits = (balance) => {
    return balance / 1000000 / 1000000;
};

export const unitsToPico = (balance) => {
    return balance * 1000000 * 1000000;
};

export const balanceToDisplay = (balance) => {
    return `${picoToUnits(balance)}`;
};

export const isDiscoveryFree = (currentBlockNumber, lastBlockNumber) => {
    return currentBlockNumber - lastBlockNumber > OmegaDefaults.FREE_DISCOVERY_FREQUENCY_BLOCKS;
};

export const blocksTillNextFreeDiscovery = (currentBlockNumber, lastBlockNumber) => {
    return lastBlockNumber + OmegaDefaults.FREE_DISCOVERY_FREQUENCY_BLOCKS - currentBlockNumber;
};

export const blocksToTimeString = (blocks) => {
    const date = new Date(0);
    date.setSeconds(blocks * OmegaDefaults.BLOCK_TIME_SECONDS);
    return date.toISOString().substr(11, 8);
};