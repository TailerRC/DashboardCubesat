import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';
import { updateMissionPhaseState, FASES_UI_NAMES } from '../../utils/missionPhaseLogic';

const TOPIC_MISION = 'cempai/cubesat/telemetry/mision';
const TOPIC_UBICACION = 'cempai/cubesat/telemetry/ubicacion';
const HISTORY_SIZE = 20;

export function useMisionMqtt() {
  const [data, setData] = useState(() => {
    return {
      fase_cdr: '---',
      fase_cdr_index: null,
      fase_ui: FASES_UI_NAMES.INICIALIZACION,
      altitud_m: { v: 0, hace_seg: 0.0, history: [] },
      velocidad_vertical_ms: { v: 0, hace_seg: 0.0, history: [] },
      t_vuelo_seg: { v: 0, hace_seg: 0.0 },
      sd_card_status: '---'
    };
  });
  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  // Persistent Phase State Machine Ref
  const phaseStateRef = useRef({
    currentPhase: FASES_UI_NAMES.INICIALIZACION,
    maxAltReached: 0,
    hasAscended: false
  });

  useEffect(() => {
    // Handler for Mission telemetry topic
    const handleMisionMessage = (packet) => {
      setLastPacketId(packet.packet_id);
      const packetTime = Date.now();

      if (packet.received && packet.crc_valido && packet.data) {
        setLastValidPacketTime(packetTime);
        const d = packet.data;

        setData(prev => {
          let rawAlt = (d.altitud_m?.v !== undefined && d.altitud_m?.v !== null) ? d.altitud_m.v : 0;
          rawAlt = Math.min(100.0, Math.max(0.0, rawAlt));
          phaseStateRef.current = updateMissionPhaseState(rawAlt, phaseStateRef.current);
          const computedFaseUI = phaseStateRef.current.currentPhase;

          // Update altitud history
          const prevAltHist = prev.altitud_m.history || [];
          const newAltHist = [...prevAltHist, { value: rawAlt, timestamp: packetTime }];
          if (newAltHist.length > HISTORY_SIZE) newAltHist.shift();

          // Update velocidad history
          const velVal = d.velocidad_vertical_ms?.v ?? 0;
          const prevVelHist = prev.velocidad_vertical_ms.history || [];
          const newVelHist = [...prevVelHist, { value: velVal, timestamp: packetTime }];
          if (newVelHist.length > HISTORY_SIZE) newVelHist.shift();

          return {
            fase_cdr: d.fase_cdr || '---',
            fase_cdr_index: d.fase_cdr_index ?? null,
            fase_ui: computedFaseUI,
            altitud_m: { v: rawAlt, hace_seg: d.altitud_m?.hace_seg || 0.0, history: newAltHist },
            velocidad_vertical_ms: { v: velVal, hace_seg: d.velocidad_vertical_ms?.hace_seg || 0.0, history: newVelHist },
            t_vuelo_seg: { v: d.t_vuelo_seg?.v || 0, hace_seg: d.t_vuelo_seg?.hace_seg || 0.0 },
            sd_card_status: d.sd_card_status || '---'
          };
        });
      }
    };

    // Handler for Ubicacion telemetry topic (Altitud de Vuelo GPS updates phase state)
    const handleUbicacionMessage = (packet) => {
      if (packet.received && packet.crc_valido && packet.data) {
        const altGps = packet.data.altitud_gps?.v ?? (typeof packet.data.altitud_gps === 'number' ? packet.data.altitud_gps : null);
        if (altGps !== null && altGps !== undefined) {
          phaseStateRef.current = updateMissionPhaseState(altGps, phaseStateRef.current);
          const computedFaseUI = phaseStateRef.current.currentPhase;

          setData(prev => {
            if (prev.fase_ui === computedFaseUI) return prev;
            return {
              ...prev,
              fase_ui: computedFaseUI
            };
          });
        }
      }
    };

    const unsubMision = MqttService.subscribe(TOPIC_MISION, handleMisionMessage);
    const unsubUbi = MqttService.subscribe(TOPIC_UBICACION, handleUbicacionMessage);

    return () => {
      unsubMision();
      unsubUbi();
    };
  }, []);

  return {
    data,
    faseUI: data.fase_ui,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
