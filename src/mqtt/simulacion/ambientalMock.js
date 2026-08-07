// ── Mock Publisher for CubeSat Telemetry ────────────────────────────────────
// Generates realistic simulated environmental packages conforming to the exact JSON schema.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/ambiental' every 0.5s - 1.0s.
// Includes 8% packet loss rate and 2% invalid CRC rate.

import { MqttService } from '../config/mqttConfig';

// Target topic
const TOPIC = 'cempai/cubesat/telemetry/ambiental';

export const SENSOR_CONFIGS = {
  co2: {
    label: 'MQ135 — CO₂ eq.',
    unit: 'ppm',
    yMin: 400,
    yMax: 5000,
    threshold: 1000,
    decimals: 2,
    color: '#f9a825'
  },
  temp: {
    label: 'Temperatura',
    unit: '°C',
    yMin: -10,
    yMax: 60,
    threshold: 40,
    decimals: 1,
    color: '#ff7043'
  },
  hum: {
    label: 'Humedad',
    unit: '%RH',
    yMin: 0,
    yMax: 100,
    threshold: 85,
    decimals: 1,
    color: '#03a9f4'
  },
  pres: {
    label: 'Presión',
    unit: 'Pa',
    yMin: -200,
    yMax: 200,
    threshold: 45,
    decimals: 2,
    color: '#ab47bc'
  },
  uv: {
    label: 'UV',
    unit: 'UV index',
    yMin: 0,
    yMax: 15,
    threshold: 7.5,
    decimals: 1,
    color: '#ff9800'
  },
  alt: {
    label: 'Altitud Barométrica',
    unit: 'm',
    yMin: 0,
    yMax: 200,
    threshold: null,
    decimals: 1,
    color: '#ff9800'
  }
};

export function getSensorValueAtTime(sensorKey, secondsElapsed) {
  const cycleTime = secondsElapsed % 120;
  const config = SENSOR_CONFIGS[sensorKey];
  if (!config) return 0;
  let val = 0;

  switch (sensorKey) {
    case 'co2':
      if (cycleTime < 35) {
        val = 450 + Math.sin(cycleTime * 0.1) * 30;
      } else if (cycleTime < 75) {
        val = 950 + Math.sin((cycleTime - 35) * 0.08) * 50;
      } else if (cycleTime < 105) {
        val = 3800 + Math.sin((cycleTime - 75) * 0.1) * 400;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 450 + ratio * (3800 - 450);
      }
      break;


    case 'temp':
      if (cycleTime < 35) {
        val = 20.5 + Math.sin(cycleTime * 0.08) * 1.5;
      } else if (cycleTime < 75) {
        val = 32.5 + Math.sin((cycleTime - 35) * 0.05) * 1.2;
      } else if (cycleTime < 105) {
        val = 51.8 + Math.sin((cycleTime - 75) * 0.1) * 3.5;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 20.5 + ratio * (51.8 - 20.5);
      }
      break;

    case 'hum':
      if (cycleTime < 35) {
        val = 45 + Math.sin(cycleTime * 0.12) * 3;
      } else if (cycleTime < 75) {
        val = 65;
      } else if (cycleTime < 105) {
        val = 92.5 + Math.sin((cycleTime - 75) * 0.1) * 2.5;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 45 + ratio * (92.5 - 45);
      }
      break;

    case 'pres':
      // Relative pressure in Pa, starting at 0 Pa and going negative as we climb
      if (cycleTime < 35) {
        val = 0 - (cycleTime * 0.5); // down to -17.5 Pa
      } else if (cycleTime < 75) {
        val = -17.5 - (cycleTime - 35) * 1.5; // down to -77.5 Pa
      } else if (cycleTime < 105) {
        val = -77.5 - (cycleTime - 75) * 2.0; // down to -137.5 Pa
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 0 - ratio * 137.5;
      }
      break;

    case 'uv':
      if (cycleTime < 35) {
        val = 2.1 + Math.sin(cycleTime * 0.1) * 0.4;
      } else if (cycleTime < 75) {
        val = 6.2;
      } else if (cycleTime < 105) {
        val = 12.4 + Math.sin((cycleTime - 75) * 0.15) * 0.8;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 2.1 + ratio * (12.4 - 2.1);
      }
      break;

    case 'alt':
      // Since secondsElapsed might be simulatedTimeSecs, we can check if it is < 15
      if (secondsElapsed < 15.0) {
        val = 0;
      } else {
        const cTime = secondsElapsed % 120;
        if (cTime < 60) {
          val = Math.sin((cTime / 60) * (Math.PI / 2)) * 115;
        } else {
          val = Math.cos(((cTime - 60) / 60) * (Math.PI / 2)) * 115;
        }
        val += (Math.random() - 0.5) * 1.5;
        if (val < 0) val = 0;
      }
      break;

    default:
      val = 0;
  }

  return parseFloat(val.toFixed(config.decimals));
}

// Internal running state for generators
let packetId = 1000;
let lastPresion = 100500.00; // in Pascals (approx 1005 hPa)
let co2Val = 405.20;
let tempVal = 24.80;
let uvVal = 1.80;
let humVal = 55.40;
let timerId = null;
let simulatedTimeSecs = 0;

/**
 * Publishes a single telemetry packet to the mock MQTT broker.
 */
function publishNextPacket() {
  packetId++;

  const rand = Math.random();
  let received = true;
  let crcValido = true;
  let data = null;
  let estadoAmbiental = 'SEGURO';

  // Determine error states:
  if (rand < 0.08) {
    // 8% Probability: Packet Lost (received: false)
    received = false;
    crcValido = null;
  } else if (rand < 0.10) {
    // 2% Probability: CRC Corrupt (crc_valido: false)
    crcValido = false;
  }

  if (received) {
    // Generate values directly from flight cycle helper
    co2Val = getSensorValueAtTime('co2', simulatedTimeSecs);
    tempVal = getSensorValueAtTime('temp', simulatedTimeSecs);
    uvVal = getSensorValueAtTime('uv', simulatedTimeSecs);
    humVal = 0.0; // Sensor BME280 roto: envía siempre 0% de humedad
    
    // Base pressure value from flight cycle
    const basePres = getSensorValueAtTime('pres', simulatedTimeSecs);

    // Sudden drop to trigger Pa/s anomaly every 30 packets
    if (packetId % 30 === 0) {
      lastPresion = basePres - 35.50; // Force decompression drop
    } else {
      lastPresion = basePres;
    }

    const calibrating = simulatedTimeSecs < 15.0;
    const altitudeVal = getSensorValueAtTime('alt', simulatedTimeSecs);

    data = {
      co2_ppm:       { v: co2Val, hace_seg: 0.0, umbral_alerta: SENSOR_CONFIGS.co2.threshold },
      temperatura_c: { v: tempVal, hace_seg: 0.0, umbral_alerta: SENSOR_CONFIGS.temp.threshold },
      radiacion_uv:  { v: uvVal, hace_seg: 0.0, umbral_alerta: SENSOR_CONFIGS.uv.threshold },
      humedad_pct:   { v: humVal, hace_seg: 0.0, umbral_alerta: SENSOR_CONFIGS.hum.threshold },
      presion_pa:    { v: lastPresion, hace_seg: 0.0, umbral_alerta: SENSOR_CONFIGS.pres.threshold },
      altura_barometrica_m: { v: altitudeVal, hace_seg: 0.0, calibrando: calibrating }
    };

    // Calculate baseline warning state
    const outOfBounds = 
      co2Val > SENSOR_CONFIGS.co2.threshold || 
      tempVal > SENSOR_CONFIGS.temp.threshold || 
      humVal > SENSOR_CONFIGS.hum.threshold || 
      uvVal > SENSOR_CONFIGS.uv.threshold ||
      Math.abs(lastPresion) > SENSOR_CONFIGS.pres.threshold;

    estadoAmbiental = outOfBounds ? 'PELIGRO' : 'SEGURO';
  } else {
    estadoAmbiental = 'SIN_DATOS';
  }

  const packet = {
    topic: TOPIC,
    packet_id: packetId,
    received,
    crc_valido: crcValido,
    data,
    estado_ambiental: estadoAmbiental
  };

  MqttService.publish(TOPIC, packet);
}

/**
 * Starts the mock publisher interval.
 * Adjusts publication frequency dynamically between 0.5s and 1.0s.
 */
export function startAmbientalMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/ambiental...');

  const loop = () => {
    // Increment simulated flight elapsed time by interval step (approx 0.75 seconds on average)
    const nextDelay = 500 + Math.random() * 500; // between 500ms and 1000ms
    simulatedTimeSecs += nextDelay / 1000.0;

    publishNextPacket();
    
    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

/**
 * Stops the mock publisher.
 */
export function stopAmbientalMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped.');
  }
}
