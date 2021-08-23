import React, { useEffect, useState } from 'react';
import _ from 'underscore';
import { SellModuleInfo } from './SellModuleInfo';
import './ModulesMarket.css';
import { AuctionInfo } from './AuctionInfo';
import { LoadingMask } from './LoadingMask';


const tourSteps = [
    {
        selector: '.DefenceFleet',
        content: ({ goTo, step }) => (
            <div>
                <h3>
                    Home Fleet
                </h3>
                <h5>
                    Ranked Combat in New Omega works by registering fleets, together with a chosen amount of NOT tokens. 
                    These fleets can then be attacked by other players, who bet NOT tokens for their ships. 
                    Attacker takes 50% of the bet when winning, Defender takes all.
                    All winnings are added to the Home fleet balance.  You can choose to cash out your balance about once a day.
                </h5>
                <h4>
                    Before attacking other players, you must register your Home fleet.
                </h4>
                <div className="tourButton" onClick={() => goTo(step)}>Next</div>
            </div>
        ),
    },
    {
        selector: '.AttackFleet',
        content: ({ close }) => (
            <div>
                <h3>
                    Registered Fleets
                </h3>
                <h5>
                    You can attack any other player, and bet up to the amount they have bet for their fleets. You need NOT tokens in your balance in order to bet (you can also choose a zero bet).
                    Ships in this mode don't need to be produced (unlike in Universe), and they don't die after combat.
                </h5>
                <h4>
                    Attack players after registering your Home fleet by tapping on them. You will be asked to choose ships and your bet. 
                </h4>
                <div className="tourButton" onClick={close}>Got it!</div>
            </div>
        ),
    },
];

// props: facade, isTourOpen, setIsTourOpen
export const ModulesMarket = (props) => {
    const [loading, setLoading] = useState(false);
    const [playerModules, setPlayerModules] = useState(null);
    const [allAuctions, setAllAuctions] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        const _modules = await props.facade.getPlayerModules();
        setPlayerModules(_modules);
        const _allAuctions = await props.facade.getAllAuctions();
        setAllAuctions(_allAuctions);
        setLoading(false);
    };

    const sellModule = async (tokenId, price) => {
        setLoading(true);
        await props.facade.registerModuleSale(tokenId, price);
        fetchData();
    };

    const destroyModule = async (tokenId) => {
        setLoading(true);
        await props.facade.destroyModule(tokenId);
        fetchData();
    };

    const buyModule = async (seller, tokenId, price) => {
        setLoading(true);
        await props.facade.buyModuleFromMarket(seller, tokenId, price);
        fetchData();
    };

    const cancelAuction = async (tokenId) => {
        setLoading(true);
        await props.facade.cancelModuleSale(tokenId);
        fetchData();
    };

    const showPlayerModules = () => {
        return _.map(playerModules, (playerModule, index) => {
            const [tokenId, definition] = playerModule;

            return (
                <SellModuleInfo
                    key={tokenId} 
                    tokenId={tokenId}
                    module={definition}
                    onSell={sellModule}
                    onDestroy={destroyModule}/>
            );
        });
    };

    const showAuctions = () => {
        return _.map(allAuctions, (auction, index) => {
            const [seller, tokenId, price, definition] = auction;

            return (
                <AuctionInfo
                    key={tokenId}
                    alice={props.facade.alice.address}
                    balance={props.balance}
                    seller={seller}
                    tokenId={tokenId}
                    price={price}
                    module={definition}
                    onBuy={buyModule}
                    onCancel={cancelAuction}/>
            );
        });
    };

    useEffect(() => {
        if (props.isMarketOpen) {
            fetchData();
        }
    }, [props.facade, props.isMarketOpen]);

    const mainClassName = 'ModulesMarket' + (loading ? ' loading' : '');

    return (
        <div className={mainClassName}>
            <div className="playerModules">
                <div className="info">
                    ↓ Your Modules ↓
                </div>
                {showPlayerModules()}
            </div>
            {loading && <LoadingMask
                emulateClassName="playerModules"/>
            }
            <div className="market">
                <div className="info">
                    ↓ Auctions ↓
                </div>
                {showAuctions()}
            </div>
            {loading && <LoadingMask
                emulateClassName="market"/>
            }
        </div>
    );
};
