import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const TrackSimulation = ({ year, eventName }) => {
  const canvasRef = useRef(null); // Ref for the canvas element
  const [trackData, setTrackData] = useState([]);
  const [driverPositions, setDriverPositions] = useState({});
  const [driverAbbreviations, setDriverAbbreviations] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxFrames, setMaxFrames] = useState(0);

  const animationRef = useRef(null); // For controlling the animation frame

  // Fetch track data from the backend
  useEffect(() => {
    const fetchTrackData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/track/${year}/${eventName}`);
        setTrackData(response.data.track);
      } catch (error) {
        console.error('Error fetching track data:', error);
      }
    };

    if (year && eventName) {
      fetchTrackData();
    }
  }, [year, eventName]);

  // Fetch driver position and abbreviation data from the backend
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        // Fetch driver positions
        const positionResponse = await axios.get(`http://127.0.0.1:8000/race/${year}/${eventName}/positions`);
        const positions = positionResponse.data.positions || {};
        setDriverPositions(positions);

        // Fetch driver abbreviations
        const abbreviationResponse = await axios.get(`http://127.0.0.1:8000/race/${year}/${eventName}/drivers`);
        const abbreviations = abbreviationResponse.data.drivers || {};
        setDriverAbbreviations(abbreviations);

        if (positions['1'] && positions['1'].length) {
          setMaxFrames(positions['1'].length); // Assume driver '1' has the same length for all drivers
        }
      } catch (error) {
        console.error('Error fetching driver positions or abbreviations:', error);
      }
    };

    if (year && eventName) {
      fetchDriverData();
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
      setCurrentIndex((prevIndex) => {
        return prevIndex < maxFrames - 1 ? prevIndex + 1 : 0;
      });
      animateDrivers(); // Recursively call to continue animation
    });
  };

  const drawTrack = (ctx) => {
    if (trackData.length === 0) return;

    const padding = 100;
    const { minX, maxX, minY, maxY } = getBoundingBox(trackData);
    const width = maxX - minX;
    const height = maxY - minY;
    const scaleX = (ctx.canvas.width - 2 * padding) / width;
    const scaleY = (ctx.canvas.height - 2 * padding) / height;

    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;

    trackData.forEach((point, index) => {
      const x = (point.X - minX) * scaleX + padding;
      const y = (point.Y - minY) * scaleY + padding;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  const drawDrivers = (ctx) => {
    if (!driverPositions || Object.keys(driverPositions).length === 0) return;

    const padding = 100;
    const { minX, maxX, minY, maxY } = getBoundingBox(trackData);
    const width = maxX - minX;
    const height = maxY - minY;
    const scaleX = (ctx.canvas.width - 2 * padding) / width;
    const scaleY = (ctx.canvas.height - 2 * padding) / height;

    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'cyan', 'magenta'];
    let colorIndex = 0;

    Object.entries(driverPositions).forEach(([driverNum, positions]) => {
      if (positions && positions.length > currentIndex) {
        const { X, Y } = positions[currentIndex];
        const x = (X - minX) * scaleX + padding;
        const y = (Y - minY) * scaleY + padding;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw the driver position as a circle
        ctx.fillStyle = colors[colorIndex % colors.length];
        ctx.fill();

        const driverAbbr = driverAbbreviations[driverNum] || driverNum; // Use abbreviation if available
        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(driverAbbr, x + 10, y - 10); // Add driver abbreviation as text
      }
      colorIndex++;
    });
  };

  const getBoundingBox = (data) => {
    const xValues = data.map((point) => point.X);
    const yValues = data.map((point) => point.Y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    return { minX, maxX, minY, maxY };
  };

  // Render the canvas and draw the track + driver positions
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before re-drawing

    // Draw the track and drivers
    drawTrack(ctx);
    drawDrivers(ctx);
  }, [trackData, driverPositions, driverAbbreviations, currentIndex]);

  return (
    <div>
      <h2>Track Simulation</h2>
      <canvas ref={canvasRef} width="800" height="600" style={{ border: '1px solid black' }}></canvas>
    </div>
  );
};

export default TrackSimulation;
