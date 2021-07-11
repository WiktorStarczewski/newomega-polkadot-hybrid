import React, { useEffect, useState } from 'react';

// props: loading
export const LoadingScreen = (props) => {
    return (
        <div
            id="omegaLoadingScreen"
            style={!props.loading ? {display: 'none'} : {}}>
            <div className="logo"/>
            <div className="progressOuter progress-line"/>
            <div className="status">
                <span className="blockchain">
                    Waiting for blockchain...
                </span>
                <span className="assets">
                    Loading assets...
                </span>
            </div>
        </div>
    );
};
