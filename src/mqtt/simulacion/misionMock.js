// ── Mock Publisher for Mission Telemetry ─────────────────────────────────────
// Generates simulated mission phases, altitude profile, orientation, and system telemetry.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/mision' every 0.5s - 1.0s.

import { MqttService } from '../config/mqttConfig';
import { updateMissionPhaseState, FASES_UI_NAMES } from '../../utils/missionPhaseLogic';

const TOPIC = 'cempai/cubesat/telemetry/mision';

export const CDR_FASES = [
  'PREPARACION_TIERRA',
  'INTEGRACION_ACOPLAMIENTO',
  'DESPEGUE_ASCENSO',
  'ALTURA_MAXIMA_DESACOPLE',
  'DESCENSO_CONTROLADO',
  'ATERRIZAJE',
  'RECUPERACION'
];

let packetId = 5000;
let timerId = null;
let simulatedTimeSecs = 0;
let accumulatedDrift = 0.0;
let mockPhaseState = { currentPhase: FASES_UI_NAMES.INICIALIZACION, maxAltReached: 0, hasAscended: false };

export function getMisionDataAtTime(secondsElapsed) {
  // Flight loop cycle of 1200 seconds (~20 minutes)
  const cycleTime = secondsElapsed % 1200;

  // Reset mock phase state at beginning of cycle
  if (cycleTime < 2) {
    mockPhaseState = { currentPhase: FASES_UI_NAMES.INICIALIZACION, maxAltReached: 0, hasAscended: false };
  }
  
  let faseCdrIdx = 0;
  let altitud = 0;
  let velVert = 0;
  
  if (cycleTime < 60) {
    // 0-60s: Ground prep
    faseCdrIdx = 0;
    altitud = 0;
    velVert = 0;
  } else if (cycleTime < 120) {
    // 60-120s: Coupling
    faseCdrIdx = 1;
    altitud = 0;
    velVert = 0;
  } else if (cycleTime < 420) {
    // 120-420s: Ascent (300s duration, climbs to 115m)
    faseCdrIdx = 2;
    const progress = (cycleTime - 120) / 300;
    altitud = 115 * Math.sin(progress * (Math.PI / 2));
    velVert = (115 * (Math.PI / 2) / 300) * Math.cos(progress * (Math.PI / 2));
  } else if (cycleTime < 480) {
    // 420-480s: Apogee & Decouple (115m to 110m)
    faseCdrIdx = 3;
    const progress = (cycleTime - 420) / 60;
    altitud = 115 - (5 * progress);
    velVert = -0.08;
  } else if (cycleTime < 1080) {
    // 480-1080s: Controlled Descent (600s duration, 110m to 0m)
    faseCdrIdx = 4;
    const progress = (cycleTime - 480) / 600;
    altitud = 110 * (1 - progress);
    velVert = -0.18; // 110m / 600s
  } else if (cycleTime < 1140) {
    // 1080-1140s: Landing
    faseCdrIdx = 5;
    altitud = 0;
    velVert = 0;
  } else {
    // 1140-1200s: Recovery
    faseCdrIdx = 6;
    altitud = 0;
    velVert = 0;
  }

  const faseCdr = CDR_FASES[faseCdrIdx];

  // Evaluate UI phase state from altitude
  mockPhaseState = updateMissionPhaseState(altitud, mockPhaseState);
  const faseUi = mockPhaseState.currentPhase;

  // Simulated orientation (Cabeceo, Balanceo, Giro/Yaw with drift)
  const cabeceo = parseFloat((2.3 + Math.sin(secondsElapsed * 0.2) * 1.5).toFixed(1));
  const balanceo = parseFloat((-0.8 + Math.cos(secondsElapsed * 0.15) * 1.2).toFixed(1));

  // Drift accumulation (0.02 deg/sec)
  accumulatedDrift = parseFloat((accumulatedDrift + 0.02 * 0.75).toFixed(2));
  let rawGiro = (180 + Math.sin(secondsElapsed * 0.05) * 15 + accumulatedDrift) % 360;
  if (rawGiro < 0) rawGiro += 360;
  const giro = parseFloat(rawGiro.toFixed(1));

  return {
    fase_cdr: faseCdr,
    fase_cdr_index: faseCdrIdx,
    fase_ui: faseUi,
    altitud_m: parseFloat(altitud.toFixed(1)),
    velocidad_vertical_ms: parseFloat(velVert.toFixed(2)),
    t_vuelo_seg: Math.floor(cycleTime),
    // cabeceo_deg, balanceo_deg, giro_yaw_deg → exclusivos de orientacion3d
    sd_card_status: 'N/A' // CDR Correction 7
  };
}

function publishNextPacket() {
  packetId++;

  const rand = Math.random();
  let received = true;
  let crcValido = true;
  let data = null;

  if (rand < 0.08) {
    received = false;
    crcValido = null;
  } else if (rand < 0.10) {
    crcValido = false;
  }

  if (received) {
    const raw = getMisionDataAtTime(simulatedTimeSecs);
    data = {
      fase_cdr: raw.fase_cdr,
      fase_cdr_index: raw.fase_cdr_index,
      fase_ui: raw.fase_ui,
      altitud_m: { v: raw.altitud_m, hace_seg: 0.0 },
      velocidad_vertical_ms: { v: raw.velocidad_vertical_ms, hace_seg: 0.0 },
      t_vuelo_seg: { v: raw.t_vuelo_seg, hace_seg: 0.0 },
      // cabeceo_deg, balanceo_deg, giro_yaw_deg → leer de orientacion3d
      sd_card_status: raw.sd_card_status
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

export function startMisionMockPublisher() {
  if (timerId) return;

  console.log('[MOCK PUBLISHER] Starting telemetry broadcasts to cempai/cubesat/telemetry/mision...');

  const loop = () => {
    const nextDelay = 500 + Math.random() * 500;
    simulatedTimeSecs += nextDelay / 1000.0;
    publishNextPacket();
    timerId = setTimeout(loop, nextDelay);
  };

  loop();
}

export function stopMisionMockPublisher() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
    console.log('[MOCK PUBLISHER] Stopped Mission simulation.');
  }
}
