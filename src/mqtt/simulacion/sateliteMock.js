// ── Mock Publisher for Satellite Telemetry ───────────────────────────────────
// Generates simulated electrical, mechanical, and system status telemetry.
// Publishes to topic 'cempai/cubesat/telemetry/satelite' every 0.5s - 1.0s.

import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/satelite';

export const SATELITE_CONFIGS = {
  voltaje: {
    label: 'Voltaje Batería',
    unit: 'V',
    yMin: 11.0,
    yMax: 13.0,
    threshold: 11.5,
    decimals: 2,
    color: '#ef5350'
  },
  corriente: {
    label: 'Corriente',
    unit: 'mA',
    yMin: 0,
    yMax: 900,
    threshold: 900,
    decimals: 1,
    color: '#42a5f5'
  },
  consumo: {
    label: 'Consumo Energía',
    unit: 'W',
    yMin: 0.0,
    yMax: 10.0,
    threshold: 10.0,
    decimals: 2,
    color: '#ba68c8'
  }
};

export function getSateliteValueAtTime(key, secondsElapsed) {
  const t = secondsElapsed;

  switch (key) {
    case 'voltaje': {
      // Discharge curve: slowly decays from 12.6V downwards.
      const volt = 12.35 - (t * 0.0001) + Math.sin(t * 0.02) * 0.015;
      return parseFloat(Math.max(11.1, Math.min(12.8, volt)).toFixed(2));
    }
    case 'corriente': {
      // Fluctuates around 450mA, spikes periodically (simulating radio transmit).
      const base = 440;
      const spike = (Math.abs(Math.sin(t * 0.05)) > 0.85) ? 140 : 0;
      const noise = Math.sin(t * 0.2) * 8 + (Math.sin(t * 0.8) * 3);
      return parseFloat(Math.max(300, Math.min(850, base + spike + noise)).toFixed(1));
    }
    case 'consumo': {
      // P = V * I / 1000
      const v = getSateliteValueAtTime('voltaje', t);
      const i = getSateliteValueAtTime('corriente', t);
      return parseFloat(((v * i) / 1000).toFixed(2));
    }
    case 'temp_mcu': {
      // Gradually heats up to 28.3C and hovers
      const temp = 26.8 + Math.min(300, Math.max(0, 3900 + t)) * 0.0003 + Math.sin(t * 0.01) * 0.1;
      return parseFloat(Math.max(20.0, Math.min(45.0, temp)).toFixed(1));
    }
    case 'sensores_activos':
      return 7;
    case 'memoria_flash_ok':
      return true;
    case 'tiempo_encendido_seg':
      // Uptime starting around 1 hour 5 min (3900 seconds)
      return Math.max(0, Math.floor(3923 + t));
    default:
      return 0;
  }
}

let packetId = 3000;
let timerId = null;
let simulatedTimeSecs = 0;

function publishNextPacket() {
  packetId++;

  const rand = Math.random();
  let received = true;
  let crcValido = true;
  let data = null;

  // 8% loss, 2% CRC corruption (matches other telemetry topics)
  if (rand < 0.08) {
    received = false;
    crcValido = null;
  } else if (rand < 0.10) {
    crcValido = false;
  }

  if (received) {
    const t = simulatedTimeSecs;
    data = {
      voltaje_v:            { v: getSateliteValueAtTime('voltaje', t), hace_seg: 0.0 },
      corriente_ma:         { v: getSateliteValueAtTime('corriente', t), hace_seg: 0.0 },
      consumo_w:            { v: getSateliteValueAtTime('consumo', t), hace_seg: 0.0 },
      // accel_x/y/z pertenecen exclusivamente a cempai/cubesat/telemetry/orientacion3d
      sensores_activos:     { v: getSateliteValueAtTime('sensores_activos', t), hace_seg: 0.0, total: 7 },
      temp_mcu:             { v: getSateliteValueAtTime('temp_mcu', t), hace_seg: 0.0 },
      memoria_flash_ok:     { v: getSateliteValueAtTime('memoria_flash_ok', t), hace_seg: 0.0 },
      tiempo_encendido_seg: { v: getSateliteValueAtTime('tiempo_encendido_seg', t), hace_seg: 0.0 }
    };
  }

  const packet = {
    topic: TOPIC,
    packet_id: packetId,
    received,
    crc_valido: crcValido,
    data
  };

  MqttService.publish(TOPIC, packet);
}

export function startSateliteMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/satelite...');

  const loop = () => {
    const nextDelay = 500 + Math.random() * 500; // 500ms - 1000ms
    simulatedTimeSecs += nextDelay / 1000.0;

    publishNextPacket();

    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

export function stopSateliteMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped Satellite simulation.');
  }
}
