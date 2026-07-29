// ── Mock Publisher for Communication Telemetry ────────────────────────────────
// Generates simulated NRF24L01 RF link statistics, packet counts, link quality, and logs.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/comunicacion' every 0.5s - 1.0s.

import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/comunicacion';

let packetId = 6000;
let timerId = null;
let simulatedTimeSecs = 0;

let totalEnviados = 5880;
let totalRecibidos = 5620;
let totalPerdidos = 260;

// Rolling window for link quality calculation (last 20 packets)
const recentWindow = Array(20).fill(true);

const LOG_TEMPLATES = [
  (id) => `PKT#${String(id).padStart(3, '0')} - CO2:${400 + Math.floor(Math.random()*15)} T:${(23 + Math.random()).toFixed(1)} H:${(65 + Math.random()).toFixed(1)}`,
  (id) => `PKT#${String(id).padStart(3, '0')} - CMD:ACK - OBC ONLINE`,
  (id) => `PKT#${String(id).padStart(3, '0')} - GPS: 19.4326, -99.1332 ALT:${(500 + Math.random()*20).toFixed(1)}m`,
  (id) => `PKT#${String(id).padStart(3, '0')} - MPU6050 Acc:[0.1, 0.8, 9.8] Gyro:[0.0, 0.0, 0.1]`,
  (id) => `PKT#${String(id).padStart(3, '0')} - INA219 Volt:12.34V Curr:445mA Pwr:5.49W`
];

function publishNextPacket() {
  packetId++;
  totalEnviados++;

  const rand = Math.random();
  let received = true;
  let crcValido = true;

  if (rand < 0.08) {
    received = false;
    crcValido = null;
    totalPerdidos++;
    recentWindow.shift();
    recentWindow.push(false);
  } else if (rand < 0.10) {
    crcValido = false;
    totalPerdidos++;
    recentWindow.shift();
    recentWindow.push(false);
  } else {
    totalRecibidos++;
    recentWindow.shift();
    recentWindow.push(true);
  }

  // Calculate Link Quality (%) over rolling window
  const okCount = recentWindow.filter(Boolean).length;
  const calidadPct = parseFloat(((okCount / recentWindow.length) * 100).toFixed(1));

  let calidadLabel = 'Excelente';
  if (calidadPct < 70) calidadLabel = 'Débil / Inestable';
  else if (calidadPct < 85) calidadLabel = 'Regular';
  else if (calidadPct < 95) calidadLabel = 'Buena';

  // Format current time HH:MM:SS
  const now = new Date();
  const timestampStr = now.toTimeString().split(' ')[0];

  // Log entry creation
  let logEntry = null;
  if (received && crcValido) {
    const templateFn = LOG_TEMPLATES[packetId % LOG_TEMPLATES.length];
    logEntry = {
      timestamp: timestampStr,
      status: 'RX OK',
      text: templateFn(packetId)
    };
  } else if (received && !crcValido) {
    logEntry = {
      timestamp: timestampStr,
      status: 'RX ERROR',
      text: `PKT#${String(packetId).padStart(3, '0')} - Checksum Error (CRC Invalid)`
    };
  } else {
    logEntry = {
      timestamp: timestampStr,
      status: 'RX TIMEOUT',
      text: `PKT#${String(packetId).padStart(3, '0')} - Packet Lost / Timeout`
    };
  }

  const packet = {
    topic: TOPIC,
    packet_id: packetId,
    received,
    crc_valido: crcValido,
    data: {
      paquetes_enviados: { v: totalEnviados, hace_seg: 0.0 },
      paquetes_recibidos: { v: totalRecibidos, hace_seg: 0.0 },
      paquetes_perdidos: { v: totalPerdidos, hace_seg: 0.0 },
      frecuencia_ghz: { v: 2.401, hace_seg: 0.0 }, // NRF24L01 Channel 1 (CDR Correction 2)
      canal_nrf24: { v: 1 },
      calidad_enlace_pct: { v: calidadPct, hace_seg: 0.0 }, // CDR Correction 3
      calidad_label: calidadLabel,
      baudios_debug: { v: 9600 }, // CDR Correction 8
      tasa_aire_nrf24_kbps: { v: 2000 },
      ultimo_pkt_timestamp: timestampStr,
      log_entry: logEntry,
      pkts_window: [...recentWindow]
    }
  };

  MqttService.publish(TOPIC, packet);
}

export function startComunicacionMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/comunicacion...');

  const loop = () => {
    const nextDelay = 500 + Math.random() * 500;
    simulatedTimeSecs += nextDelay / 1000.0;
    publishNextPacket();
    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

export function stopComunicacionMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped Communication simulation.');
  }
}
