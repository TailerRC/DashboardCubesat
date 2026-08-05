import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/ubicacion';
const HISTORY_SIZE = 20;

export function useUbicacionMqtt() {
  const [dataState, setDataState] = useState(() => {
    return {
      latitud: { v: 0, hace_seg: 0.0, stale: false, history: [] },
      longitud: { v: 0, hace_seg: 0.0, stale: false, history: [] },
      altitud_gps: { v: 0, hace_seg: 0.0, stale: false, history: [] },
      velocidad_kmh: { v: 0, hace_seg: 0.0, stale: false },
      velocidad_vertical: { v: 0, hace_seg: 0.0, stale: false },
      satelites: { v: 0, hace_seg: 0.0, stale: false },
      hdop: { v: 0, hace_seg: 0.0, stale: false },
      calidad_senal: { v: 0, hace_seg: 0.0, stale: false },
      distancia_origen: { v: 0, hace_seg: 0.0, stale: false, history: [] },
      fecha_utc: '---',
      hora_utc: '---',
      coordenadas_aterrizaje: { lat: 0, lon: 0 }
    };
  });

  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  // Reference for tracking age of data points and detecting first real telemetry packet
  const lastValidRecvTimeRef = useRef({});
  const isFirstRealPacketRef = useRef(true);

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

          const isFirstReal = isFirstRealPacketRef.current;
          if (isFirstReal) {
            isFirstRealPacketRef.current = false;
          }

          // Update static NMEA outputs
          nextState.fecha_utc = packet.data.fecha_utc || prev.fecha_utc;
          nextState.hora_utc = packet.data.hora_utc || prev.hora_utc;
          nextState.coordenadas_aterrizaje = packet.data.coordenadas_aterrizaje || (
            packet.data.latitud && packet.data.longitud
              ? { lat: packet.data.latitud.v, lon: packet.data.longitud.v }
              : prev.coordenadas_aterrizaje
          );

          // Update each numeric key
          keys.forEach(key => {
            const rawVal = packet.data[key];
            if (rawVal !== undefined && rawVal !== null) {
              const rawV = (typeof rawVal === 'object' && rawVal !== null) ? rawVal.v : rawVal;
              const val = (rawV !== null && rawV !== undefined) ? rawV : (prev[key]?.v ?? 0);
              const rawHaceSeg = (typeof rawVal === 'object' && rawVal !== null) ? rawVal.hace_seg : undefined;
              const hace_seg = (rawHaceSeg !== undefined && rawHaceSeg !== null) ? rawHaceSeg : (prev[key]?.hace_seg || 0);

              // If it's the first real packet, purge mock history!
              let history = isFirstReal ? [] : (prev[key]?.history || []);

              if (key === 'altitud_gps' || key === 'distancia_origen' || key === 'latitud' || key === 'longitud') {
                history = [...history, { value: val, timestamp: packetTime }];
                if (history.length > HISTORY_SIZE) {
                  history.shift();
                }
              }

              nextState[key] = {
                v: val,
                hace_seg,
                stale: false,
                history
              };

              lastValidRecvTimeRef.current[key] = packetTime - (hace_seg * 1000);
            }
          });
        } else {
          // Packet loss / CRC fail: keep last value but mark as stale
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
