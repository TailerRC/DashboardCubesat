import React, { useEffect, useRef } from 'react';
import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaOrbital.css';

// Fix Vite/Webpack para íconos default de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Ícono verde con pulso (Ubicación GPS Real) ──────────────────────────
const iconoGPS = L.divIcon({
  className: 'mapa-icon-wrapper',
  html: `<div class="mapa-pin mapa-pin--lima"><div class="mapa-pin__dot"></div><div class="mapa-pin__pulse"></div></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -16],
});

// ── Ícono celeste (click) ─────────────────────────────────────────────────
const iconoClick = L.divIcon({
  className: 'mapa-icon-wrapper',
  html: `<div class="mapa-pin mapa-pin--click"><div class="mapa-pin__dot"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

const MapaOrbital = () => {
  const { data } = useUbicacionMqtt();
  const mountRef = useRef(null);
  const mapRef = useRef(null);
  const miMarkerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  const lat = data.latitud?.v;
  const lon = data.longitud?.v;
  const alt = data.altitud_gps?.v ?? 0;
  const sats = data.satelites?.v ?? 0;

  useEffect(() => {
    if (mapRef.current || lat === undefined || lon === undefined) return;

    // ── Crear mapa ──────────────────────────────────────────────────────
    const map = L.map(mountRef.current, {
      center: [lat, lon],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // Usar tiles de CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    map.attributionControl.setPrefix(false);

    mapRef.current = map;

    // ── Click en mapa → pin celeste con popup inmediato ─────────────────
    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      if (clickMarkerRef.current) clickMarkerRef.current.remove();

      const html = `
        <div class="mapa-popup">
          <div class="mapa-popup__title" style="color:#38bdf8">
            <i class="fa-solid fa-location-crosshairs" style="margin-right:6px"></i>Punto seleccionado
          </div>
          <div class="mapa-popup__coords">
            <span>Lat: <strong>${clickLat.toFixed(5)}°</strong></span>
            <span>Lon: <strong>${clickLng.toFixed(5)}°</strong></span>
          </div>
        </div>`;

      const popup = L.popup({
        closeButton: true,
        className: 'mapa-popup-wrapper mapa-popup-wrapper--blue',
        offset: [0, -5],
        autoClose: true,
        closeOnClick: false,
      }).setContent(html);

      const marker = L.marker([clickLat, clickLng], { icon: iconoClick })
        .addTo(map)
        .bindPopup(popup)
        .openPopup();

      marker.on('popupclose', () => { marker.remove(); clickMarkerRef.current = null; });
      clickMarkerRef.current = marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      miMarkerRef.current = null;
    };
  }, []);

  // Actualizar la posición del pin con los datos reales del sensor GPS
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat === undefined || lon === undefined) return;

    const html = `
      <div class="mapa-popup">
        <div class="mapa-popup__title" style="color:#00ff66">
          <i class="fa-solid fa-satellite" style="margin-right:6px"></i>Sensor GPS (CubeSat)
        </div>
        <div class="mapa-popup__coords">
          <span>Lat: <strong>${lat.toFixed(5)}°</strong></span>
          <span>Lon: <strong>${lon.toFixed(5)}°</strong></span>
          <span class="mapa-popup__accuracy"><i class="fa-solid fa-signal" style="margin-right:4px;font-size:9px"></i>Satélites: ${sats} | Alt: ${alt.toFixed(1)}m</span>
        </div>
      </div>`;

    if (miMarkerRef.current) {
      miMarkerRef.current.setLatLng([lat, lon]);
      miMarkerRef.current.getPopup().setContent(html);
    } else {
      const popup = L.popup({
        closeButton: true,
        className: 'mapa-popup-wrapper mapa-popup-wrapper--green',
        offset: [0, -5],
        autoClose: false,
        closeOnClick: false,
      }).setContent(html);

      miMarkerRef.current = L.marker([lat, lon], {
        icon: iconoGPS,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(popup);
    }

    map.panTo([lat, lon]);
  }, [lat, lon, alt, sats]);

  return (
    <div className="mapa-orbital-container">
      <div ref={mountRef} className="mapa-orbital-map" />
    </div>
  );
};

export default MapaOrbital;
