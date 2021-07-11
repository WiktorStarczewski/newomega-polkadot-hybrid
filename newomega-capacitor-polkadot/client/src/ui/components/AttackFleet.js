import React, { useEffect, useState, useRef } from 'react';
import _ from 'underscore';
import './AttackFleet.css';
import { GiSubmarineMissile } from 'react-icons/gi';
import Slider from 'react-slick';
import { balanceToDisplay } from '../../definitions/OmegaDefaults';
import LinearProgress from '@material-ui/core/LinearProgress';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import OfflineBoltIcon from '@material-ui/icons/OfflineBolt';


// props: facade, onAttackFleet, disabled, loading, setLoading
export const AttackFleet = (props) => {
    const [defenders, setDefenders] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const defenders = await props.facade.getAllDefenders();
                const defendersSorted = defenders.sort((lhs, rhs) => rhs.wins - lhs.wins);
                setDefenders(defendersSorted);
            } catch (error) {
            }

            props.setLoading(false);
        }

        fetchData();
    }, []);

    const attackFleet = (address, selection, variants, balance) => {
        !props.disabled && props.onAttackFleet(address, selection, variants, balance);
    };

    const sliderSettings = {
        dots: true,
        infinite: false,
        slidesToShow: 3,
        speed: 500,
        slidesToScroll: 1,
        adaptiveHeight: true,
    };

    const readyClass = props.disabled ? 'defenderInnerReady' : '';

    return (
        <div className="AttackFleet">
            {props.loading && 
                <div className="progress">
                    <LinearProgress/>
                </div>
            }
            {!props.loading && defenders &&
                <Slider className="defenders" {...sliderSettings}>
                    {_.map(defenders, (defender, index) =>
                        <div key={index}>
                            <div 
                                className="defender" 
                                onClick={() => attackFleet(defender.address, defender.selection,
                                    defender.variants, defender.value)
                                }
                                style={{height: window.innerHeight / 10 * 3}}
                            >
                                <div className="defenderInner">
                                    {props.disabled &&
                                        <div className="registerFirst">
                                            Register First
                                        </div>
                                    }
                                    <div className={readyClass}>
                                        <div className="defenderName">
                                            {defender.name}
                                        </div>
                                        <div className="defenderValue">
                                            <OfflineBoltIcon/>
                                            {balanceToDisplay(defender.value)}
                                        </div>
                                        <div className="wins">
                                            {defender.wins} Wins {defender.losses} Losses
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Slider>
            }
            {!props.loading && !defenders &&
                <div>Error</div>
            }
        </div>
    );
};
