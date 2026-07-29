// ── Mock Publisher for GPS / Ubicación Telemetry ──────────────────────────────
// Generates simulated GPS telemetry packets conforming to the exact layout schema.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/ubicacion' every 0.5s - 1.0s.

import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/ubicacion';

// Launch/Landing constants (San Miguel, Lima, Peru)
const LAUNCH_LAT = -12.0850;
const LAUNCH_LON = -77.0900;
const LAND_LAT = -12.0780;
const LAND_LON = -77.0850;

// Running states
let packetId = 2000;
let timerId = null;
let simulatedTimeSecs = 0;

export function getUbicacionValueAtTime(secondsElapsed) {
  const cycleTime = secondsElapsed % 120;

  // 1. Altitud GPS (Ascent/Descent curve)
  let altitud = 0;
  let velocidad_vertical = 0;
  if (cycleTime < 60) {
    altitud = Math.sin((cycleTime / 60) * (Math.PI / 2)) * 200;
    velocidad_vertical = 5.24 * Math.cos((cycleTime / 60) * (Math.PI / 2));
  } else {
    altitud = Math.cos(((cycleTime - 60) / 60) * (Math.PI / 2)) * 200;
    velocidad_vertical = -5.24 * Math.sin(((cycleTime - 60) / 60) * (Math.PI / 2));
  }
  // Add minor noise
  altitud += (Math.random() - 0.5) * 1.5;
  if (altitud < 0) altitud = 0;
  velocidad_vertical += (Math.random() - 0.5) * 0.4;

  // Constants for relative conversion
  const cosLat0 = Math.cos(LAUNCH_LAT * Math.PI / 180);
  const Y_METERS_PER_DEG = 110540;
  const X_METERS_PER_DEG = 111320 * cosLat0;

  const x_land = (LAND_LON - LAUNCH_LON) * X_METERS_PER_DEG;
  const y_land = (LAND_LAT - LAUNCH_LAT) * Y_METERS_PER_DEG;

  // 2. Cartesian coordinates relative to launch (0,0) in meters
  const latJitter = (Math.random() - 0.5) * 0.3; // meters
  const lonJitter = (Math.random() - 0.5) * 0.3;

  let currentX = 0;
  let currentY = 0;

  if (cycleTime < 60) {
    currentX = lonJitter;
    currentY = latJitter;
  } else {
    const descentRatio = (cycleTime - 60) / 60;
    // Add wind wave drift deviation (0 at start and end of descent)
    const waveX = Math.sin(descentRatio * Math.PI * 3) * 45.0 * descentRatio * (1 - descentRatio);
    const waveY = Math.sin(descentRatio * Math.PI * 2) * 120.0 * descentRatio * (1 - descentRatio);
    currentX = descentRatio * x_land + waveX + lonJitter;
    currentY = descentRatio * y_land + waveY + latJitter;
  }

  // Convert back to absolute GPS degrees
  const lat = LAUNCH_LAT + currentY / Y_METERS_PER_DEG;
  const lon = LAUNCH_LON + currentX / X_METERS_PER_DEG;
  const distancia = Math.sqrt(currentX * currentX + currentY * currentY);

  // 3. Velocidad
  let velocidad = 15.3;
  if (cycleTime < 10) {
    velocidad = 5.0 + cycleTime * 1.5;
  } else if (cycleTime < 60) {
    velocidad = 20.0 + Math.sin(cycleTime * 0.2) * 3.0;
  } else if (cycleTime < 110) {
    velocidad = 15.0 + Math.cos(cycleTime * 0.1) * 2.0;
  } else {
    const stopRatio = (120 - cycleTime) / 10;
    velocidad = stopRatio * 15.0;
  }
  if (velocidad < 0) velocidad = 0;

  // 4. Distancia al Origen (clamped to >= 0)
  const distClamped = Math.max(0, distancia);

  // 5. Satélites y Calidad Señal
  const satelites = Math.floor(8 + Math.random() * 3); // 8 to 10
  const calidad = Math.floor(7 + Math.random() * 4); // 7 to 10 bars

  return {
    latitud: parseFloat(lat.toFixed(6)),
    longitud: parseFloat(lon.toFixed(6)),
    altitud: parseFloat(altitud.toFixed(1)),
    velocidad: parseFloat(velocidad.toFixed(1)),
    distancia: parseFloat(distClamped.toFixed(1)),
    velocidad_vertical: parseFloat(velocidad_vertical.toFixed(1)),
    satelites,
    calidad
  };
}

function publishNextPacket() {
  packetId++;

  const rand = Math.random();
  let received = true;
  let crcValido = true;
  let data = null;

  // 8% packet loss, 2% CRC corruption
  if (rand < 0.08) {
    received = false;
    crcValido = null;
  } else if (rand < 0.10) {
    crcValido = false;
  }

  if (received) {
    const values = getUbicacionValueAtTime(simulatedTimeSecs);
    const now = new Date();

    // Format current date and time in UTC
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].substring(0, 8);

    data = {
      latitud: { v: values.latitud, hace_seg: 0.0 },
      longitud: { v: values.longitud, hace_seg: 0.0 },
      altitud_gps: { v: values.altitud, hace_seg: 0.0 },
      velocidad_kmh: { v: values.velocidad, hace_seg: 0.0 },
      velocidad_vertical: { v: values.velocidad_vertical, hace_seg: 0.0 },
      satelites: { v: values.satelites, hace_seg: 0.0 },
      hdop: { v: 0.8, hace_seg: 0.0 },
      calidad_senal: { v: values.calidad, hace_seg: 0.0 },
      distancia_origen: { v: values.distancia, hace_seg: 0.0 },
      fecha_utc: dateStr,
      hora_utc: timeStr,
      coordenadas_aterrizaje: { lat: LAND_LAT, lon: LAND_LON }
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

export function startUbicacionMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/ubicacion...');

  const loop = () => {
    const nextDelay = 500 + Math.random() * 500;
    simulatedTimeSecs += nextDelay / 1000.0;

    publishNextPacket();

    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

export function stopUbicacionMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped GPS simulation.');
  }
}
