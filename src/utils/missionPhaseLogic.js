/**
 * Strict Monotonic Mission Phase State Machine for CubeSat CEMPAI
 * 
 * Phases:
 * 0: INICIALIZACIÓN (0m to 10m on ground before launch)
 * 1: ASCENSO / LANZAMIENTO (>10m climbing up to 80m - 100m)
 * 2: DESCENSO (Triggered after reaching >= 70m peak and suffering a >= 15m drop)
 * 3: PROXIMIDAD AL SUELO (Altitude <= 30m during descent)
 * 4: ATERRIZADO (Altitude <= 5m ONLY AFTER confirmed flight ascent and descent)
 */

export const FASES_ORDER = [
  'INICIALIZACIÓN',
  'ASCENSO / LANZAMIENTO',
  'DESCENSO',
  'PROXIMIDAD AL SUELO',
  'ATERRIZADO'
];

export const FASES_UI_NAMES = {
  INICIALIZACION: 'INICIALIZACIÓN',
  ASCENSO: 'ASCENSO / LANZAMIENTO',
  DESCENSO: 'DESCENSO',
  PROXIMIDAD_SUELO: 'PROXIMIDAD AL SUELO',
  ATERRIZADO: 'ATERRIZADO'
};

export function updateMissionPhaseState(currentAlt, prevState) {
  const alt = (currentAlt !== null && currentAlt !== undefined && !isNaN(currentAlt)) ? currentAlt : 0;

  let currentPhase = prevState?.currentPhase || FASES_UI_NAMES.INICIALIZACION;
  let maxAlt = prevState?.maxAltReached || 0;
  let hasAscended = prevState?.hasAscended || false;

  // Track if satellite has actually launched/ascended above 10m
  if (alt > 10.0) {
    hasAscended = true;
  }

  // Force reset if requested
  if (prevState?.forceReset) {
    currentPhase = FASES_UI_NAMES.INICIALIZACION;
    maxAlt = alt;
    hasAscended = false;
  }

  let currentPhaseIdx = FASES_ORDER.indexOf(currentPhase);
  if (currentPhaseIdx < 0) currentPhaseIdx = 0;

  maxAlt = Math.max(maxAlt, alt);
  let candidatePhase = currentPhase;

  // Evaluate candidate phase based on altitude thresholds
  if (currentPhase === FASES_UI_NAMES.INICIALIZACION) {
    if (alt > 10.0) {
      candidatePhase = FASES_UI_NAMES.ASCENSO;
      maxAlt = alt;
      hasAscended = true;
    }
  }
  else if (currentPhase === FASES_UI_NAMES.ASCENSO) {
    if (alt > maxAlt) {
      maxAlt = alt;
    }

    const reachedHighAscent = maxAlt >= 70.0;
    const significantDrop = (maxAlt - alt) >= 15.0;

    if (reachedHighAscent && significantDrop) {
      candidatePhase = FASES_UI_NAMES.DESCENSO;
    }
  }
  else if (currentPhase === FASES_UI_NAMES.DESCENSO) {
    if (alt <= 30.0) {
      candidatePhase = FASES_UI_NAMES.PROXIMIDAD_SUELO;
    }
  }
  else if (currentPhase === FASES_UI_NAMES.PROXIMIDAD_SUELO) {
    // ONLY transition to ATERRIZADO if satellite has actually launched and descended
    if (hasAscended && alt <= 5.0) {
      candidatePhase = FASES_UI_NAMES.ATERRIZADO;
    }
  }
  else if (currentPhase === FASES_UI_NAMES.ATERRIZADO) {
    candidatePhase = FASES_UI_NAMES.ATERRIZADO;
  }

  // STRICT MONOTONIC LOCK FOR ACTIVE FLIGHT
  const candidateIdx = FASES_ORDER.indexOf(candidatePhase);
  const finalPhase = (candidateIdx >= currentPhaseIdx) ? candidatePhase : currentPhase;

  return {
    currentPhase: finalPhase,
    maxAltReached: maxAlt,
    hasAscended
  };
}
