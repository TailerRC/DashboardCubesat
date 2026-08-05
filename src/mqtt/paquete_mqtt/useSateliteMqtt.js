import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/satelite';
const HISTORY_SIZE = 20;

const KEY_MAP = {
  voltaje_v: 'voltaje',
  corriente_ma: 'corriente',
  consumo_w: 'consumo',
  // accel_x/y/z → exclusivos de useOrientacion3DMqtt (topic: orientacion3d)
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
            if (payloadVal !== undefined && payloadVal !== null) {
              const rawV = (typeof payloadVal === 'object' && payloadVal !== null) ? payloadVal.v : payloadVal;
              val = (rawV !== null && rawV !== undefined) ? rawV : (prevItem.v ?? 0);
              const rawHaceSeg = (typeof payloadVal === 'object' && payloadVal !== null) ? payloadVal.hace_seg : undefined;
              hace_seg = (rawHaceSeg !== undefined && rawHaceSeg !== null) ? rawHaceSeg : (prevItem.hace_seg || 0);
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
