import { useState, useEffect } from 'react';
import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/orientacion3d';
const HISTORY_SIZE = 30;

export function useOrientacion3DMqtt() {
  const [data, setData] = useState(() => {
    return {
      cabeceo_deg: { v: 0, hace_seg: 0.0, history: [] },
      balanceo_deg: { v: 0, hace_seg: 0.0, history: [] },
      giro_yaw_deg: { v: 0, hace_seg: 0.0, drift_acumulado: 0, history: [] },
      accel_x: { v: 0, hace_seg: 0.0, history: [] },
      accel_y: { v: 0, hace_seg: 0.0, history: [] },
      accel_z: { v: 0, hace_seg: 0.0, history: [] },
      gyro_x_dps: { v: 0, hace_seg: 0.0 },
      gyro_y_dps: { v: 0, hace_seg: 0.0 },
      gyro_z_dps: { v: 0, hace_seg: 0.0 },
      inercial_x: { v: 0, hace_seg: 0.0 },
      inercial_y: { v: 0, hace_seg: 0.0 },
      inercial_z: { v: 0, hace_seg: 0.0 }
    };
  });
  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  useEffect(() => {
    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);
      const packetTime = Date.now();

      if (packet.data) {
        setLastValidPacketTime(packetTime);
        const d = packet.data;

        setData(prev => {
          const getVal = (key) => (d && d[key] && typeof d[key] === 'object' && d[key].v !== undefined && d[key].v !== null)
            ? d[key].v
            : (typeof d[key] === 'number' ? d[key] : (prev[key]?.v ?? 0));

          const getSeg = (key) => (d && d[key] && typeof d[key] === 'object' && d[key].hace_seg !== undefined && d[key].hace_seg !== null)
            ? d[key].hace_seg
            : (prev[key]?.hace_seg ?? 0);

          const updateHist = (key, val) => {
            const prevHist = prev[key]?.history || [];
            const nextHist = [...prevHist, { value: val, timestamp: packetTime }];
            if (nextHist.length > HISTORY_SIZE) nextHist.shift();
            return nextHist;
          };

          return {
            cabeceo_deg: { v: getVal('cabeceo_deg'), hace_seg: getSeg('cabeceo_deg'), history: updateHist('cabeceo_deg', getVal('cabeceo_deg')) },
            balanceo_deg: { v: getVal('balanceo_deg'), hace_seg: getSeg('balanceo_deg'), history: updateHist('balanceo_deg', getVal('balanceo_deg')) },
            giro_yaw_deg: { v: getVal('giro_yaw_deg'), hace_seg: getSeg('giro_yaw_deg'), drift_acumulado: d.giro_yaw_deg?.drift_acumulado ?? prev.giro_yaw_deg.drift_acumulado, history: updateHist('giro_yaw_deg', getVal('giro_yaw_deg')) },
            accel_x: { v: getVal('accel_x'), hace_seg: getSeg('accel_x'), history: updateHist('accel_x', getVal('accel_x')) },
            accel_y: { v: getVal('accel_y'), hace_seg: getSeg('accel_y'), history: updateHist('accel_y', getVal('accel_y')) },
            accel_z: { v: getVal('accel_z'), hace_seg: getSeg('accel_z'), history: updateHist('accel_z', getVal('accel_z')) },
            gyro_x_dps: { v: getVal('gyro_x_dps'), hace_seg: getSeg('gyro_x_dps') },
            gyro_y_dps: { v: getVal('gyro_y_dps'), hace_seg: getSeg('gyro_y_dps') },
            gyro_z_dps: { v: getVal('gyro_z_dps'), hace_seg: getSeg('gyro_z_dps') },
            inercial_x: { v: getVal('inercial_x'), hace_seg: getSeg('inercial_x') },
            inercial_y: { v: getVal('inercial_y'), hace_seg: getSeg('inercial_y') },
            inercial_z: { v: getVal('inercial_z'), hace_seg: getSeg('inercial_z') }
          };
        });
      }
    };

    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);
    return () => unsubscribe();
  }, []);

  return {
    data,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
