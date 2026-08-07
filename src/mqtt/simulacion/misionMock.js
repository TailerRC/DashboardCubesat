// ── Mock Publisher for Mission Telemetry ─────────────────────────────────────
// Generates simulated mission phases, altitude profile, orientation, and system telemetry.
// Publishes to MqttService on topic 'cempai/cubesat/telemetry/mision' every 0.5s - 1.0s.

import { MqttService } from '../config/mqttConfig';
import { updateMissionPhaseState, FASES_UI_NAMES } from '../../utils/missionPhaseLogic';
import { getUbicacionValueAtTime } from './ubicacionMock';

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
  const cycleTime = secondsElapsed % 65;
  const ubiVal = getUbicacionValueAtTime(secondsElapsed);
  const altitud = ubiVal.altitud;
  const velVert = ubiVal.velocidad_vertical;

  // Reset mock phase state at beginning of new flight cycle
  if (cycleTime < 1.0) {
    mockPhaseState = { currentPhase: FASES_UI_NAMES.INICIALIZACION, maxAltReached: 0, hasAscended: false };
  }

  let faseCdrIdx = 0;
  if (!mockPhaseState.hasAscended && altitud <= 5.0) faseCdrIdx = 0;
  else if (altitud > 5.0 && altitud < 80.0 && velVert >= 0) faseCdrIdx = 2;
  else if (altitud >= 80.0) faseCdrIdx = 3;
  else if (velVert < 0 && altitud > 5.0) faseCdrIdx = 4;
  else if (mockPhaseState.hasAscended && altitud <= 5.0) faseCdrIdx = 5;

  const faseCdr = CDR_FASES[faseCdrIdx];

  // Evaluate UI phase state from altitude
  mockPhaseState = updateMissionPhaseState(altitud, mockPhaseState);
  const faseUi = mockPhaseState.currentPhase;

  // Simulated orientation
  const cabeceo = parseFloat((2.3 + Math.sin(secondsElapsed * 0.2) * 1.5).toFixed(1));
  const balanceo = parseFloat((-0.8 + Math.cos(secondsElapsed * 0.15) * 1.2).toFixed(1));

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
    sd_card_status: 'N/A'
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopMisionMockPublisher();
  });
}
