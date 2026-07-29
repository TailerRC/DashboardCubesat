// ── Mock Publisher for 3D Orientation Telemetry ─────────────────────────────
// Generates simulated MPU6050 accelerometer, gyroscope, and Euler angles.
// NO magnetometer (magX/Y/Z) as per CDR Correction 1.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/orientacion3d' every 100ms - 200ms.

import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/orientacion3d';

let packetId = 7000;
let timerId = null;
let simulatedTimeSecs = 0;
let accumulatedDrift = 0.0;

function publishNextPacket() {
  packetId++;

  const t = simulatedTimeSecs;

  // Smooth sinusoidal movement for 3D visualizer demo
  const cabeceo = parseFloat((25.3 + Math.sin(t * 0.4) * 8.0).toFixed(1));
  const balanceo = parseFloat((-10.8 + Math.cos(t * 0.3) * 6.0).toFixed(1));

  // Drift accumulation for Yaw (integrated from gyro_z)
  accumulatedDrift = parseFloat((accumulatedDrift + 0.015 * 0.15).toFixed(2));
  let rawGiro = (175.1 + Math.sin(t * 0.1) * 12.0 + accumulatedDrift) % 360;
  if (rawGiro < 0) rawGiro += 360;
  const giro = parseFloat(rawGiro.toFixed(1));

  // MPU6050 Accelerometer (m/s²)
  const accelX = parseFloat((0.12 + Math.sin(t * 0.8) * 0.25).toFixed(2));
  const accelY = parseFloat((0.87 + Math.cos(t * 0.6) * 0.30).toFixed(2));
  const accelZ = parseFloat((9.81 + Math.sin(t * 1.2) * 0.40).toFixed(2));

  // MPU6050 Gyroscope (deg/s)
  const gyroX = parseFloat((0.03 + Math.sin(t * 2.0) * 1.2).toFixed(2));
  const gyroY = parseFloat((-0.12 + Math.cos(t * 1.8) * 0.9).toFixed(2));
  const gyroZ = parseFloat((0.08 + Math.sin(t * 0.5) * 0.5).toFixed(2));

  // Derived Inertial Force (m/s²)
  const inercialX = parseFloat((Math.abs(accelX * 0.8)).toFixed(2));
  const inercialY = parseFloat((Math.abs(accelY * 0.7)).toFixed(2));
  const inercialZ = parseFloat((Math.abs(accelZ - 9.81)).toFixed(2));

  const packet = {
    topic: TOPIC,
    packet_id: packetId,
    received: true,
    crc_valido: true,
    data: {
      cabeceo_deg: { v: cabeceo, hace_seg: 0.0 },
      balanceo_deg: { v: balanceo, hace_seg: 0.0 },
      giro_yaw_deg: { v: giro, hace_seg: 0.0, drift_acumulado: accumulatedDrift },
      accel_x: { v: accelX, hace_seg: 0.0 },
      accel_y: { v: accelY, hace_seg: 0.0 },
      accel_z: { v: accelZ, hace_seg: 0.0 },
      gyro_x_dps: { v: gyroX, hace_seg: 0.0 },
      gyro_y_dps: { v: gyroY, hace_seg: 0.0 },
      gyro_z_dps: { v: gyroZ, hace_seg: 0.0 },
      inercial_x: { v: inercialX, hace_seg: 0.0 },
      inercial_y: { v: inercialY, hace_seg: 0.0 },
      inercial_z: { v: inercialZ, hace_seg: 0.0 }
    }
  };

  MqttService.publish(TOPIC, packet);
}

export function startOrientacion3DMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/orientacion3d...');

  const loop = () => {
    const nextDelay = 120 + Math.random() * 80; // 120ms - 200ms
    simulatedTimeSecs += nextDelay / 1000.0;
    publishNextPacket();
    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

export function stopOrientacion3DMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped 3D Orientation simulation.');
  }
}
