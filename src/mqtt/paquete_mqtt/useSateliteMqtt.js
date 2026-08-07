import { useState, useEffect, useRef } from 'react';
import { getSateliteValueAtTime } from '../simulacion/sateliteMock';

const HISTORY_SIZE = 20;

const KEY_MAP = {
  voltaje_v: 'voltaje',
  corriente_ma: 'corriente',
  consumo_w: 'consumo',
  sensores_activos: 'sensores_activos',
  temp_mcu: 'temp_mcu',
  memoria_flash_ok: 'memoria_flash_ok',
  tiempo_encendido_seg: 'tiempo_encendido_seg'
};

export function useSateliteMqtt() {
  const [sateliteData, setSateliteData] = useState(() => {
    const initial = {};
    Object.keys(KEY_MAP).forEach(key => {
      const mockKey = KEY_MAP[key];
      const hasHistory = (mockKey === 'voltaje' || mockKey === 'corriente' || mockKey === 'consumo');
      const hist = hasHistory ? [] : null;

      initial[key] = {
        v: 0,
        hace_seg: 0.0,
        stale: false,
        history: hist
      };
    });
    return initial;
  });

  const [lastPacketId, setLastPacketId] = useState(3000);
  const simTimeRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextDelay = 750; // average delay matching mock publisher rate
      simTimeRef.current += nextDelay / 1000.0;
      const t = simTimeRef.current;
      const packetTime = Date.now();

      setLastPacketId(prev => prev + 1);

      setSateliteData(prev => {
        const nextData = {};
        Object.keys(prev).forEach(key => {
          const prevItem = prev[key];
          const mockKey = KEY_MAP[key];

          let val = getSateliteValueAtTime(mockKey, t);
          let history = prevItem.history ? [...prevItem.history] : null;

          if (history) {
            history.push({ value: val, timestamp: packetTime });
            if (history.length > HISTORY_SIZE) {
              history.shift();
            }
          }

          nextData[key] = {
            v: val,
            hace_seg: 0.0,
            stale: false,
            history
          };
        });
        return nextData;
      });
    }, 750);

    return () => clearInterval(interval);
  }, []);

  return {
    data: sateliteData,
    lastPacketId,
    isConnected: true
  };
}
