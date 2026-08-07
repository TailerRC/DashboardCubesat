import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';
import { SENSOR_CONFIGS } from '../simulacion/ambientalMock';

const TOPIC = 'cempai/cubesat/telemetry/ambiental';
const HISTORY_SIZE = 20;

const KEY_MAP = {
  co2_ppm: 'co2',
  temperatura_c: 'temp',
  radiacion_uv: 'uv',
  humedad_pct: 'hum',
  presion_pa: 'pres'
};

// Parámetros de referencia en tierra para calibración de humedad
const T0 = 20.5;     // Temperatura de referencia inicial en tierra (°C)
const P0 = 101325.0; // Presión atmosférica estándar en tierra (Pa)
const RH0 = 45.0;    // Humedad de referencia inicial (%)

// Función para calcular la presión de vapor de saturación e_s (Buck equation) en hPa
function getSaturationVaporPressure(T) {
  return 6.1121 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
}

// Estimar la humedad relativa a partir de la temperatura y la presión relativa
function estimateHumidity(temp, relativePres) {
  // Convertir e_s a Pascales para que sea consistente con la presión en Pa
  const es_T0_Pa = getSaturationVaporPressure(T0) * 100;
  
  // Mixing ratio de referencia (w)
  const e0 = (RH0 / 100) * es_T0_Pa;
  const w = 0.622 * (e0 / (P0 - e0));

  // Presión absoluta actual P(t) = P0 + P_rel(t)
  const P_t = P0 + relativePres;
  const e_t = (w * P_t) / (0.622 + w);
  const es_t_Pa = getSaturationVaporPressure(temp) * 100;

  const RH_t = 100 * (e_t / es_t_Pa);
  
  // Clampear el resultado entre 0% y 100%
  return Math.max(0, Math.min(100, RH_t));
}


export function useAmbientalMqtt() {
  const [sensors, setSensors] = useState(() => {
    const initial = {};
    Object.keys(KEY_MAP).forEach(key => {
      const mockKey = KEY_MAP[key];
      const threshold = SENSOR_CONFIGS[mockKey]?.threshold ?? null;
      initial[key] = {
        v: 0,
        hace_seg: 0.0,
        stale: false,
        history: [],
        umbral_alerta: threshold
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

  // Calculate active alerts and global state whenever sensors state updates or connection state changes
  useEffect(() => {
    const now = Date.now();

    // If no packet has ever been received, or connection is lost (no packet for > 5s)
    if (lastValidPacketTime === null || (now - lastValidPacketTime > 5000)) {
      setEstadoAmbiental('SIN_DATOS');
      setActiveAlerts([]);
      return;
    }

    const alertsList = [];
    Object.keys(KEY_MAP).forEach(key => {
      const sensor = sensors[key];
      if (sensor && sensor.v !== null) {
        const val = sensor.v;
        const threshold = sensor.umbral_alerta;
        const mockKey = KEY_MAP[key];
        const cfg = SENSOR_CONFIGS[mockKey];
        if (threshold !== null) {
          const isAlert = key === 'presion_pa'
            ? Math.abs(val) > threshold
            : val > threshold;
          if (isAlert) {
            alertsList.push(cfg.label.toUpperCase());
          }
        }
      }
    });

    const hasActiveLatch = lastAnomalyTimeRef.current !== null && (now - lastAnomalyTimeRef.current < 6000);

    if (hasActiveLatch) {
      if (!alertsList.includes('PRESIÓN (TASA)')) {
        alertsList.push('PRESIÓN (TASA)');
      }
      setEstadoAmbiental('ANOMALIA');
    } else {
      const alertCount = alertsList.length;
      if (alertCount >= 4) {
        setEstadoAmbiental('CRITICO');
      } else if (alertCount >= 1) {
        setEstadoAmbiental('PELIGRO');
      } else {
        setEstadoAmbiental('SEGURO');
      }
    }
    setActiveAlerts(alertsList);
  }, [sensors, lastValidPacketTime]);

  useEffect(() => {
    // Initialize last receive times to now
    const now = Date.now();
    Object.keys(KEY_MAP).forEach(key => {
      lastValidRecvTimeRef.current[key] = now;
    });

    // ── MQTT Message Handler ──
    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);

      const packetTime = Date.now();
      const isPacketLostOrCorrupt = (packet.received === false) || (packet.crc_valido === false) || !packet.data;

      setSensors(prev => {
        const nextSensors = {};
        Object.keys(prev).forEach(key => {
          const prevSensor = prev[key];

          let val = prevSensor.v;
          let hace_seg = prevSensor.hace_seg;
          let umbral_alerta = prevSensor.umbral_alerta;
          let stale = prevSensor.stale;

          if (!isPacketLostOrCorrupt) {
            let sensorVal = packet.data[key];

            // Si es humedad_pct, la estimamos a partir de temperatura y presión del mismo paquete
            if (key === 'humedad_pct') {
              const tempObj = packet.data['temperatura_c'];
              const presObj = packet.data['presion_pa'];
              if (tempObj && presObj) {
                const tVal = (typeof tempObj === 'object' && tempObj !== null) ? tempObj.v : tempObj;
                const pVal = (typeof presObj === 'object' && presObj !== null) ? presObj.v : presObj;
                if (tVal !== undefined && tVal !== null && pVal !== undefined && pVal !== null) {
                  const calculatedHum = estimateHumidity(Number(tVal), Number(pVal));
                  sensorVal = {
                    v: calculatedHum,
                    hace_seg: (typeof tempObj === 'object' && tempObj !== null && tempObj.hace_seg !== undefined) ? tempObj.hace_seg : 0.0,
                    umbral_alerta: SENSOR_CONFIGS.hum?.threshold ?? 85
                  };
                }
              }
            }

            if (sensorVal !== undefined && sensorVal !== null) {
              const rawV = (typeof sensorVal === 'object' && sensorVal !== null) ? sensorVal.v : sensorVal;
              if (rawV !== null && rawV !== undefined && !isNaN(Number(rawV))) {
                val = parseFloat(Number(rawV).toFixed(2));
              } else if (prevSensor.v !== null && prevSensor.v !== undefined) {
                val = prevSensor.v;
              } else {
                val = 0;
              }

              const rawHaceSeg = (typeof sensorVal === 'object' && sensorVal !== null) ? sensorVal.hace_seg : undefined;
              hace_seg = (rawHaceSeg !== undefined && rawHaceSeg !== null) ? rawHaceSeg : (prevSensor.hace_seg || 0);

              const rawUmbral = (typeof sensorVal === 'object' && sensorVal !== null) ? sensorVal.umbral_alerta : undefined;
              umbral_alerta = (rawUmbral !== undefined && rawUmbral !== null)
                ? rawUmbral
                : (SENSOR_CONFIGS[KEY_MAP[key]]?.threshold ?? prevSensor.umbral_alerta);
              stale = false;

              // Store timestamp when this valid value arrived
              lastValidRecvTimeRef.current[key] = packetTime - (hace_seg * 1000);
            }
          } else {
            stale = true;
          }

          // Append to history
          const prevHist = prevSensor.history || [];
          const shiftedHist = [...prevHist];

          // Use packetTime as the timestamp for this data point
          shiftedHist.push({ value: val, timestamp: packetTime });

          // Keep size bound
          if (shiftedHist.length > HISTORY_SIZE) {
            shiftedHist.shift();
          }

          nextSensors[key] = {
            v: val,
            hace_seg,
            umbral_alerta,
            stale,
            history: shiftedHist
          };
        });

        // Compute pressure anomaly (Pa/s rate of change)
        let isPressureAnomaly = false;
        const rateOfChangeThreshold = 25.0; // Pa/s

        if (!isPacketLostOrCorrupt && packet.data && packet.data.presion_pa) {
          const presObj = packet.data.presion_pa;
          const rawPres = (typeof presObj === 'object' && presObj !== null) ? presObj.v : presObj;
          if (rawPres !== null && rawPres !== undefined && !isNaN(Number(rawPres))) {
            const currentPres = Number(rawPres);
            if (lastValidPresRef.current !== null && lastValidPresTimeRef.current !== null) {
              const deltaSeconds = (packetTime - lastValidPresTimeRef.current) / 1000.0;
              if (deltaSeconds > 0.05) {
                const rateOfChange = Math.abs(currentPres - lastValidPresRef.current) / deltaSeconds;
                if (rateOfChange > rateOfChangeThreshold) {
                  isPressureAnomaly = true;
                  lastAnomalyTimeRef.current = packetTime;
                  console.warn(
                    `[ALERTA ANOMALÍA] Caída rápida de presión detectada: ${rateOfChange.toFixed(2)} Pa/s (Umbral: ${rateOfChangeThreshold} Pa/s).`
                  );
                }
              }
            }
            lastValidPresRef.current = currentPres;
            lastValidPresTimeRef.current = packetTime;
            setLastValidPacketTime(packetTime);
          }
        }

        return nextSensors;
      });
    };

    // Subscribe to MQTT topic
    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);

    return () => unsubscribe();
  }, []);

  // ── High Resolution Age Counter (100ms Interval) ──
  // Smoothly increments age
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // Check pressure anomaly latch expiration
      if (lastAnomalyTimeRef.current !== null && (now - lastAnomalyTimeRef.current >= 6000)) {
        lastAnomalyTimeRef.current = null;
      }

      setSensors(prev => {
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
    sensors,
    estadoAmbiental,
    lastPacketId,
    activeAlerts,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
