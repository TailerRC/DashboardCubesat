import { useState, useEffect, useRef } from 'react';
import { SENSOR_CONFIGS, getSensorValueAtTime } from '../mock_data/ambientalMock';

const HISTORY_SIZE = 20;    // number of data points visible
const INTERVAL_MS  = 2000;  // new point every 2 seconds

/** Build initial history of N points ending at elapsed = 0 */
function buildInitialSeries(sensorKey) {
  const points = [];
  for (let i = 0; i < HISTORY_SIZE; i++) {
    // For i=0..19, calculate virtual elapsed time going backwards from 0
    // so the history is coherent.
    // e.g. i=0 is 38 seconds ago, i=19 is 0 seconds ago (now)
    const agoSecs = (HISTORY_SIZE - 1 - i) * (INTERVAL_MS / 1000);
    const value = getSensorValueAtTime(sensorKey, -agoSecs);
    points.push({ value, tsAgo: agoSecs });
  }
  return points;
}

export function useAmbientalData() {
  const [elapsed, setElapsed] = useState(0);
  const [data, setData] = useState(() => {
    const initial = {};
    for (const key of Object.keys(SENSOR_CONFIGS)) {
      initial[key] = buildInitialSeries(key);
    }
    return initial;
  });

  const elapsedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      elapsedRef.current += INTERVAL_MS / 1000;
      const currentElapsed = elapsedRef.current;
      setElapsed(currentElapsed);

      setData(prev => {
        const next = {};
        for (const key of Object.keys(SENSOR_CONFIGS)) {
          const newVal = getSensorValueAtTime(key, currentElapsed);

          // Shift all timestamps back by INTERVAL_MS/1000 seconds
          const shifted = prev[key].map(p => ({
            ...p,
            tsAgo: p.tsAgo + INTERVAL_MS / 1000,
          }));

          // Add new point at tsAgo = 0, drop oldest
          shifted.push({ value: newVal, tsAgo: 0 });
          if (shifted.length > HISTORY_SIZE) shifted.shift();

          next[key] = shifted;
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return { data, configs: SENSOR_CONFIGS, elapsed };
}
