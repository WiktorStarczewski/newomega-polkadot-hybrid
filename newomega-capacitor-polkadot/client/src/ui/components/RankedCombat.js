import React, { useEffect, useState } from 'react';
import { DefenceFleet } from './DefenceFleet';
import { AttackFleet } from './AttackFleet';
import { LoadingScreen } from './LoadingScreen';
import Tour from 'reactour';
import './RankedCombat.css';

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

// props: facade, onRegisterFleet, onUnregisterFleet, onFleetLoaded, onAttackFleet, attackDisabled, isTourOpen, setIsTourOpen
export const RankedCombat = (props) => {
    const [defenceLoading, setDefenceLoading] = useState(true);
    const [attackLoading, setAttackLoading] = useState(true);

    return (
        <div className="RankedCombat">
            {!defenceLoading && !attackLoading && 
                <Tour
                    steps={tourSteps}
                    isOpen={props.isTourOpen}
                    onRequestClose={() => props.setIsTourOpen(false)}
                />
            }
            <DefenceFleet
                onRegisterFleet={props.onRegisterFleet}
                onUnregisterFleet={props.onUnregisterFleet}
                onFleetLoaded={props.onFleetLoaded}
                loading={defenceLoading}
                setLoading={setDefenceLoading}
                facade={props.facade}
            />
            <AttackFleet
                onAttackFleet={props.onAttackFleet}
                disabled={props.attackDisabled}
                loading={attackLoading}
                setLoading={setAttackLoading}
                facade={props.facade}
            />
            {(defenceLoading || attackLoading) &&
                <LoadingScreen loading={defenceLoading || attackLoading}/>}
        </div>
    );
};
