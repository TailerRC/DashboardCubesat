import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';
import { getMisionDataAtTime } from '../simulacion/misionMock';

const TOPIC = 'cempai/cubesat/telemetry/mision';
const HISTORY_SIZE = 20;

function buildInitialData() {
  const initialRaw = getMisionDataAtTime(450); // Sample descent phase for initial render
  const now = Date.now();
  
  const altHist = [];
  const velHist = [];
  for (let i = 0; i < HISTORY_SIZE; i++) {
    const agoSecs = (HISTORY_SIZE - 1 - i) * 2;
    const sample = getMisionDataAtTime(450 - agoSecs);
    altHist.push({ value: sample.altitud_m, timestamp: now - agoSecs * 1000 });
    velHist.push({ value: sample.velocidad_vertical_ms, timestamp: now - agoSecs * 1000 });
  }

  return {
    fase_cdr: initialRaw.fase_cdr,
    fase_cdr_index: initialRaw.fase_cdr_index,
    fase_ui: initialRaw.fase_ui,
    altitud_m: { v: initialRaw.altitud_m, hace_seg: 0.0, history: altHist },
    velocidad_vertical_ms: { v: initialRaw.velocidad_vertical_ms, hace_seg: 0.0, history: velHist },
    t_vuelo_seg: { v: initialRaw.t_vuelo_seg, hace_seg: 0.0 },
    // cabeceo_deg, balanceo_deg, giro_yaw_deg → leer de useOrientacion3DMqtt
    sd_card_status: initialRaw.sd_card_status
  };
}

export function useMisionMqtt() {
  const [data, setData] = useState(buildInitialData);
  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(Date.now());

  useEffect(() => {
    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);
      const packetTime = Date.now();

      if (packet.received && packet.crc_valido && packet.data) {
        setLastValidPacketTime(packetTime);
        const d = packet.data;

        setData(prev => {
          // Update altitud history
          const prevAltHist = prev.altitud_m.history || [];
          const newAltHist = [...prevAltHist, { value: d.altitud_m.v, timestamp: packetTime }];
          if (newAltHist.length > HISTORY_SIZE) newAltHist.shift();

          // Update velocidad history
          const prevVelHist = prev.velocidad_vertical_ms.history || [];
          const newVelHist = [...prevVelHist, { value: d.velocidad_vertical_ms.v, timestamp: packetTime }];
          if (newVelHist.length > HISTORY_SIZE) newVelHist.shift();

          return {
            fase_cdr: d.fase_cdr,
            fase_cdr_index: d.fase_cdr_index,
            fase_ui: d.fase_ui,
            altitud_m: { v: d.altitud_m.v, hace_seg: d.altitud_m.hace_seg, history: newAltHist },
            velocidad_vertical_ms: { v: d.velocidad_vertical_ms.v, hace_seg: d.velocidad_vertical_ms.hace_seg, history: newVelHist },
            t_vuelo_seg: { v: d.t_vuelo_seg.v, hace_seg: d.t_vuelo_seg.hace_seg },
            // cabeceo_deg, balanceo_deg, giro_yaw_deg → leer de useOrientacion3DMqtt
            sd_card_status: d.sd_card_status
          };
        });
      }
    };

    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);
    return () => unsubscribe();
  }, []);

  return {
    data,
    faseUI: data.fase_ui,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
