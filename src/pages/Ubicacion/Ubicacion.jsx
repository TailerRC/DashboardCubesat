import { useEffect, useRef } from 'react';
import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Ubicacion.css';

// Launch constants for geodetic reference (San Miguel, Lima)
const LAUNCH_LAT = -12.0850;
const LAUNCH_LON = -77.0900;

export default function Ubicacion() {
  const { data, lastPacketId } = useUbicacionMqtt();

  const isStale = data.latitud.stale;

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);

  // Custom satellite icon for Leaflet using FontAwesome
  const satelliteIcon = L.divIcon({
    html: `
      <div class="leaflet-satellite-marker">
        <i class="fa-solid fa-satellite"></i>
        <span class="pulse-ring"></span>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    const rawLat = data?.latitud?.v;
    const rawLon = data?.longitud?.v;
    const initialLat = (rawLat !== null && rawLat !== undefined && rawLat !== 0) ? rawLat : LAUNCH_LAT;
    const initialLon = (rawLon !== null && rawLon !== undefined && rawLon !== 0) ? rawLon : LAUNCH_LON;

    // Center on telemetry location
    const map = L.map(mapRef.current, {
      center: [initialLat, initialLon],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Current location marker
    const marker = L.marker([initialLat, initialLon], { icon: satelliteIcon })
      .addTo(map)
      .bindPopup('<b>Cubesat CEMPAI</b><br>GPS: u-blox NEO-7M<br>Estableciendo señal...');

    // Path trail line
    const polyline = L.polyline([], {
      color: '#00e676',
      weight: 3,
      opacity: 0.85
    }).addTo(map);

    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);

    mapInstanceRef.current = map;
    markerRef.current = marker;
    polylineRef.current = polyline;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  // Update marker and trail position
  useEffect(() => {
    const rawLat = data?.latitud?.v;
    const rawLon = data?.longitud?.v;
    const lat = (rawLat !== null && rawLat !== undefined && rawLat !== 0) ? rawLat : LAUNCH_LAT;
    const lon = (rawLon !== null && rawLon !== undefined && rawLon !== 0) ? rawLon : LAUNCH_LON;

    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    const polyline = polylineRef.current;

    if (!map || !marker || !polyline) return;

    // Pan map and set marker position
    marker.setLatLng([lat, lon]);
    map.panTo([lat, lon]);

    const altVal = (data?.altitud_gps?.v !== null && data?.altitud_gps?.v !== undefined) ? data.altitud_gps.v : 0;
    const velVal = (data?.velocidad_kmh?.v !== null && data?.velocidad_kmh?.v !== undefined) ? data.velocidad_kmh.v : 0;
    const satsVal = (data?.satelites?.v !== null && data?.satelites?.v !== undefined) ? data.satelites.v : 0;
    const hdopVal = (data?.hdop?.v !== null && data?.hdop?.v !== undefined) ? data.hdop.v : 0;

    marker.getPopup().setContent(`
      <div class="map-popup-content">
        <b style="color: #4fc3f7; font-size: 13px; font-weight: bold;">CUBESAT CEMPAI (NEO-7M)</b><br/>
        <b>Lat:</b> ${lat.toFixed(6)}°<br/>
        <b>Lon:</b> ${lon.toFixed(6)}°<br/>
        <b>Altitud:</b> ${altVal.toFixed(1)} m<br/>
        <b>Velocidad:</b> ${velVal.toFixed(1)} km/h<br/>
        <b>Satélites:</b> ${satsVal} visibles<br/>
        <b>HDOP:</b> ${hdopVal.toFixed(1)}
      </div>
    `);

    // Historial de trayectoria
    const latHist = data?.latitud?.history || [];
    const lonHist = data?.longitud?.history || [];
    const points = latHist
      .filter(pt => pt.value !== 0)
      .map((pt, idx) => [pt.value, lonHist[idx]?.value || pt.value]);

    if (points.length > 0) {
      polyline.setLatLngs(points);
    }
  }, [data]);

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

      {/* ── FILA 1: Mapa Geográfico Real ── */}
      <section className="ubi-row ubi-row--map">
        <div className="map-panel premium-card-hover" style={{ '--card-color': '#2196f3' }}>
          <div className="leaflet-map-wrapper" ref={mapRef}></div>
          <div className="map-footer">
            <span className="map-title-label">
              <i className="fa-solid fa-earth-americas" style={{ marginRight: '6px', color: '#4fc3f7' }}></i>
              {data.latitud.v !== 0 ? 'GEOPOSICIONAMIENTO EN TIEMPO REAL (ESP32 - NEO-7M)' : 'GEOPOSICIONAMIENTO ESP32 (ESPERANDO SEÑAL REAL NEO-7M...)'}
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
                Actualización {isStale ? '(Sin datos del ESP32)' : 'cada 0.7s'} · {data.satelites.v} satélites visibles
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
            DATOS GPS REALES (ESP32)
          </h4>
          <table className="gps-table">
            <tbody>
              <tr><td>Latitud:</td><td className="gps-val">{data.latitud.v !== 0 ? `${data.latitud.v.toFixed(6)}°` : '0.000000° (Sin Fix)'}</td></tr>
              <tr><td>Longitud:</td><td className="gps-val">{data.longitud.v !== 0 ? `${data.longitud.v.toFixed(6)}°` : '0.000000° (Sin Fix)'}</td></tr>
              <tr><td>Altitud GPS:</td><td className="gps-val gps-hi">{data.altitud_gps.v.toFixed(1)} m</td></tr>
              <tr><td>Velocidad:</td><td className="gps-val">{data.velocidad_kmh.v.toFixed(1)} km/h</td></tr>
              <tr><td>Satélites:</td><td className="gps-val gps-ok">{data.satelites.v} visibles</td></tr>
              <tr><td>HDOP:</td><td className="gps-val gps-ok">{data.hdop.v.toFixed(1)}</td></tr>
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
