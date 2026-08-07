/**
 * Mission Phase State Machine for CubeSat CEMPAI
 * 
 * Rules:
 * 1. INICIALIZACIÓN: 0m to 10m (initial ground / launchpad state).
 * 2. ASCENSO / LANZAMIENTO: Surpasses 10m and climbs up to 80m - 100m.
 *    - Ignores minor drone wobble fluctuations during ascent by tracking maxAltitudeReached.
 * 3. DESCENSO: Triggered after reaching high ascent (maxAlt >= 70m) and detecting
 *    a significant drop (>= 15m drop from peak, e.g. 80m -> 65m or 60m).
 * 4. PROXIMIDAD AL SUELO: Triggered after DESCENSO when altitude <= 30m.
 * 5. ATERRIZADO: Triggered when altitude <= 5m.
 */

export const FASES_UI_NAMES = {
  INICIALIZACION: 'INICIALIZACIÓN',
  ASCENSO: 'ASCENSO / LANZAMIENTO',
  DESCENSO: 'DESCENSO',
  PROXIMIDAD_SUELO: 'PROXIMIDAD AL SUELO',
  ATERRIZADO: 'ATERRIZADO'
};

export function updateMissionPhaseState(currentAlt, prevState) {
  const alt = (currentAlt !== null && currentAlt !== undefined && !isNaN(currentAlt)) ? currentAlt : 0;

  let phase = prevState?.currentPhase || FASES_UI_NAMES.INICIALIZACION;
  let maxAlt = Math.max(prevState?.maxAltReached || 0, alt);
  let hasAscended = prevState?.hasAscended || false;

  // 1. INICIALIZACIÓN (0m - 10m)
  if (phase === FASES_UI_NAMES.INICIALIZACION) {
    if (alt > 10.0) {
      phase = FASES_UI_NAMES.ASCENSO;
      hasAscended = true;
      maxAlt = alt;
    }
  }
  // 2. ASCENSO / LANZAMIENTO (>10m climbing towards 80m-100m)
  else if (phase === FASES_UI_NAMES.ASCENSO) {
    if (alt > maxAlt) {
      maxAlt = alt;
    }

    // Check for transition to DESCENSO:
    // Must have reached a high altitude (>= 70m) AND suffered a significant drop (>= 15m drop from peak, e.g. 80m -> 65m/60m)
    const reachedHighAscent = maxAlt >= 70.0;
    const significantDrop = (maxAlt - alt) >= 15.0;

    if (reachedHighAscent && significantDrop) {
      phase = FASES_UI_NAMES.DESCENSO;
    }
  }
  // 3. DESCENSO (falling after apogee)
  else if (phase === FASES_UI_NAMES.DESCENSO) {
    if (alt <= 30.0) {
      phase = FASES_UI_NAMES.PROXIMIDAD_SUELO;
    }
  }
  // 4. PROXIMIDAD AL SUELO (<= 30m)
  else if (phase === FASES_UI_NAMES.PROXIMIDAD_SUELO) {
    if (alt <= 5.0) {
      phase = FASES_UI_NAMES.ATERRIZADO;
    }
  }
  // 5. ATERRIZADO (<= 5m final state)
  else if (phase === FASES_UI_NAMES.ATERRIZADO) {
    if (alt > 12.0) {
      phase = FASES_UI_NAMES.ASCENSO;
      maxAlt = alt;
      hasAscended = true;
    }
  }

  return {
    currentPhase: phase,
    maxAltReached: maxAlt,
    hasAscended
  };
}
