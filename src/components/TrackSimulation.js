import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const TrackSimulation = ({ year, eventName }) => {
  const [trackData, setTrackData] = useState([]);
  const [driverPositions, setDriverPositions] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxFrames, setMaxFrames] = useState(0);

  const animationRef = useRef(null);

  // Fetch track data from the backend
  useEffect(() => {
    const fetchTrackData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/track/${year}/${eventName}`);
        setTrackData(response.data.track);
      } catch (error) {
        console.error("Error fetching track data:", error);
      }
    };

    if (year && eventName) {
      fetchTrackData();
    }
  }, [year, eventName]);

  // Fetch driver position data from the backend
  useEffect(() => {
    const fetchDriverPositions = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/race/${year}/${eventName}/positions`);
        const positions = response.data.positions || {};
        console.log("Fetched Driver Positions:", positions); // Debugging Log
        setDriverPositions(positions);

        if (positions['1'] && positions['1'].length) {
          setMaxFrames(positions['1'].length); // Assume driver '1' has the same length for all drivers
        }
      } catch (error) {
        console.error("Error fetching driver positions:", error);
      }
    };

    if (year && eventName) {
      fetchDriverPositions();
    }
  }, [year, eventName]);

  // Start animation once data is ready
  useEffect(() => {
    if (maxFrames > 0 && Object.keys(driverPositions).length > 0) {
      animateDrivers();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [maxFrames, driverPositions]);

  const animateDrivers = () => {
    animationRef.current = requestAnimationFrame(() => {
      setCurrentIndex(prevIndex => {
        const newIndex = prevIndex < maxFrames - 1 ? prevIndex + 1 : 0;
        console.log("Current Index:", newIndex); // Debugging Log
        return newIndex;
      });
      animateDrivers();
    });
  };

  const getBoundingBox = (data) => {
    const xValues = data.map(point => point.X);
    const yValues = data.map(point => point.Y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    return { minX, maxX, minY, maxY };
  };

  const renderTrack = () => {
    if (!trackData || trackData.length === 0) return null;

    const { minX, maxX, minY, maxY } = getBoundingBox(trackData);
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = 100;

    const trackPath = trackData.map((point, index) => {
      const x = point.X - minX + padding;
      const y = point.Y - minY + padding;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    return (
      <svg
        width="800"
        height="600"
        viewBox={`0 0 ${width + 2 * padding} ${height + 2 * padding}`}
        style={{ border: '1px solid black' }}
      >
        <path d={trackPath} style={{ stroke: 'black', fill: 'none', strokeWidth: 100 }} />
        {renderDrivers(padding, minX, minY)}
      </svg>
    );
  };

  const renderDrivers = (padding, minX, minY) => {
    if (!driverPositions || Object.keys(driverPositions).length === 0) {
      return null;
    }

    const scale = 1;
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'cyan', 'magenta'];
    const driverCircles = [];
    let colorIndex = 0;

    for (const [driverNum, positions] of Object.entries(driverPositions)) {
      if (positions && positions.length > currentIndex) {
        let { X, Y } = positions[currentIndex];
        console.log(`Driver ${driverNum}: X=${X}, Y=${Y}`); // Debugging Log

        
        const x = (X - minX) * scale + padding;
        const y = (Y - minY) * scale + padding;

        driverCircles.push(
          <circle 
            key={driverNum} 
            cx={x} 
            cy={y} 
            r="100" 
            fill={colors[colorIndex % colors.length]} 
            stroke="black" 
          />
        );
      }
      colorIndex++;
    }

    return driverCircles;
  };

  return (
    <div>
      <h2>Track Simulation</h2>
      {renderTrack()}
    </div>
  );
};

export default TrackSimulation;
