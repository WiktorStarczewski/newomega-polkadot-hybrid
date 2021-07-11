import React, { useEffect, useState } from 'react';
import './BetSelector.css';
import { Range } from 'react-range';
import { OmegaDefaults, balanceToDisplay } from '../../definitions/OmegaDefaults';


// props: bet, max, onChange
export const BetSelector = (props) => {
    const [values, setValues] = useState([props.bet]);
    const onChange = (newValues) => {
        setValues(newValues);
        props.onChange(newValues[0]);
    };

    return (
        <div className="BetSelector">
            <Range
                values={values}
                step={1}
                min={OmegaDefaults.MIN_BET}
                max={props.max}
                onChange={onChange}
                renderTrack={({ props, children }) => (
                    <div
                        {...props}
                        className="betTrack"
                        style={{
                            ...props.style,
                        }}
                    >
                        <div className="infoText">
                            Move the slider to adjust the bet
                        </div>
                        {children}
                    </div>
                )}
                renderThumb={({ props }) => (
                    <div
                        {...props}
                        className="betThumb"
                        style={{
                            ...props.style,
                        }}
                    >
                        {values[0]}
                    </div>
                )}
            />
        </div>
    );
};
