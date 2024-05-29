import { ParallaxLayer } from '@react-spring/parallax';
import React, { useEffect, useRef } from 'react';
import './Landing.css';

const generateStaticPathData = () => {
    const startX = 0;
    const startY = 300; // Adjusted to start higher on the viewBox
    const endX = 1000;
    const numBuildings = 12;
    const maxHeight = 200;
    const minWidth = 20;
    const maxWidth = 60;

    let pathData = `M${startX},${startY} H${startX + 200}`;
    let currentX = startX + 200;

    for (let i = 0; i < numBuildings; i++) {
        const buildingHeight = Math.random() * maxHeight + 50; // Random height between 50 and maxHeight
        const buildingWidth = Math.random() * (maxWidth - minWidth) + minWidth; // Random width between minWidth and maxWidth
        const nextX = currentX + buildingWidth;

        // Determine if the building should be pointed
        const isPointed = Math.random() < 0.3; // 30% chance to be pointed

        if (isPointed) {
            const peakX = currentX + buildingWidth / 2;
            pathData += ` L${peakX},${startY - buildingHeight - 20} L${nextX},${startY - buildingHeight} V${startY}`;
        } else {
            pathData += ` V${startY - buildingHeight} H${nextX} V${startY}`;
        }

        // Adding a small horizontal line between buildings
        if (i < numBuildings - 1) {
            pathData += ` H${nextX + 10}`;
            currentX = nextX + 10;
        } else {
            currentX = nextX;
        }
    }

    pathData += ` H${endX}`;
    return pathData;
};

const Landing: React.FC<{ parallax: any }> = ({ parallax }) => {
    const pathRef = useRef<SVGPathElement>(null);
    const pathData = generateStaticPathData();

    useEffect(() => {
        const path = pathRef.current;
        if (path) {
            const length = path.getTotalLength();
            path.style.strokeDasharray = `${length}`;
            path.style.strokeDashoffset = `${length}`;
        }
    }, []);

    return (
        <ParallaxLayer
            offset={0}
            speed={-5}
            factor={1}
            onClick={() => parallax.current.scrollTo(1)}
            className="flex items-center justify-center"
        >
            <svg viewBox="0 0 1000 400" className="city-skyline"> {/* Increased viewBox height */}
                <path id="path" ref={pathRef} d={pathData} />
            </svg>
        </ParallaxLayer>
    );
};

export default Landing;
