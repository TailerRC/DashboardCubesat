import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../services/mqttService';
import { SENSOR_CONFIGS, getSensorValueAtTime } from '../mock_data/ambientalMock';

const TOPIC = 'cempai/cubesat/telemetry/ambiental';
const HISTORY_SIZE = 20;

const KEY_MAP = {
  co2_ppm: 'co2',
  gas_voc_ppb: 'voc',
  temperatura_c: 'temp',
  radiacion_uv: 'uv',
  humedad_pct: 'hum',
  presion_pa: 'pres'
};

function buildInitialHistory(sensorKey) {
  const points = [];
  const mockKey = KEY_MAP[sensorKey];
  for (let i = 0; i < HISTORY_SIZE; i++) {
    // Spaced by 1.5s to fill a nice 30s window on start
    const agoSecs = (HISTORY_SIZE - 1 - i) * 1.5;
    const value = getSensorValueAtTime(mockKey, -agoSecs);
    points.push({ value, tsAgo: agoSecs });
  }
  return points;
}

export function useAmbientalMqtt() {
  const [sensors, setSensors] = useState(() => {
    const initial = {};
    Object.keys(KEY_MAP).forEach(key => {
      const hist = buildInitialHistory(key);
      const latestVal = hist[hist.length - 1].value;
      initial[key] = {
        v: latestVal,
        hace_seg: 0.0,
        stale: false,
        history: hist,
        umbral_alerta: key === 'presion_pa' ? 25.0 : null
      };
    });
    return initial;
  });

  const [estadoAmbiental, setEstadoAmbiental] = useState('SIN_DATOS');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [lastPacketId, setLastPacketId] = useState(null);

  // References for calculating pressure rate of change (Pa/s)
  const lastValidPresRef = useRef(null);
  const lastValidPresTimeRef = useRef(null);

  // References for tracking age of data (in ms)
  const lastValidRecvTimeRef = useRef({});

  // Reference for pressure anomaly warning latch timer
  const lastAnomalyTimeRef = useRef(null);

  // Keep tracking when the last valid packet arrived overall
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  useEffect(() => {
    // Initialize last receive times to now
    const now = Date.now();
    Object.keys(KEY_MAP).forEach(key => {
      lastValidRecvTimeRef.current[key] = now;
    });

    // ── MQTT Message Handler ──
    const handleMessage = (packet) => {
      // 1. Validation: Discard if packet received is corrupt (crc_valido === false)
      if (packet.crc_valido === false) {
        console.warn(`[MQTT WARNING] Discarding corrupt packet ${packet.packet_id} on topic ${TOPIC} (CRC Inválido).`);
        return;
      }

      setLastPacketId(packet.packet_id);

      // 2. Handle Lost Packet (received: false)
      if (packet.received === false) {
        console.log(`[MQTT INFO] Packet loss detected (received: false) for packet_id: ${packet.packet_id}.`);
        setSensors(prev => {
          const updated = {};
          Object.keys(prev).forEach(key => {
            updated[key] = { ...prev[key], stale: true };
          });
          return updated;
        });
        return;
      }

      // 3. Process Valid Data
      if (packet.data) {
        const packetTime = Date.now();
        setLastValidPacketTime(packetTime);

        // A. Calculate Pressure Anomaly (Pa/s rate of change)
        const currentPres = packet.data.presion_pa.v;
        const currentThreshold = packet.data.presion_pa.umbral_alerta || 25.0;
        let isPressureAnomaly = false;

        if (lastValidPresRef.current !== null && lastValidPresTimeRef.current !== null) {
          const deltaSeconds = (packetTime - lastValidPresTimeRef.current) / 1000.0;
          if (deltaSeconds > 0.05) {
            const rateOfChange = Math.abs(currentPres - lastValidPresRef.current) / deltaSeconds;
            if (rateOfChange > currentThreshold) {
              isPressureAnomaly = true;
              lastAnomalyTimeRef.current = packetTime; // Mark latch start
              console.warn(
                `[ALERTA ANOMALÍA] Caída rápida de presión detectada: ${rateOfChange.toFixed(2)} Pa/s (Umbral: ${currentThreshold} Pa/s).`
              );
            }
          }
        }

        // Update pressure calculation refs
        lastValidPresRef.current = currentPres;
        lastValidPresTimeRef.current = packetTime;

        // B. Update Sensors state and push to history
        setSensors(prev => {
          const nextSensors = {};
          Object.keys(prev).forEach(key => {
            const sensorVal = packet.data[key];
            if (sensorVal) {
              const val = parseFloat(sensorVal.v.toFixed(2));
              
              // Store timestamp when this valid value arrived
              lastValidRecvTimeRef.current[key] = packetTime - (sensorVal.hace_seg * 1000);

              // Shift and push to history
              const prevHist = prev[key].history || [];
              const timeSinceLastVal = prevHist.length > 0 
                ? (packetTime - (packetTime - sensorVal.hace_seg * 1000) - (packetTime - prevHist[prevHist.length - 1].tsAgo * 1000)) / 1000
                : 1.0;

              // Shift all existing points' tsAgo
              const shiftedHist = prevHist.map(p => ({
                ...p,
                tsAgo: p.tsAgo + Math.max(0.1, timeSinceLastVal)
              }));

              // Push new point
              shiftedHist.push({ value: val, tsAgo: sensorVal.hace_seg });

              // Keep size bound
              if (shiftedHist.length > HISTORY_SIZE) {
                shiftedHist.shift();
              }

              nextSensors[key] = {
                v: val,
                hace_seg: sensorVal.hace_seg,
                umbral_alerta: sensorVal.umbral_alerta || null,
                stale: false,
                history: shiftedHist
              };
            } else {
              nextSensors[key] = prev[key];
            }
          });
          return nextSensors;
        });

        // C. Calculate Active Parameter Alerts based on thresholds
        const alertsList = [];
        Object.keys(KEY_MAP).forEach(key => {
          const sensorVal = packet.data[key];
          if (sensorVal) {
            const val = sensorVal.v;
            const mockKey = KEY_MAP[key];
            const cfg = SENSOR_CONFIGS[mockKey];
            if (cfg && cfg.threshold !== null && val > cfg.threshold) {
              alertsList.push(cfg.label.toUpperCase());
            }
          }
        });

        // D. Update Global Estado Ambiental (latch warning state for 6.0 seconds)
        const hasActiveLatch = lastAnomalyTimeRef.current !== null && (packetTime - lastAnomalyTimeRef.current < 6000);
        
        if (isPressureAnomaly || hasActiveLatch) {
          setEstadoAmbiental('ANOMALIA');
          if (!alertsList.includes('PRESIÓN (TASA)')) {
            alertsList.push('PRESIÓN (TASA)');
          }
          setActiveAlerts(alertsList);
        } else {
          setActiveAlerts(alertsList);
          const alertCount = alertsList.length;
          if (alertCount >= 4) {
            setEstadoAmbiental('CRITICO');
          } else if (alertCount >= 1) {
            setEstadoAmbiental('PELIGRO');
          } else {
            setEstadoAmbiental('SEGURO');
          }
        }
      }
    };

    // Subscribe to MQTT topic
    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);

    return () => unsubscribe();
  }, []);

  // ── High Resolution Age Counter (100ms Interval) ──
  // Smoothly increments age and keeps history sync
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // Check pressure anomaly latch expiration
      if (lastAnomalyTimeRef.current !== null && (now - lastAnomalyTimeRef.current >= 6000)) {
        lastAnomalyTimeRef.current = null;
        setEstadoAmbiental(prev => prev === 'ANOMALIA' ? 'SEGURO' : prev);
      }

      setSensors(prev => {
        const next = {};
        let changed = false;

        Object.keys(prev).forEach(key => {
          const lastTime = lastValidRecvTimeRef.current[key];
          if (lastTime) {
            const ageSecs = parseFloat(((now - lastTime) / 1000).toFixed(1));
            
            // Increment tsAgo for history points dynamically
            const timeDelta = 0.1;
            const updatedHist = (prev[key].history || []).map(p => ({
              ...p,
              tsAgo: parseFloat((p.tsAgo + timeDelta).toFixed(1))
            }));

            if (ageSecs !== prev[key].hace_seg) {
              changed = true;
              next[key] = {
                ...prev[key],
                hace_seg: ageSecs,
                stale: prev[key].stale || ageSecs > 1.5,
                history: updatedHist
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
    sensors,
    estadoAmbiental,
    lastPacketId,
    activeAlerts,
    isConnected: lastValidPacketTime !== null
  };
}
