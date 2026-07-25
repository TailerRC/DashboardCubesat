import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';
import { SATELITE_CONFIGS, getSateliteValueAtTime } from '../simulacion/sateliteMock';

const TOPIC = 'cempai/cubesat/telemetry/satelite';
const HISTORY_SIZE = 20;

const KEY_MAP = {
  voltaje_v: 'voltaje',
  corriente_ma: 'corriente',
  consumo_w: 'consumo',
  accel_x: 'accel_x',
  accel_y: 'accel_y',
  accel_z: 'accel_z',
  sensores_activos: 'sensores_activos',
  temp_mcu: 'temp_mcu',
  memoria_flash_ok: 'memoria_flash_ok',
  tiempo_encendido_seg: 'tiempo_encendido_seg'
};

function buildInitialHistory(fieldKey) {
  const points = [];
  const mockKey = KEY_MAP[fieldKey];
  const now = Date.now();
  for (let i = 0; i < HISTORY_SIZE; i++) {
    const agoSecs = (HISTORY_SIZE - 1 - i) * 1.5;
    const value = getSateliteValueAtTime(mockKey, -agoSecs);
    points.push({ value, timestamp: now - (agoSecs * 1000) });
  }
  return points;
}

export function useSateliteMqtt() {
  const [sateliteData, setSateliteData] = useState(() => {
    const initial = {};
    Object.keys(KEY_MAP).forEach(key => {
      const mockKey = KEY_MAP[key];
      const hasHistory = (mockKey === 'voltaje' || mockKey === 'corriente' || mockKey === 'consumo');
      const hist = hasHistory ? buildInitialHistory(key) : null;
      const latestVal = hasHistory ? hist[hist.length - 1].value : getSateliteValueAtTime(mockKey, 0);

      initial[key] = {
        v: latestVal,
        hace_seg: 0.0,
        stale: false,
        history: hist
      };
    });
    return initial;
  });

  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);
  const lastValidRecvTimeRef = useRef({});

  useEffect(() => {
    const now = Date.now();
    Object.keys(KEY_MAP).forEach(key => {
      lastValidRecvTimeRef.current[key] = now;
    });

    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);

      const packetTime = Date.now();
      const isPacketLostOrCorrupt = (packet.received === false) || (packet.crc_valido === false) || !packet.data;

      setSateliteData(prev => {
        const nextData = {};
        Object.keys(prev).forEach(key => {
          const prevItem = prev[key];
          let val = prevItem.v;
          let hace_seg = prevItem.hace_seg;
          let stale = prevItem.stale;
          let history = prevItem.history;

          if (!isPacketLostOrCorrupt) {
            const payloadVal = packet.data[key];
            if (payloadVal) {
              val = payloadVal.v;
              hace_seg = payloadVal.hace_seg;
              stale = false;
              lastValidRecvTimeRef.current[key] = packetTime - (hace_seg * 1000);
            }
          } else {
            stale = true;
          }

          if (history) {
            history = [...history, { value: val, timestamp: packetTime }];
            if (history.length > HISTORY_SIZE) {
              history.shift();
            }
          }

          nextData[key] = {
            v: val,
            hace_seg,
            stale,
            history
          };
        });

        if (!isPacketLostOrCorrupt) {
          setLastValidPacketTime(packetTime);
        }

        return nextData;
      });
    };

    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);
    return () => unsubscribe();
  }, []);

  // Smooth updates of ages every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSateliteData(prev => {
        const next = {};
        let changed = false;
        Object.keys(prev).forEach(key => {
          const lastTime = lastValidRecvTimeRef.current[key];
          if (lastTime) {
            const ageSecs = parseFloat(((now - lastTime) / 1000).toFixed(1));
            if (ageSecs !== prev[key].hace_seg) {
              changed = true;
              next[key] = {
                ...prev[key],
                hace_seg: ageSecs,
                stale: prev[key].stale || ageSecs > 1.5
              };
            } else {
              next[key] = prev[key];
            }
          } else {
            next[key] = prev[key];
          }
        });
        return changed ? next : prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return {
    data: sateliteData,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
