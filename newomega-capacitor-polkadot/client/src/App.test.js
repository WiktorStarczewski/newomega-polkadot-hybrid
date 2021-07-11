import { render, screen, fireEvent } from '@testing-library/react';
import { Minerals } from './ui/components/Minerals';
import { ShipProduction } from './ui/components/ShipProduction';
import { System } from './ui/components/System';
import { SystemActions } from './ui/components/SystemActions';
import { SystemInfo } from './ui/components/SystemInfo';
import { LoginScreen } from './ui/LoginScreen';
import { Settings } from './ui/Settings';


jest.setTimeout(25000);

test('LoginScreen - Signup', async () => {
    const onLoginDone = (options) => {
        const mnemonic = options.finisher()[0];
        expect(mnemonic).toBeDefined();
        const words = mnemonic.split(' ');
        expect(words.length).toBe(12);
        expect(mnemonic).toEqual(localStorage.getItem('OmegaMnemonic'));
    };

    render(<LoginScreen onDone={onLoginDone}/>);

    const signupButton = screen.getByText(/sign up/i);
    expect(signupButton).toBeInTheDocument();

    signupButton.click();
    await new Promise((r) => setTimeout(r, 1000));
});

test('LoginScreen - Login', async () => {
    localStorage.removeItem('OmegaMnemonic');

    const dummyMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';

    const onLoginDone = (options) => {
        const mnemonic = options.finisher()[0];
        expect(mnemonic).toEqual(dummyMnemonic);
    };

    render(<LoginScreen onDone={onLoginDone}/>);

    const loginButton = screen.getByText(/log in/i);
    expect(loginButton).toBeInTheDocument();

    loginButton.click();

    const mnemonicInput = screen.getByPlaceholderText(/mnemonic/i);
    fireEvent.change(mnemonicInput, { target: { value: dummyMnemonic }});

    const loginAfterEntryButton = screen.getByText(/log in/i);
    expect(loginAfterEntryButton).toBeInTheDocument();

    loginAfterEntryButton.click();

    await new Promise((r) => setTimeout(r, 1000));
});

test('Settings', async () => {
    const address = 'Dummy Address';
    const balance = 1337;

    render(<Settings address={address} balance={balance} />);

    const firstAddress = screen.getByText(/dummy address/i);
    expect(firstAddress).toBeInTheDocument();

    const balanceElement = screen.getByText(/1337/i);
    expect(balanceElement).toBeInTheDocument();
});

test('Minerals', async () => {
    const ownMinerals = [1500, 1000, 1000, 1000];
    let mineralExpanded = true;
    const setMineralExpanded = (value) => {
        mineralExpanded = value;
    };
    const onClose = () => {
    };
    const system = {
        position: {

        },
        gateway_in: {

        },
        gateway_out: {

        },
        planets: [

        ],
        discoverer: '',
    };
    const ownTrades = [
        {
            exchange_for: 1,
            amount: 10,
        },
        {
            exchange_for: 0,
            amount: 10,
        },
        {
            exchange_for: 0,
            amount: 10,
        },
        {
            exchange_for: 0,
            amount: 10,
        },
    ];
    const systemTrades = [
        {
            exchange_for: 1,
            amount: 10,
        },
        {
            exchange_for: 0,
            amount: 10,
        },
        {
            exchange_for: 0,
            amount: 10,
        },
        {
            exchange_for: 0,
            amount: 10,
        },
    ];
    const aliceAddress = '';

    render(<Minerals 
        minerals={ownMinerals} 
        mineralExpanded={mineralExpanded} 
        setMineralExpanded={setMineralExpanded}
        onClose={onClose}
        system={system}
        ownTrades={ownTrades}
        systemTrades={systemTrades}
        alice={aliceAddress}/>);

    const moveSlider = screen.getByText(/Move the slider/i);
    expect(moveSlider).toBeInTheDocument();

    const createSale = screen.getByText(/Create Sale/i);
    expect(createSale).toBeInTheDocument();

    const debrine = screen.getByText(/1.00k Debrine/i);
    expect(debrine).toBeInTheDocument();

    const clesium = screen.getByText(/1.50k Clesium/i);
    expect(clesium).toBeInTheDocument();

    const register = screen.getByText(/You can register 1.50k to trade for/i);
    expect(register).toBeInTheDocument();
});

test('ShipProduction', async () => {
    const ownMinerals = [1500, 1000, 1000, 1000];
    const playerShips = [2500, 2000, 1000, 500];
    let shipExpanded = true;
    const setShipExpanded = (value) => {
        shipExpanded = value;
    };
    const onClose = () => {
    };
    const system = {
        position: {

        },
        gateway_in: {

        },
        gateway_out: {

        },
        planets: [

        ],
        discoverer: '',
    };

    render(<ShipProduction 
        minerals={ownMinerals}
        shipExpanded={shipExpanded}
        setShipExpanded={setShipExpanded}
        onClose={onClose}
        playerShips={playerShips}/>);

    const stinger = screen.getByText(/3k Stinger/i);
    expect(stinger).toBeInTheDocument();

    const icarus = screen.getByText(/2k Icarus/i);
    expect(icarus).toBeInTheDocument();

    const moveSlider = screen.getByText(/Move the slider/i);
    expect(moveSlider).toBeInTheDocument();

    const inStorage = screen.getByText(/In Storage: 1500 Clesium/i);
    expect(inStorage).toBeInTheDocument();

    const produce = screen.getByText(/Produce/i);
    expect(produce).toBeInTheDocument();

    const shipyard = screen.getByText(/Shipyard: 2500/i);
    expect(shipyard).toBeInTheDocument();
});

test('System', async () => {
    let planetExpanded = true;
    const setPlanetExpanded = (value) => {
        planetExpanded = value;
    };
    const onClose = () => {
    };
    const system = {
        position: {
            root: '',
            position_x: 0,
            position_y: 0,
        },
        gateway_in: {
            built: false,
        },
        gateway_out: {
            built: false,
        },
        planets: [
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
        ],
        discoverer: '',
    };
    const names = [];
    const aliceAddress = '';

    render(<System 
        names={names}
        system={system}
        setPlanetExpanded={setPlanetExpanded}
        planetExpanded={planetExpanded}
        alice={aliceAddress}
        isAttackable={true}
        blockNumber={1}
        balance={100}
        onClose={onClose}/>);

    const level = screen.getByText(/Level: 1/i);
    expect(level).toBeInTheDocument();

    const mineral = screen.getByText(/Mineral: Debrine/i);
    expect(mineral).toBeInTheDocument();

    const grade = screen.getByText(/Grade 70/i);
    expect(grade).toBeInTheDocument();

    const defence = screen.getByText(/Defence: 10 \| 10 \| 10 \| 10/i);
    expect(defence).toBeInTheDocument();

    const attack = screen.getByText(/Attack/i);
    expect(attack).toBeInTheDocument();
});

test('SystemInfo', async () => {
    const system = {
        position: {
            root: '',
            position_x: 0,
            position_y: 0,
        },
        gateway_in: {
            built: false,
        },
        gateway_out: {
            built: false,
        },
        planets: [
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
            {
                level: 1,
                planet_type: 1,
                mineral_type: 1,
                mineral_proof: 70,
                selection: [10, 10, 10, 10],
            },
        ],
        discoverer: '',
    };
    const names = [];
    const aliceAddress = '';
    const ownMinerals = [1500, 1000, 1000, 1000];
    const playerShips = [2500, 2000, 1000, 500];

    render(<SystemInfo 
        system={system}
        names={names}
        alice={aliceAddress}
        minerals={ownMinerals}
        playerShips={playerShips}/>);

    const position = screen.getByText(/0:0/i);
    expect(position).toBeInTheDocument();

    const resources = screen.getByText(/Resources: Clesium 1.5k | Debrine 1.0k | Meclese 1.0k | Jeblite 1.0k/i);
    expect(resources).toBeInTheDocument();

    const ships = screen.getByText(/Ships: Stinger 3k | Icarus 2k | Scorpio 1k | Hyperion 500/i);
    expect(ships).toBeInTheDocument();
});

test('SystemActions', async () => {
    const system = {
        position: {
            root: '',
            position_x: 0,
            position_y: 0,
        },
        gateway_in: {
            built: false,
            target: {
                root: '',
                position_x: 0,
                position_y: 0,
            },
        },
        gateway_out: {
            built: false,
            target: {
                root: '',
                position_x: 0,
                position_y: 0,
            },
        },
    };
    const names = [];
    const planetExpanded = true;
    
    render(<SystemActions
        system={system}
        names={names}
        planetExpanded={planetExpanded}/>);

    const buildGateway = screen.getByText(/Build/i);
    expect(buildGateway).toBeInTheDocument();

    system.gateway_out.built = true;

    const teleportGateway = screen.getByText(/Teleport/i);
    expect(teleportGateway).toBeInTheDocument();
});