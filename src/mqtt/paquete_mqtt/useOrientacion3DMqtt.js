import { useState, useEffect } from 'react';
import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/orientacion3d';
const HISTORY_SIZE = 30;

function buildInitialData() {
  const now = Date.now();
  const makeHist = (baseVal, spread) => {
    const list = [];
    for (let i = 0; i < HISTORY_SIZE; i++) {
      list.push({
        value: baseVal + Math.sin(i * 0.2) * spread,
        timestamp: now - (HISTORY_SIZE - 1 - i) * 150
      });
    }
    return list;
  };

  return {
    cabeceo_deg: { v: 25.3, hace_seg: 0.0, history: makeHist(25.3, 5.0) },
    balanceo_deg: { v: -10.8, hace_seg: 0.0, history: makeHist(-10.8, 4.0) },
    giro_yaw_deg: { v: 175.1, hace_seg: 0.0, drift_acumulado: 2.1, history: makeHist(175.1, 8.0) },
    accel_x: { v: 0.12, hace_seg: 0.0, history: makeHist(0.12, 0.2) },
    accel_y: { v: 0.87, hace_seg: 0.0, history: makeHist(0.87, 0.25) },
    accel_z: { v: 9.81, hace_seg: 0.0, history: makeHist(9.81, 0.3) },
    gyro_x_dps: { v: 0.03, hace_seg: 0.0 },
    gyro_y_dps: { v: -0.12, hace_seg: 0.0 },
    gyro_z_dps: { v: 0.08, hace_seg: 0.0 },
    inercial_x: { v: 0.1, hace_seg: 0.0 },
    inercial_y: { v: 0.6, hace_seg: 0.0 },
    inercial_z: { v: 0.01, hace_seg: 0.0 }
  };
}

export function useOrientacion3DMqtt() {
  const [data, setData] = useState(buildInitialData);
  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(Date.now());

  useEffect(() => {
    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);
      const packetTime = Date.now();

      if (packet.data) {
        setLastValidPacketTime(packetTime);
        const d = packet.data;

        setData(prev => {
          const updateHist = (key, val) => {
            const prevHist = prev[key]?.history || [];
            const nextHist = [...prevHist, { value: val, timestamp: packetTime }];
            if (nextHist.length > HISTORY_SIZE) nextHist.shift();
            return nextHist;
          };

          return {
            cabeceo_deg: { v: d.cabeceo_deg.v, hace_seg: d.cabeceo_deg.hace_seg, history: updateHist('cabeceo_deg', d.cabeceo_deg.v) },
            balanceo_deg: { v: d.balanceo_deg.v, hace_seg: d.balanceo_deg.hace_seg, history: updateHist('balanceo_deg', d.balanceo_deg.v) },
            giro_yaw_deg: { v: d.giro_yaw_deg.v, hace_seg: d.giro_yaw_deg.hace_seg, drift_acumulado: d.giro_yaw_deg.drift_acumulado, history: updateHist('giro_yaw_deg', d.giro_yaw_deg.v) },
            accel_x: { v: d.accel_x.v, hace_seg: d.accel_x.hace_seg, history: updateHist('accel_x', d.accel_x.v) },
            accel_y: { v: d.accel_y.v, hace_seg: d.accel_y.hace_seg, history: updateHist('accel_y', d.accel_y.v) },
            accel_z: { v: d.accel_z.v, hace_seg: d.accel_z.hace_seg, history: updateHist('accel_z', d.accel_z.v) },
            gyro_x_dps: { v: d.gyro_x_dps.v, hace_seg: d.gyro_x_dps.hace_seg },
            gyro_y_dps: { v: d.gyro_y_dps.v, hace_seg: d.gyro_y_dps.hace_seg },
            gyro_z_dps: { v: d.gyro_z_dps.v, hace_seg: d.gyro_z_dps.hace_seg },
            inercial_x: { v: d.inercial_x ? d.inercial_x.v : 0, hace_seg: 0 },
            inercial_y: { v: d.inercial_y ? d.inercial_y.v : 0, hace_seg: 0 },
            inercial_z: { v: d.inercial_z ? d.inercial_z.v : 0, hace_seg: 0 }
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
