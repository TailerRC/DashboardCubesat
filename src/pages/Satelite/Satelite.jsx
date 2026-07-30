import { useSateliteMqtt } from '../../mqtt/paquete_mqtt/useSateliteMqtt';
import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import { useOrientacion3DMqtt } from '../../mqtt/paquete_mqtt/useOrientacion3DMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Satelite.css';

export default function Satelite() {
  const { data: satData, isConnected: satConnected } = useSateliteMqtt();
  const { data: ubiData } = useUbicacionMqtt();
  // accel_x/y/z vienen del tópico orientacion3d (fuente única: MPU6050)
  const { data: orientData } = useOrientacion3DMqtt();

  // 1. Voltaje Batería
  const voltVal = satData.voltaje_v.v;
  // Battery operating range: 9.6V (depleted) to 12.8V (fully charged)
  const voltPct = Math.max(0, Math.min(100, ((voltVal - 9.6) / (12.8 - 9.6)) * 100));
  const voltHistory = satData.voltaje_v.history || [];
  const voltVals = voltHistory.map(h => h.value);
  const minVoltVal = voltVals.length > 0 ? Math.min(...voltVals) : voltVal;
  const voltDrop = voltVal - 12.80;

  // 2. Corriente
  const currVal = satData.corriente_ma.v;
  const currPct = Math.max(0, Math.min(100, (currVal / 900) * 100));
  const currHistory = satData.corriente_ma.history || [];
  const currVals = currHistory.map(h => h.value);
  const maxCurrVal = currVals.length > 0 ? Math.max(...currVals) : currVal;

  // 3. Consumo Energía
  const consVal = satData.consumo_w.v;
  const consPct = Math.max(0, Math.min(100, (consVal / 10.0) * 100));
  const consHistory = satData.consumo_w.history || [];
  const consVals = consHistory.map(h => h.value);
  const maxConsVal = consVals.length > 0 ? Math.max(...consVals) : consVal;

  // 4. Acelerómetro — fuente: orientacion3d (MPU6050, tópico único)
  const accelX = orientData.accel_x.v;
  const accelY = orientData.accel_y.v;
  const accelZ = orientData.accel_z.v;

  const getSliderLeft = (val) => {
    return Math.max(0, Math.min(100, ((val + 20) / 40) * 100)) + '%';
  };

  // 5. Estado del Sistema
  const actSensors = satData.sensores_activos.v;
  const totalSensors = satData.sensores_activos.total || 7;
  const tempMcu = satData.temp_mcu.v;
  const flashOk = satData.memoria_flash_ok.v;
  
  // Re-use GPS fix data from useUbicacionMqtt to prevent duplication
  const satsCount = ubiData.satelites.v;
  const hasGpsFix = satsCount >= 4;
  const gpsFixText = hasGpsFix ? `3D FIX · ${satsCount} sat.` : 'NO FIX';

  // Format uptime counter
  const uptimeSecs = satData.tiempo_encendido_seg.v;
  const formatUptime = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className={`satelite-view ${!satConnected ? 'view-stale' : ''}`}>

      {/* ── Top Grid: 3 Power Gauges ── */}
      <section className="satelite-top-grid">

        {/* Voltaje Batería */}
        <div className="satelite-card premium-card-hover" style={{ '--card-color': '#ef5350' }}>
          <h4 className="card-header text-center">VOLTAJE BATERÍA</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge red-gauge" style={{ background: `conic-gradient(#ef5350 ${voltPct}%, #2a3038 ${voltPct}%)` }}>
              <span className="value">{voltVal.toFixed(2)}</span>
              <span className="unit">Voltios</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Inicial</span><span className="stat-val text-red">12.80 V</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-red">{voltVal.toFixed(2)} V</span></div>
            <div><span className="stat-lbl">Mínimo</span><span className="stat-val">{minVoltVal.toFixed(2)} V</span></div>
            <div><span className="stat-lbl">Caída</span><span className="stat-val text-yellow">{voltDrop.toFixed(2)} V</span></div>
          </div>
          <div className="card-note">
            <i className="fa-solid fa-circle-info text-red" style={{ marginRight: '5px' }}></i>
            Rango seguro: 11.5 V – 12.8 V. Descarga crítica: 9.6 V.
          </div>
          <div style={{ height: '190px', display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
            <SensorChart
              data={voltHistory.map(pt => ({
                value: pt.value,
                tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
              }))}
              color="#ef5350"
              yMin={11.0}
              yMax={13.0}
              unit="V"
              decimals={2}
            />
          </div>
        </div>

        {/* Corriente */}
        <div className="satelite-card premium-card-hover" style={{ '--card-color': '#42a5f5' }}>
          <h4 className="card-header text-center">CORRIENTE</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge blue-gauge" style={{ background: `conic-gradient(#42a5f5 ${currPct}%, #2a3038 ${currPct}%)` }}>
              <span className="value">{currVal.toFixed(1)}</span>
              <span className="unit">mA</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Base</span><span className="stat-val text-blue">380 mA</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-blue">{currVal.toFixed(1)} mA</span></div>
            <div><span className="stat-lbl">Pico Máx</span><span className="stat-val">{maxCurrVal.toFixed(1)} mA</span></div>
            <div><span className="stat-lbl">Límite</span><span className="stat-val">900 mA</span></div>
          </div>
          <div className="card-note">
            <i className="fa-solid fa-circle-info text-blue" style={{ marginRight: '5px' }}></i>
            Transmisión activa: ~450 mA. EPS protección: 900 mA.
          </div>
          <div style={{ height: '190px', display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
            <SensorChart
              data={currHistory.map(pt => ({
                value: pt.value,
                tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
              }))}
              color="#42a5f5"
              yMin={0}
              yMax={900}
              unit="mA"
              decimals={1}
            />
          </div>
        </div>

        {/* Consumo Energía */}
        <div className="satelite-card premium-card-hover" style={{ '--card-color': '#ba68c8' }}>
          <h4 className="card-header text-center">CONSUMO ENERGÍA</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge purple-gauge" style={{ background: `conic-gradient(#ba68c8 ${consPct}%, #2a3038 ${consPct}%)` }}>
              <span className="value">{consVal.toFixed(2)}</span>
              <span className="unit">Watts</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Base</span><span className="stat-val">4.5 W</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-purple">{consVal.toFixed(2)} W</span></div>
            <div><span className="stat-lbl">Pico Máx</span><span className="stat-val">{maxConsVal.toFixed(2)} W</span></div>
            <div><span className="stat-lbl">Límite</span><span className="stat-val">10 W</span></div>
          </div>
          <div className="card-note">
            <i className="fa-solid fa-circle-info text-purple" style={{ marginRight: '5px' }}></i>
            Disipación de potencia: EPS térmica límite a 10 W.
          </div>
          <div style={{ height: '190px', display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
            <SensorChart
              data={consHistory.map(pt => ({
                value: pt.value,
                tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
              }))}
              color="#ba68c8"
              yMin={0.0}
              yMax={10.0}
              unit="W"
              decimals={2}
            />
          </div>
        </div>

      </section>

      {/* ── Bottom Grid: Aceleración + Estado ── */}
      <section className="satelite-bottom-grid">

        {/* Aceleración 3 ejes */}
        <div className="satelite-card premium-card-hover" style={{ '--card-color': '#66bb6a' }}>
          <h4 className="card-header text-center">ACELERÓMETRO 3 EJES (m/s²)</h4>
          <div className="accel-container">
            {/* X axis */}
            <div className="accel-row">
              <span className="accel-label text-red">X</span>
              <div className="accel-gauge-wrapper">
                <div className="accel-track-row">
                  <div className="accel-slider-track">
                    <div className="accel-indicator" style={{ left: getSliderLeft(accelX), backgroundColor: '#ef5350' }}></div>
                  </div>
                  <span className="accel-status-text">{accelX >= 0 ? '+' : ''}{accelX.toFixed(1)} m/s²</span>
                </div>
                <div className="accel-ticks">
                  <span>−20</span><span>−10</span><span>0</span><span>+10</span><span>+20</span>
                </div>
              </div>
            </div>
            {/* Y axis */}
            <div className="accel-row">
              <span className="accel-label text-yellow">Y</span>
              <div className="accel-gauge-wrapper">
                <div className="accel-track-row">
                  <div className="accel-slider-track">
                    <div className="accel-indicator" style={{ left: getSliderLeft(accelY), backgroundColor: '#ffca28' }}></div>
                  </div>
                  <span className="accel-status-text">{accelY >= 0 ? '+' : ''}{accelY.toFixed(1)} m/s²</span>
                </div>
                <div className="accel-ticks">
                  <span>−20</span><span>−10</span><span>0</span><span>+10</span><span>+20</span>
                </div>
              </div>
            </div>
            {/* Z axis */}
            <div className="accel-row">
              <span className="accel-label text-green">Z</span>
              <div className="accel-gauge-wrapper">
                <div className="accel-track-row">
                  <div className="accel-slider-track">
                    <div className="accel-indicator" style={{ left: getSliderLeft(accelZ), backgroundColor: '#66bb6a' }}></div>
                  </div>
                  <span className="accel-status-text">{accelZ >= 0 ? '+' : ''}{accelZ.toFixed(1)} m/s²</span>
                </div>
                <div className="accel-ticks">
                  <span>−20</span><span>−10</span><span>0</span><span>+10</span><span>+20</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="satelite-card premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <h4 className="card-header text-center">ESTADO DEL SISTEMA</h4>
          <div className="system-status-list">
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-microchip fa-fw" style={{color:'#4fc3f7', marginRight:'6px'}}></i>Sensores Activos</span>
              <span className="sys-value text-green">{actSensors} / {totalSensors}</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-temperature-half fa-fw" style={{color:'#ff7043', marginRight:'6px'}}></i>Temperatura MCU</span>
              <span className="sys-value">{tempMcu.toFixed(1)} °C</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-memory fa-fw" style={{color:'#66bb6a', marginRight:'6px'}}></i>Memoria Flash</span>
              <span className="sys-value text-green">{flashOk ? 'OK' : 'ERROR'}</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-microchip fa-fw" style={{color:'#4fc3f7', marginRight:'6px'}}></i>Procesador OBC (ESP32)</span>
              <span className="sys-value text-green">ONLINE · 240MHz</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-satellite fa-fw" style={{color:'#4fc3f7', marginRight:'6px'}}></i>GPS Fix</span>
              <span className={`sys-value ${hasGpsFix ? 'text-green' : 'text-red'}`}>{gpsFixText}</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-clock fa-fw" style={{color:'#ab47bc', marginRight:'6px'}}></i>Tiempo Encendido</span>
              <span className="sys-value">{formatUptime(uptimeSecs)}</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
