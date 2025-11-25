import React from 'react';

type ChartData = {
    name: string;
    value: number;
    color: string;
};

type PieChartProps = {
    data: ChartData[];
};

export default function PieChart({ data }: PieChartProps) {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    
    let cumulativePercentage = 0;
    const gradientParts = data.map(item => {
        const percentage = (item.value / total) * 100;
        const part = `${item.color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`;
        cumulativePercentage += percentage;
        return part;
    });

    const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;
    
    return (
        <div className="pie-chart-container">
            <div 
                className="pie-chart" 
                style={{ background: conicGradient }}
                role="img"
                aria-label="Pie chart showing candidate offer letter status"
            ></div>
            <div className="pie-chart-legend">
                {data.map(item => (
                    <div key={item.name} className="legend-item">
                        <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
