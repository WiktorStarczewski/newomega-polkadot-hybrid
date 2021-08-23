import React, { useEffect, useState } from 'react';
import './PriceSelector.css';
import { Range } from 'react-range';
import { OmegaDefaults, balanceToDisplay } from '../../definitions/OmegaDefaults';


// props: onChange
export const PriceSelector = (props) => {
    const [values, setValues] = useState([0]);
    const onChange = (newValues) => {
        setValues(newValues);
        props.onChange(newValues[0]);
    };

    return (
        <div className="PriceSelector">
            <Range
                values={values}
                step={1}
                min={0}
                max={OmegaDefaults.MAX_AUCTION_PRICE}
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
                            Move slider to set price
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
