import React, { useEffect, useState, useRef } from 'react';
import { proofToClassName } from '../../definitions/Planets';
import './ModuleInfo.css';
import { Bar } from 'react-chartjs-2';
import { EffectNamesLookup, tokenIdToName } from '../../definitions/Modules';
import _ from 'underscore';


// props: module, tokenId
export const ModuleInfo = React.memo((props) => {
    const [chartData, setChartData] = useState(null);
    const [chartOptions, setChartOptions] = useState(null);
    const canvasWrapper = useRef(null);

    useEffect(() => {
        const allValues = _.values(props.module.module_stats);
        const labels = EffectNamesLookup;
        const datasets = [
            {
                label: 'Chance To Trigger',
                data: allValues,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
            },
        ];

        setChartData({
            labels,
            datasets,
        });

        setChartOptions({
            maintainAspectRatio: false,
            animation: {
                loop: false,
            },
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)',
                    },
                    ticks: {
                        stepSize: 20,
                        font: {
                            family: '"Exo 2", sans-serif',
                        },
                    },
                },
                x: {
                    ticks: {
                        color: 'white',
                        font: {
                            family: '"Exo 2", sans-serif',
                        },
                    },
                },
            },
        });
    }, []);

    const allValues = _.values(props.module.module_stats);
    const sumAllValues = allValues.reduce((a, b) => a + b, 0);
    const innerClassName = proofToClassName(sumAllValues, 600); // TODO 600 = 6 * 100
    const rarityClassName = `rarity gradeBackground ${innerClassName}`;
    const nameClassName = `name grade ${innerClassName}`;

    return (
        <div className="ModuleInfo">
            <div className={rarityClassName}>
                <span>{innerClassName.toUpperCase()}</span>
            </div>
            <div className={nameClassName}>
                <span>{tokenIdToName(props.tokenId)}</span>
                <span className="nftId">
                    NFT ID: {props.tokenId}
                </span>
            </div>
            <div className="stats" ref={canvasWrapper}>
                {chartData && chartOptions && canvasWrapper.current &&
                    <Bar data={chartData} options={chartOptions} height={canvasWrapper.current.clientHeight}
                        width={canvasWrapper.current.clientWidth}/>
                }
            </div>
        </div>
    );
});
