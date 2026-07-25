import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Ubicacion.css';

// Launch constants for geodetic reference
const LAUNCH_LAT = -12.4300;
const LAUNCH_LON = -77.2100;

export default function Ubicacion() {
  const { data, lastPacketId } = useUbicacionMqtt();

  // 1. LAT/LON → Relative Meters Conversion (Launch pad at 0,0)
  const latVal = data.latitud.v;
  const lonVal = data.longitud.v;

  const cosLat0 = Math.cos(LAUNCH_LAT * Math.PI / 180);
  const Y_METERS_PER_DEG = 110540;
  const X_METERS_PER_DEG = 111320 * cosLat0;

  // Current position in meters relative to launch pad
  const currentX = (lonVal - LAUNCH_LON) * X_METERS_PER_DEG;
  const currentY = (latVal - LAUNCH_LAT) * Y_METERS_PER_DEG;

  // Map history to meters
  const latHist = data.latitud.history || [];
  const lonHist = data.longitud.history || [];
  
  const historyMeters = latHist.map((pt, idx) => {
    const lat = pt.value;
    const lon = lonHist[idx]?.value ?? LAUNCH_LON;
    return {
      x: (lon - LAUNCH_LON) * X_METERS_PER_DEG,
      y: (lat - LAUNCH_LAT) * Y_METERS_PER_DEG
    };
  });

  // Calculate dynamic axis range scale (symmetrical 1:1 aspect ratio)
  // Auto-zooms strictly around launch origin, flight trail, and current coordinates
  const allCoords = [
    { x: 0, y: 0 },
    { x: currentX, y: currentY },
    ...historyMeters
  ];
  
  const maxAbsCoord = Math.max(...allCoords.flatMap(pt => [Math.abs(pt.x), Math.abs(pt.y)]));
  const rangeLimit = Math.max(50, maxAbsCoord * 1.25); // At least 50 meters, plus 25% margin

  // Viewport coordinate mapping function: maps meters to [20, 180] inside a viewBox of 0-200
  // Center is (100, 100), layout radius is 80 units
  const scale = 80 / rangeLimit;
  
  const mapToSvg = (x, y) => {
    const svgX = 100 + x * scale;
    const svgY = 100 - y * scale; // invert Y since SVG goes downwards
    return { x: svgX, y: svgY };
  };

  // Convert current coordinates to SVG viewBox coords
  const svgCurrent = mapToSvg(currentX, currentY);

  // Build trail polyline coordinates
  const trailPoints = historyMeters
    .map(pt => {
      const mapped = mapToSvg(pt.x, pt.y);
      return `${mapped.x.toFixed(1)},${mapped.y.toFixed(1)}`;
    })
    .join(' ');

  const isStale = data.latitud.stale;

  // 2. Dynamic Y-Axis scale for Altitud GPS
  const altHist = data.altitud_gps.history || [];
  const altVals = altHist.map(pt => pt.value);
  const maxAltInHist = altVals.length > 0 ? Math.max(...altVals) : 0;
  const altEffectiveMax = Math.max(200, maxAltInHist * 1.15); // min 200m
  const maxAltLabel = Math.max(200.0, maxAltInHist).toFixed(1);

  // 3. Dynamic Y-Axis scale for Distancia al Origen
  const distHist = data.distancia_origen.history || [];
  const distVals = distHist.map(pt => pt.value);
  const maxDistInHist = distVals.length > 0 ? Math.max(...distVals) : 0;
  const distEffectiveMax = Math.max(200, maxDistInHist * 1.15); // min 200m
  const maxDistLabel = Math.max(118.0, maxDistInHist).toFixed(1);

  // 4. GPS signal bars active count
  const activeBars = data.calidad_senal.v;

  // 5. Vertical speed indicator and class
  const verticalSpeed = data.velocidad_vertical.v;
  const isAscending = verticalSpeed > 0.05;
  const isDescending = verticalSpeed < -0.05;
  const speedLabel = isAscending
    ? `+${verticalSpeed.toFixed(1)} m/s`
    : isDescending
    ? `${verticalSpeed.toFixed(1)} m/s`
    : '0.0 m/s';
  const speedClass = isAscending ? 'text-orange' : isDescending ? 'text-cyan' : 'text-green';

  return (
    <div className={`ubicacion-view ${isStale ? 'view-stale' : ''}`}>

      {/* ── FILA 1: Trayectoria Relativa al Lanzamiento ── */}
      <section className="ubi-row ubi-row--map">
        <div className="map-panel premium-card-hover" style={{ '--card-color': '#2196f3' }}>
          <div className="map-grid-bg map-grid-bg--cartesian">
            
            <div className="cartesian-plot-container">
              {/* SVG 4-Quadrant Cartesian Scatter Plot */}
              <svg className="cartesian-svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
                
                {/* 1. Radar concentric circle grid lines (at 33%, 66% and 100% of scale) */}
                <circle cx="100" cy="100" r={rangeLimit * 0.33 * scale} fill="none" stroke="#1f262e" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="100" cy="100" r={rangeLimit * 0.66 * scale} fill="none" stroke="#1f262e" strokeWidth="0.5" strokeDasharray="2 2"/>
                <circle cx="100" cy="100" r={rangeLimit * scale} fill="none" stroke="#1f262e" strokeWidth="0.7"/>

                {/* 2. Main Ejes Cartesianos */}
                <line x1="15" y1="100" x2="185" y2="100" stroke="#2e3844" strokeWidth="0.7"/>
                <line x1="100" y1="15" x2="100" y2="185" stroke="#2e3844" strokeWidth="0.7"/>

                {/* Diagonal rumbo guidelines (45°, 135°, 225°, 315°) */}
                <line x1="100" y1="100" x2="156.6" y2="43.4" stroke="#181e24" strokeWidth="0.5" strokeDasharray="1.5 1.5"/>
                <line x1="100" y1="100" x2="156.6" y2="156.6" stroke="#181e24" strokeWidth="0.5" strokeDasharray="1.5 1.5"/>
                <line x1="100" y1="100" x2="43.4" y2="156.6" stroke="#181e24" strokeWidth="0.5" strokeDasharray="1.5 1.5"/>
                <line x1="100" y1="100" x2="43.4" y2="43.4" stroke="#181e24" strokeWidth="0.5" strokeDasharray="1.5 1.5"/>

                {/* Direction Arrows */}
                <path d="M 185,100 L 181,98 L 181,102 Z" fill="#2e3844" />
                <path d="M 100,15 L 98,19 L 102,19 Z" fill="#2e3844" />

                {/* Edge direction labels */}
                <text x="100" y="11" fill="#4caf50" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">N</text>
                <text x="100" y="197" fill="#4caf50" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">S</text>
                <text x="195" y="103" fill="#4caf50" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">E</text>
                <text x="6" y="103" fill="#4caf50" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">O</text>

                {/* 3. Angular degree labels on outer ring */}
                <text x="100" y="21" fill="#4b5563" fontSize="5" fontFamily="monospace" textAnchor="middle">0°</text>
                <text x="160" y="41" fill="#4b5563" fontSize="4.5" fontFamily="monospace" textAnchor="middle">45°</text>
                <text x="176" y="97.5" fill="#4b5563" fontSize="5" fontFamily="monospace" textAnchor="middle">90°</text>
                <text x="160" y="164" fill="#4b5563" fontSize="4.5" fontFamily="monospace" textAnchor="middle">135°</text>
                <text x="100" y="184" fill="#4b5563" fontSize="5" fontFamily="monospace" textAnchor="middle">180°</text>
                <text x="40" y="164" fill="#4b5563" fontSize="4.5" fontFamily="monospace" textAnchor="middle">225°</text>
                <text x="24" y="97.5" fill="#4b5563" fontSize="5" fontFamily="monospace" textAnchor="middle">270°</text>
                <text x="40" y="41" fill="#4b5563" fontSize="4.5" fontFamily="monospace" textAnchor="middle">315°</text>

                {/* 4. Coordinate metric labels along positive/negative X & Y axes */}
                {/* Y Axis (North +) */}
                <text x="103" y={100 - (rangeLimit * 0.33 * scale) + 1.8} fill="#4b5563" fontSize="5.5" fontFamily="monospace">
                  +{(rangeLimit * 0.33).toFixed(0)}m
                </text>
                <text x="103" y={100 - (rangeLimit * 0.66 * scale) + 1.8} fill="#4b5563" fontSize="5.5" fontFamily="monospace">
                  +{(rangeLimit * 0.66).toFixed(0)}m
                </text>
                <text x="103" y={100 - (rangeLimit * scale) + 1.8} fill="#6b7280" fontSize="5.5" fontFamily="monospace" fontWeight="bold">
                  +{rangeLimit.toFixed(0)}m
                </text>

                {/* Y Axis (South -) */}
                <text x="103" y={100 + (rangeLimit * 0.33 * scale) + 1.8} fill="#4b5563" fontSize="5.5" fontFamily="monospace">
                  -{(rangeLimit * 0.33).toFixed(0)}m
                </text>
                <text x="103" y={100 + (rangeLimit * 0.66 * scale) + 1.8} fill="#4b5563" fontSize="5.5" fontFamily="monospace">
                  -{(rangeLimit * 0.66).toFixed(0)}m
                </text>
                <text x="103" y={100 + (rangeLimit * scale) + 1.8} fill="#6b7280" fontSize="5.5" fontFamily="monospace" fontWeight="bold">
                  -{rangeLimit.toFixed(0)}m
                </text>

                {/* X Axis (East +) */}
                <text x={100 + (rangeLimit * 0.33 * scale)} y="106.5" fill="#4b5563" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
                  +{(rangeLimit * 0.33).toFixed(0)}m
                </text>
                <text x={100 + (rangeLimit * 0.66 * scale)} y="106.5" fill="#4b5563" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
                  +{(rangeLimit * 0.66).toFixed(0)}m
                </text>
                <text x={100 + (rangeLimit * scale)} y="106.5" fill="#6b7280" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  +{rangeLimit.toFixed(0)}m
                </text>

                {/* X Axis (West -) */}
                <text x={100 - (rangeLimit * 0.33 * scale)} y="106.5" fill="#4b5563" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
                  -{(rangeLimit * 0.33).toFixed(0)}m
                </text>
                <text x={100 - (rangeLimit * 0.66 * scale)} y="106.5" fill="#4b5563" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
                  -{(rangeLimit * 0.66).toFixed(0)}m
                </text>
                <text x={100 - (rangeLimit * scale)} y="106.5" fill="#6b7280" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  -{rangeLimit.toFixed(0)}m
                </text>

                {/* 5. Launch site marker at center (0, 0) */}
                <circle cx="100" cy="100" r="3.2" fill="none" stroke="#2196f3" strokeWidth="1.2"/>
                <line x1="95" y1="100" x2="105" y2="100" stroke="#2196f3" strokeWidth="0.8"/>
                <line x1="100" y1="95" x2="100" y2="105" stroke="#2196f3" strokeWidth="0.8"/>
                <text x="96" y="112.5" fill="#2196f3" fontSize="5.5" fontFamily="monospace" fontWeight="bold">LAUNCH</text>

                {/* 6. Actual flight path trail polyline */}
                {trailPoints && (
                  <polyline
                    points={trailPoints}
                    fill="none"
                    stroke="#4caf50"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.85"
                  />
                )}
              </svg>

              {/* Dynamic trajectory trace marker as a perfect HTML circle */}
              <div
                className="map-marker-dot"
                style={{
                  left: `${(svgCurrent.x / 200) * 100}%`,
                  top: `${(svgCurrent.y / 200) * 100}%`,
                  backgroundColor: isStale ? '#ffa726' : '#4caf50'
                }}
              ></div>

              {/* Pulsing crosshair overlay at current coordinates */}
              <div
                className="radar-circle"
                style={{
                  left: `${(svgCurrent.x / 200) * 100}%`,
                  top: `${(svgCurrent.y / 200) * 100}%`
                }}
              >
                <i className="fa-solid fa-crosshairs fa-spin" style={{ color: isStale ? '#ffa726' : '#4caf50', fontSize: '15px' }}></i>
              </div>
            </div>
            
          </div>

          {/* Map footer: title + landing coords */}
          <div className="map-footer">
            <span className="map-title-label">
              <i className="fa-solid fa-route" style={{ marginRight: '6px', color: '#4fc3f7' }}></i>
              TRAYECTORIA RELATIVA AL LANZAMIENTO
            </span>
            <div className="map-footer-right">
              <div className="landing-coords-inline">
                <i className="fa-solid fa-flag-checkered" style={{ marginRight: '5px', color: '#4caf50' }}></i>
                <span className="landing-coords-label">ATERRIZAJE:</span>
                <span className="landing-coords-value">
                  {data.coordenadas_aterrizaje.lat.toFixed(4)}, {data.coordenadas_aterrizaje.lon.toFixed(4)}
                </span>
              </div>
              <span className="map-subtitle-label">
                Actualización cada {isStale ? '>2s' : '0.7s'} · {data.satelites.v} satélites visibles
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILA 2: Datos GPS | Señal GPS ── */}
      <section className="ubi-row ubi-row--two">

        {/* Datos GPS */}
        <div className="panel-card gps-data-panel premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <h4 className="ubi-panel-header">
            <i className="fa-solid fa-satellite" style={{ marginRight: '6px', color: '#4fc3f7' }}></i>
            DATOS GPS
          </h4>
          <table className="gps-table">
            <tbody>
              <tr><td>Latitud:</td><td className="gps-val">{data.latitud.v.toFixed(6)}</td></tr>
              <tr><td>Longitud:</td><td className="gps-val">{data.longitud.v.toFixed(6)}</td></tr>
              <tr><td>Altitud GPS:</td><td className="gps-val gps-hi">{data.altitud_gps.v.toFixed(1)} m</td></tr>
              <tr><td>Velocidad:</td><td className="gps-val">{data.velocidad_kmh.v.toFixed(1)} km/h</td></tr>
              <tr><td>Satélites:</td><td className="gps-val gps-ok">{data.satelites.v} visibles</td></tr>
              <tr><td>HDOP:</td><td className="gps-val gps-ok">{data.hdop.v.toFixed(1)} (Excelente)</td></tr>
              <tr><td>Fecha UTC:</td><td className="gps-val">{data.fecha_utc}</td></tr>
              <tr><td>Hora UTC:</td><td className="gps-val mono">{data.hora_utc}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Señal GPS */}
        <div className="panel-card signal-card premium-card-hover" style={{ '--card-color': '#4caf50' }}>
          <h4 className="ubi-panel-header">
            <i className="fa-solid fa-signal" style={{ marginRight: '6px', color: '#4caf50' }}></i>
            SEÑAL GPS
          </h4>
          <div className="panel-main-value">
            <span className="big-value">{activeBars}</span>
            <span className="big-unit">/ 10</span>
          </div>
          <div className="signal-bars-area">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`signal-bar bar-${i + 1} ${i < activeBars ? 'active' : ''}`}
              ></div>
            ))}
          </div>
          <div className="signal-scale">
            <span>Débil</span><span></span><span></span><span></span><span>Excelente</span>
          </div>
          {/* HDOP y CALIDAD */}
          <div className="panel-footer-stats" style={{ marginTop: '10px' }}>
            <div><span className="stat-label">HDOP</span><span className="stat-value text-green">{data.hdop.v.toFixed(1)}</span></div>
            <div>
              <span className="stat-label">CALIDAD</span>
              <span className="stat-value text-green">
                {activeBars >= 8 ? 'EXCELENTE' : activeBars >= 5 ? 'MODERADA' : 'DEBIL'}
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* ── FILA 3: Altitud GPS | Distancia al Origen ── */}
      <section className="ubi-row ubi-row--two">

        {/* Altitud GPS */}
        <div className="panel-card altitud-card premium-card-hover" style={{ '--card-color': '#ff9800' }}>
          <h4 className="ubi-panel-header">ALTITUD GPS</h4>
          <div className="panel-main-value">
            <span className="big-value">{data.altitud_gps.v.toFixed(0)}</span>
            <span className="big-unit">m</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: '4px', marginBottom: '8px' }}>
            {altHist.length > 0 && (
              <SensorChart
                data={altHist.map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#ff9800"
                yMin={0}
                yMax={altEffectiveMax}
                unit="m"
                decimals={1}
              />
            )}
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">MÁX VUELO</span><span className="stat-value text-orange">{maxAltLabel} m</span></div>
            <div>
              <span className="stat-label">VELOCIDAD</span>
              <span className={`stat-value ${speedClass}`}>{speedLabel}</span>
            </div>
            <div><span className="stat-label">LÍMITE</span><span className="stat-value">200 m</span></div>
          </div>
        </div>

        {/* Distancia al Origen */}
        <div className="panel-card distancia-card premium-card-hover" style={{ '--card-color': '#03a9f4' }}>
          <h4 className="ubi-panel-header">DISTANCIA AL ORIGEN</h4>
          <div className="panel-main-value">
            <span className="big-value">{data.distancia_origen.v.toFixed(0)}</span>
            <span className="big-unit">m</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: '4px', marginBottom: '8px' }}>
            {distHist.length > 0 && (
              <SensorChart
                data={distHist.map(pt => ({
                  value: pt.value,
                  tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                }))}
                color="#03a9f4"
                yMin={0}
                yMax={distEffectiveMax}
                unit="m"
                decimals={1}
              />
            )}
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">MÁX DIST.</span><span className="stat-value text-cyan">{maxDistLabel} m</span></div>
            <div><span className="stat-label">VELOCIDAD</span><span className="stat-value">{data.velocidad_kmh.v.toFixed(1)} km/h</span></div>
            <div><span className="stat-label">RADIO MAX</span><span className="stat-value">500 m</span></div>
          </div>
        </div>

      </section>
    </div>
  );
}
