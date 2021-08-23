import React, { useEffect, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';
import Tour from 'reactour';
import { ModuleCraft } from '../../scenes/ModuleCraft';
import { GiCrafting, GiTrade } from 'react-icons/gi';
import './ManageModules.css';
import { ModulesMarket } from './ModulesMarket';

// props: facade, isTourOpen, setIsTourOpen
export const ManageModules = (props) => {
    const [isCraftOpen, setIsCraftOpen] = useState(true);
    const [isMarketOpen, setIsMarketOpen] = useState(false);
    const [resourcesLoaded, setResourcesLoaded] = useState(false);

    const openCraft = () => {
        setIsCraftOpen(true);
        setIsMarketOpen(false);
    };

    const openMarket = () => {
        setIsCraftOpen(false);
        setIsMarketOpen(true);
    };

    const tourSteps = [
        {
            selector: '.moduleModeChange:nth-child(1)',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Crafting
                    </h3>
                    <h5>
                        Use resources and tokens to craft Ship Modules. The Modules are NFTs that are minted for you when crafting. They receive a randomised set of properties, depending on the quality. Quality comes in five types: Common, Rare, Epic, Legendary and Primal.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: openCraft,
        },
        {
            selector: '.mineralButton',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Minerals
                    </h3>
                    <h5>
                        Crafting Modules uses Minerals. Amount you have and amount you need is shown here.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: openCraft,
        },
        {
            selector: '.craftButton',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Craft
                    </h3>
                    <h5>
                        Additional to Minerals, crafting Modules uses tokens. Press this button to spin the wheel and see which Module you get!
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: openCraft,
        },
        {
            selector: '.moduleModeChange:nth-child(2)',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Module Market
                    </h3>
                    <h5>
                        Additional to crafting, you can trade your Modules for tokens with other players here. The trades work as auctions with a buyout price. If you see a Module you like, you can pay the buyout price to get it.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: openCraft,
        },
        {
            selector: '.moduleModeChange:nth-child(2)',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Module Market
                    </h3>
                    <h5>
                        When registering a module for sale, it is transfered to the Smart Contract for the auction duration and you can not use it.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: openMarket,
        },
        {
            selector: '.playerModules',
            content: ({ goTo, step }) => (
                <div>
                    <h3>
                        Your Modules
                    </h3>
                    <h5>
                        All the Modules you currently own are listed here. You can scroll through the list and pick one for sale.
                    </h5>
                    <div className="tourButton" onClick={() => goTo(step)}>Next</div>
                </div>
            ),
            action: openMarket,
        },
        {
            selector: '.market',
            content: ({ close }) => (
                <div>
                    <h3>
                        Module Market
                    </h3>
                    <h5>
                        You can scroll through the currently open auctions here. If an auction was opened by you, you can cancel it. Otherwise, you can buy the Module by tapping Buy.
                    </h5>
                    <div className="tourButton" onClick={close}>Got it!</div>
                </div>
            ),
            action: openMarket,
        },
    ];
    
    const mainClassName = 'ManageModules'    
        + (resourcesLoaded ? ' loaded' : '')
        + (isCraftOpen ? ' craftOpen' : '')
        + (isMarketOpen ? ' marketOpen' : '');

    return (
        <div className={mainClassName}>
            {resourcesLoaded && 
                <Tour
                    steps={tourSteps}
                    isOpen={props.isTourOpen}
                    onRequestClose={() => props.setIsTourOpen(false)}
                />
            }
            <ModuleCraft 
                balance={props.balance} 
                facade={props.facade}
                isCraftOpen={isCraftOpen}
                resourcesLoaded={resourcesLoaded}
                setResourcesLoaded={setResourcesLoaded}/>
            <ModulesMarket
                facade={props.facade}
                balance={props.balance}
                isMarketOpen={isMarketOpen}
                />
            {resourcesLoaded && 
                <div className="modulesModes">
                    <GiCrafting 
                        onClick={openCraft}
                        className={'moduleModeChange moduleModeCraft ' + (isCraftOpen ? 'active' : '')}
                    />
                    <GiTrade 
                        onClick={openMarket}
                        className={'moduleModeChange moduleModeTrade ' + (isMarketOpen ? 'active' : '')}
                    />
                </div>
            }
        </div>
    );
};
