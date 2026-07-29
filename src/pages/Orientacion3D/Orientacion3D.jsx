import React, { useState, useEffect } from 'react';
import CubeSatModel from '../../components/3d/CubeSatModel';
import { useOrientacion3DMqtt } from '../../mqtt/paquete_mqtt/useOrientacion3DMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Orientacion3D.css';

export default function Orientacion3D() {
  const { data: orientData, isConnected } = useOrientacion3DMqtt();
  const [modo, setModo] = useState('AUTO'); // 'AUTO' | 'MANUAL'

  // Orientation states
  const [cabeceo, setCabeceo] = useState(orientData.cabeceo_deg.v);
  const [balanceo, setBalanceo] = useState(orientData.balanceo_deg.v);
  const [giro, setGiro] = useState(orientData.giro_yaw_deg.v);

  // Auto sync orientation from telemetry when in AUTO mode
  useEffect(() => {
    if (modo === 'AUTO') {
      setCabeceo(orientData.cabeceo_deg.v);
      setBalanceo(orientData.balanceo_deg.v);
      setGiro(orientData.giro_yaw_deg.v);
    }
  }, [orientData, modo]);

  // Convert angle range [-180, 180] to progress bar % width
  const getBarWidth = (val) => {
    const normalized = ((Number(val) + 180) / 360) * 100;
    return `${Math.max(0, Math.min(100, normalized))}%`;
  };

  const driftVal = orientData.giro_yaw_deg.drift_acumulado || 0.0;

  return (
    <div className={`orientacion3d-view ${!isConnected ? 'view-stale' : ''}`}>

      {/* Top 2-Column Section: 3D Visor + Control Panel */}
      <div className="orientacion3d-top-layout">
        {/* Columna Izquierda: Visor 3D */}
        <section className="visor-column">
          <h3 className="visor-title">
            <i className="fa-solid fa-cube" style={{ marginRight: '8px', color: '#4fc3f7' }}></i>
            Orientación 3D en Tiempo Real (MPU6050)
          </h3>
          <div className="visor-container-frame">
            <div className="corner-tl"></div>
            <div className="corner-tr"></div>
            <div className="corner-bl"></div>
            <div className="corner-br"></div>
            <div className="visor-canvas-wrapper">
              <CubeSatModel
                cabeceo={cabeceo}
                balanceo={balanceo}
                giro={giro}
                modo={modo}
                onAutoUpdate={(c, b, g) => {
                  if (modo === 'MANUAL') {
                    setCabeceo(c);
                    setBalanceo(b);
                    setGiro(g);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Columna Derecha: Controles y Datos */}
        <section className="controls-column">

          {/* Euler Angles */}
          <div className="panel-card euler-panel premium-card-hover" style={{ '--card-color': '#ef5350' }}>
            <h4 className="panel-header">Euler Angles</h4>

            <div className="euler-row">
              <span className="euler-label">Cabeceo:</span>
              <div className="euler-bar-track">
                <div className="euler-bar red-fill" style={{ width: getBarWidth(cabeceo) }}></div>
              </div>
              <span className="euler-value">{Number(cabeceo).toFixed(1)}°</span>
            </div>

            <div className="euler-row">
              <span className="euler-label">Balanceo:</span>
              <div className="euler-bar-track">
                <div className="euler-bar green-fill" style={{ width: getBarWidth(balanceo) }}></div>
              </div>
              <span className="euler-value">{Number(balanceo).toFixed(1)}°</span>
            </div>

            <div className="euler-row">
              <span className="euler-label">Giro (Yaw):</span>
              <div className="euler-bar-track">
                <div className="euler-bar blue-fill" style={{ width: getBarWidth(giro) }}></div>
              </div>
              <span className="euler-value">{Number(giro).toFixed(1)}°</span>
            </div>
            {/* CDR Corrección 4: Indicador de deriva */}
            <div className="drift-badge-small" title="Ángulo integrado de gyro_z sin magnetómetro. Deriva acumulada.">
              ⚠ Giro estimado (deriva: +{driftVal.toFixed(1)}°)
            </div>
          </div>

          {/* Datos de Movimiento (CDR Corrección 1: NO Campo Magnético) */}
          <div className="panel-card movement-panel premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
            <h4 className="panel-header">Datos de Movimiento (MPU6050)</h4>

            <div className="sensor-category">Acelerómetro (m/s²):</div>
            <div className="sensor-grid">
              <div className="sensor-box"><span>X</span><span>{orientData.accel_x.v.toFixed(2)}</span></div>
              <div className="sensor-box"><span>Y</span><span>{orientData.accel_y.v.toFixed(2)}</span></div>
              <div className="sensor-box"><span>Z</span><span>{orientData.accel_z.v.toFixed(2)}</span></div>
            </div>

            <div className="sensor-category">Giroscopio (°/s):</div>
            <div className="sensor-grid">
              <div className="sensor-box"><span>X</span><span>{orientData.gyro_x_dps.v.toFixed(2)}</span></div>
              <div className="sensor-box"><span>Y</span><span>{orientData.gyro_y_dps.v.toFixed(2)}</span></div>
              <div className="sensor-box"><span>Z</span><span>{orientData.gyro_z_dps.v.toFixed(2)}</span></div>
            </div>

            <div className="sensor-category">Fuerza Inercial Derivada (m/s²):</div>
            <div className="sensor-grid">
              <div className="sensor-box"><span>X</span><span>{orientData.inercial_x.v.toFixed(2)}</span></div>
              <div className="sensor-box"><span>Y</span><span>{orientData.inercial_y.v.toFixed(2)}</span></div>
              <div className="sensor-box"><span>Z</span><span>{orientData.inercial_z.v.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Manual Control */}
          <div className="panel-card manual-panel premium-card-hover" style={{ '--card-color': '#ffb74d' }}>
            <h4 className="panel-header">Manual Control</h4>

            <div className="slider-row">
              <span className="slider-label">Cabeceo:</span>
              <input
                type="range" min="-180" max="180"
                value={cabeceo}
                onChange={(e) => setCabeceo(Number(e.target.value))}
                disabled={modo === 'AUTO'}
                className="styled-slider"
              />
            </div>
            <div className="slider-row">
              <span className="slider-label">Balanceo:</span>
              <input
                type="range" min="-180" max="180"
                value={balanceo}
                onChange={(e) => setBalanceo(Number(e.target.value))}
                disabled={modo === 'AUTO'}
                className="styled-slider"
              />
            </div>
            <div className="slider-row">
              <span className="slider-label">Giro:</span>
              <input
                type="range" min="-180" max="180"
                value={giro}
                onChange={(e) => setGiro(Number(e.target.value))}
                disabled={modo === 'AUTO'}
                className="styled-slider"
              />
            </div>
          </div>

          {/* Simulation Mode */}
          <div className="panel-card mode-panel premium-card-hover" style={{ '--card-color': '#66bb6a' }}>
            <h4 className="panel-header">Modo de Simulación</h4>
            <div className="mode-buttons-row">
              <button
                className={`mode-btn ${modo === 'AUTO' ? 'active-auto' : ''}`}
                onClick={() => setModo('AUTO')}
              >
                AUTO IMU
              </button>
              <button
                className={`mode-btn ${modo === 'MANUAL' ? 'active-manual' : ''}`}
                onClick={() => setModo('MANUAL')}
              >
                MANUAL
              </button>
            </div>
          </div>

        </section>
      </div>

      {/* Bottom Real-time Charts Section: Euler Angles (3 cols) */}
      <section className="panel-card premium-card-hover" style={{ '--card-color': '#ef5350' }}>
        <h3 className="panel-header">
          <i className="fa-solid fa-chart-line" style={{ marginRight: '8px', color: '#ef5350' }}></i>
          HISTORIAL DE ÁNGULOS EULER EN TIEMPO REAL (°)
        </h3>
        <div className="charts-grid-3col" style={{ marginTop: '8px' }}>
          <div className="chart-card-small">
            <span className="sensor-category" style={{ color: '#ef5350' }}>Cabeceo (Pitch)</span>
            <div style={{ height: '140px' }}>
              <SensorChart
                data={(orientData.cabeceo_deg.history || []).map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#ef5350"
                yMin={-180}
                yMax={180}
                unit="°"
                decimals={1}
              />
            </div>
          </div>

          <div className="chart-card-small">
            <span className="sensor-category" style={{ color: '#66bb6a' }}>Balanceo (Roll)</span>
            <div style={{ height: '140px' }}>
              <SensorChart
                data={(orientData.balanceo_deg.history || []).map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#66bb6a"
                yMin={-180}
                yMax={180}
                unit="°"
                decimals={1}
              />
            </div>
          </div>

          <div className="chart-card-small">
            <span className="sensor-category" style={{ color: '#4fc3f7' }}>Giro (Yaw - Derivado)</span>
            <div style={{ height: '140px' }}>
              <SensorChart
                data={(orientData.giro_yaw_deg.history || []).map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#4fc3f7"
                yMin={0}
                yMax={360}
                unit="°"
                decimals={1}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Real-time Charts Section: Accelerometer 3 Axis (3 cols) */}
      <section className="panel-card premium-card-hover" style={{ '--card-color': '#66bb6a' }}>
        <h3 className="panel-header">
          <i className="fa-solid fa-gauge-high" style={{ marginRight: '8px', color: '#66bb6a' }}></i>
          HISTORIAL DE ACELERÓMETRO MPU6050 (m/s²)
        </h3>
        <div className="charts-grid-3col" style={{ marginTop: '8px' }}>
          <div className="chart-card-small">
            <span className="sensor-category" style={{ color: '#ef5350' }}>Acelerómetro X</span>
            <div style={{ height: '140px' }}>
              <SensorChart
                data={(orientData.accel_x.history || []).map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#ef5350"
                yMin={-15}
                yMax={15}
                unit="m/s²"
                decimals={2}
              />
            </div>
          </div>

          <div className="chart-card-small">
            <span className="sensor-category" style={{ color: '#ffca28' }}>Acelerómetro Y</span>
            <div style={{ height: '140px' }}>
              <SensorChart
                data={(orientData.accel_y.history || []).map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#ffca28"
                yMin={-15}
                yMax={15}
                unit="m/s²"
                decimals={2}
              />
            </div>
          </div>

          <div className="chart-card-small">
            <span className="sensor-category" style={{ color: '#66bb6a' }}>Acelerómetro Z</span>
            <div style={{ height: '140px' }}>
              <SensorChart
                data={(orientData.accel_z.history || []).map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#66bb6a"
                yMin={-15}
                yMax={15}
                unit="m/s²"
                decimals={2}
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
