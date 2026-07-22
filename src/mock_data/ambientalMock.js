// ── Mock Publisher for CubeSat Telemetry ────────────────────────────────────
// Generates realistic simulated environmental packages conforming to the exact JSON schema.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/ambiental' every 0.5s - 1.0s.
// Includes 8% packet loss rate and 2% invalid CRC rate.

import { MqttService } from '../services/mqttService';

// Target topic
const TOPIC = 'cempai/cubesat/telemetry/ambiental';

export const SENSOR_CONFIGS = {
  co2: {
    label: 'CO₂',
    unit: 'ppm',
    yMin: 360,
    yMax: 480,
    threshold: 440,
    decimals: 2,
    color: '#f9a825'
  },
  voc: {
    label: 'VOC',
    unit: 'ppb',
    yMin: 0,
    yMax: 80,
    threshold: 45,
    decimals: 1,
    color: '#00bcd4'
  },
  temp: {
    label: 'Temperatura',
    unit: '°C',
    yMin: 10,
    yMax: 40,
    threshold: 29.5,
    decimals: 1,
    color: '#ff7043'
  },
  hum: {
    label: 'Humedad',
    unit: '%RH',
    yMin: 20,
    yMax: 90,
    threshold: 68.0,
    decimals: 1,
    color: '#03a9f4'
  },
  pres: {
    label: 'Presión',
    unit: 'Pa',
    yMin: 95000,
    yMax: 102000,
    threshold: 100600.0,
    decimals: 2,
    color: '#ab47bc'
  },
  uv: {
    label: 'UV',
    unit: 'UV index',
    yMin: 0,
    yMax: 10,
    threshold: 5.5,
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
        val = 405 + Math.sin(cycleTime * 0.1) * 8;
      } else if (cycleTime < 75) {
        val = 445 + Math.sin((cycleTime - 35) * 0.08) * 8;
      } else if (cycleTime < 105) {
        val = 465 + Math.sin((cycleTime - 75) * 0.1) * 5;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 405 + ratio * (465 - 405);
      }
      break;

    case 'voc':
      if (cycleTime < 35) {
        val = 22 + Math.sin(cycleTime * 0.15) * 5;
      } else if (cycleTime < 55) {
        val = 28;
      } else if (cycleTime < 75) {
        val = 46.5 + Math.sin((cycleTime - 55) * 0.1) * 2;
      } else if (cycleTime < 105) {
        val = 58 + Math.sin((cycleTime - 75) * 0.15) * 4;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 22 + ratio * (58 - 22);
      }
      break;

    case 'temp':
      if (cycleTime < 35) {
        val = 24.5 + Math.sin(cycleTime * 0.08) * 1.5;
      } else if (cycleTime < 75) {
        val = 27.5 + Math.sin((cycleTime - 35) * 0.05) * 1.2;
      } else if (cycleTime < 105) {
        val = 31.8 + Math.sin((cycleTime - 75) * 0.1) * 1.5;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 24.5 + ratio * (31.8 - 24.5);
      }
      break;

    case 'hum':
      if (cycleTime < 35) {
        val = 54 + Math.sin(cycleTime * 0.12) * 3;
      } else if (cycleTime < 75) {
        val = 60;
      } else if (cycleTime < 105) {
        val = 73.5 + Math.sin((cycleTime - 75) * 0.1) * 2.5;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 54 + ratio * (73.5 - 54);
      }
      break;

    case 'pres':
      if (cycleTime < 35) {
        val = 100250 + Math.sin(cycleTime * 0.07) * 120;
      } else if (cycleTime < 75) {
        val = 100820 + Math.sin((cycleTime - 35) * 0.09) * 150;
      } else if (cycleTime < 105) {
        val = 101450 + Math.sin((cycleTime - 75) * 0.1) * 180;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 100250 + ratio * (101450 - 100250);
      }
      break;

    case 'uv':
      if (cycleTime < 35) {
        val = 2.8 + Math.sin(cycleTime * 0.1) * 0.7;
      } else if (cycleTime < 75) {
        val = 4.2;
      } else if (cycleTime < 105) {
        val = 7.4 + Math.sin((cycleTime - 75) * 0.15) * 0.8;
      } else {
        const ratio = (120 - cycleTime) / 15;
        val = 2.8 + ratio * (7.4 - 2.8);
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
let vocVal = 22.40;
let tempVal = 24.80;
let uvVal = 1.80;
let humVal = 55.40;
let timerId = null;
let simulatedTimeSecs = 0;

// Constant alert threshold for pressure rate of change
const PRESION_UMBRAL_ALERTA = 25.0; // Pa/s

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
    vocVal = getSensorValueAtTime('voc', simulatedTimeSecs);
    tempVal = getSensorValueAtTime('temp', simulatedTimeSecs);
    uvVal = getSensorValueAtTime('uv', simulatedTimeSecs);
    humVal = getSensorValueAtTime('hum', simulatedTimeSecs);
    
    // Base pressure value from flight cycle
    const basePres = getSensorValueAtTime('pres', simulatedTimeSecs);

    // Sudden drop to trigger Pa/s anomaly every 30 packets
    if (packetId % 30 === 0) {
      lastPresion = basePres - 35.50; // Force decompression drop
    } else {
      lastPresion = basePres;
    }

    data = {
      co2_ppm:       { v: co2Val, hace_seg: 0.0 },
      gas_voc_ppb:   { v: vocVal, hace_seg: 0.0 },
      temperatura_c: { v: tempVal, hace_seg: 0.0 },
      radiacion_uv:  { v: uvVal, hace_seg: 0.0 },
      humedad_pct:   { v: humVal, hace_seg: 0.0 },
      presion_pa:    { v: lastPresion, hace_seg: 0.0, umbral_alerta: PRESION_UMBRAL_ALERTA }
    };

    // Calculate baseline warning state
    const outOfBounds = 
      co2Val > 440 || 
      vocVal > 45 || 
      tempVal > 29.5 || 
      humVal > 68.0 || 
      uvVal > 5.5 ||
      lastPresion > 100600.0;

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
