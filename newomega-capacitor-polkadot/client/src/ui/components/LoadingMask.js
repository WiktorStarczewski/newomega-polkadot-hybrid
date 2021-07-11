import React, { useEffect, useState } from 'react';
import './LoadingMask.css';
import AnimatedBg from "react-animated-bg";

// props: emulateClassName
export const LoadingMask = (props) => {
    const finalClassName = 'LoadingMask' +
        (props.emulateClassName
            ? ' ' + props.emulateClassName
            : '');
    const getColors = () => {
        return [
            'rgba(255, 255, 255, 0)',
            'rgba(254, 136, 8, 0.33)',
            'rgba(219, 30, 95, 0.33)',
            'rgba(113, 224, 209, 0.33)',
        ];
    };

    return (
        <div className={finalClassName}>
            <AnimatedBg
                className="loadingMaskAnimatedBg"
                colors={getColors()}
                duration={0.5}
                delay={0}
                timingFunction="ease-in"
                className="animatedSection"
            />
        </div>
    );
};
