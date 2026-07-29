import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';
import { getUbicacionValueAtTime } from '../simulacion/ubicacionMock';

const TOPIC = 'cempai/cubesat/telemetry/ubicacion';
const HISTORY_SIZE = 20;

function buildInitialHistory(key) {
  const points = [];
  const now = Date.now();
  for (let i = 0; i < HISTORY_SIZE; i++) {
    const agoSecs = (HISTORY_SIZE - 1 - i) * 1.5;
    const values = getUbicacionValueAtTime(-agoSecs);
    let value = 0;
    if (key === 'altitud') value = values.altitud;
    else if (key === 'distancia') value = values.distancia;
    else if (key === 'latitud') value = values.latitud;
    else if (key === 'longitud') value = values.longitud;
    points.push({ value, timestamp: now - (agoSecs * 1000) });
  }
  return points;
}

export function useUbicacionMqtt() {
  const [dataState, setDataState] = useState(() => {
    const initAltHist = buildInitialHistory('altitud');
    const initDistHist = buildInitialHistory('distancia');
    const initLatHist = buildInitialHistory('latitud');
    const initLonHist = buildInitialHistory('longitud');
    const latestValues = getUbicacionValueAtTime(0);

    return {
      latitud: { v: latestValues.latitud, hace_seg: 0.0, stale: false, history: initLatHist },
      longitud: { v: latestValues.longitud, hace_seg: 0.0, stale: false, history: initLonHist },
      altitud_gps: { v: latestValues.altitud, hace_seg: 0.0, stale: false, history: initAltHist },
      velocidad_kmh: { v: latestValues.velocidad, hace_seg: 0.0, stale: false },
      velocidad_vertical: { v: latestValues.velocidad_vertical, hace_seg: 0.0, stale: false },
      satelites: { v: latestValues.satelites, hace_seg: 0.0, stale: false },
      hdop: { v: 0.8, hace_seg: 0.0, stale: false },
      calidad_senal: { v: latestValues.calidad, hace_seg: 0.0, stale: false },
      distancia_origen: { v: latestValues.distancia, hace_seg: 0.0, stale: false, history: initDistHist },
      fecha_utc: '2026-03-24',
      hora_utc: '21:00:23',
      coordenadas_aterrizaje: { lat: -12.4123, lon: -77.2078 }
    };
  });

  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  // Reference for tracking age of data points
  const lastValidRecvTimeRef = useRef({});

  useEffect(() => {
    const now = Date.now();
    const keys = [
      'latitud', 'longitud', 'altitud_gps', 'velocidad_kmh', 'velocidad_vertical',
      'satelites', 'hdop', 'calidad_senal', 'distancia_origen'
    ];
    keys.forEach(key => {
      lastValidRecvTimeRef.current[key] = now;
    });

    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);

      const packetTime = Date.now();
      const isPacketLostOrCorrupt = (packet.received === false) || (packet.crc_valido === false) || !packet.data;

      setDataState(prev => {
        const nextState = { ...prev };

        if (!isPacketLostOrCorrupt) {
          setLastValidPacketTime(packetTime);

          // Update static NMEA outputs
          nextState.fecha_utc = packet.data.fecha_utc;
          nextState.hora_utc = packet.data.hora_utc;
          nextState.coordenadas_aterrizaje = packet.data.coordenadas_aterrizaje;

          // Update each numeric key
          keys.forEach(key => {
            const rawVal = packet.data[key];
            if (rawVal) {
              const val = rawVal.v;
              let history = prev[key].history || [];

              if (key === 'altitud_gps' || key === 'distancia_origen' || key === 'latitud' || key === 'longitud') {
                history = [...history, { value: val, timestamp: packetTime }];
                if (history.length > HISTORY_SIZE) {
                  history.shift();
                }
              }

              nextState[key] = {
                v: val,
                hace_seg: rawVal.hace_seg,
                stale: false,
                history
              };

              lastValidRecvTimeRef.current[key] = packetTime - (rawVal.hace_seg * 1000);
            }
          });
        } else {
          // Packet loss / CRC fail: keep last value but mark as stale, append last known values to history
          keys.forEach(key => {
            let history = prev[key].history || [];

            if (key === 'altitud_gps' || key === 'distancia_origen' || key === 'latitud' || key === 'longitud') {
              history = [...history, { value: prev[key].v, timestamp: packetTime }];
              if (history.length > HISTORY_SIZE) {
                history.shift();
              }
            }

            nextState[key] = {
              ...prev[key],
              stale: true,
              history
            };
          });
        }

        return nextState;
      });
    };

    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);
    return () => unsubscribe();
  }, []);

  // Smooth age updates at 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setDataState(prev => {
        const next = { ...prev };
        let changed = false;
        const keys = [
          'latitud', 'longitud', 'altitud_gps', 'velocidad_kmh', 'velocidad_vertical',
          'satelites', 'hdop', 'calidad_senal', 'distancia_origen'
        ];

        keys.forEach(key => {
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
            }
          }
        });

        return changed ? next : prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return {
    data: dataState,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
