import React, { useEffect, useRef } from 'react';
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

// ── Ícono verde con pulso (mi ubicación) ──────────────────────────────────
const iconoMiUbicacion = L.divIcon({
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

const LIMA = { lat: -12.0464, lon: -77.0428 };

const MapaOrbital = () => {
  const mountRef = useRef(null);
  const mapRef = useRef(null);
  const miMarkerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    // ── Crear mapa ──────────────────────────────────────────────────────
    const map = L.map(mountRef.current, {
      center: [LIMA.lat, LIMA.lon],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // Usar tiles de color negro / dark-mode de CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    map.attributionControl.setPrefix(false);

    mapRef.current = map;

    // ── Helper: coloca / mueve el pin verde (mi ubicación) ───────
    const colocarPin = (lat, lon, precision) => {
      const precText = precision
        ? `<span class="mapa-popup__accuracy"><i class="fa-solid fa-circle-dot" style="margin-right:4px;font-size:9px"></i>Precisión: ±${Math.round(precision)} m</span>`
        : '';

      const html = `
        <div class="mapa-popup">
          <div class="mapa-popup__title" style="color:#00ff66">
            <i class="fa-solid fa-location-dot" style="margin-right:6px"></i>Estación Terrena
          </div>
          <div class="mapa-popup__coords">
            <span>Lat: <strong>${lat.toFixed(5)}°</strong></span>
            <span>Lon: <strong>${lon.toFixed(5)}°</strong></span>
            ${precText}
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
          icon: iconoMiUbicacion,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup(popup);
      }

      map.setView([lat, lon], precision && precision < 500 ? 15 : 13);
    };

    // Colocar pin en Lima inmediatamente (visible, sin popup abierto)
    colocarPin(LIMA.lat, LIMA.lon, null);

    // Luego actualizar con la ubicación real del navegador (con robustez / fallback)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => colocarPin(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => {
          console.warn('[MapaOrbital] Geolocation error (high accuracy), trying low accuracy:', err.message);
          navigator.geolocation.getCurrentPosition(
            (pos2) => colocarPin(pos2.coords.latitude, pos2.coords.longitude, pos2.coords.accuracy),
            (err2) => console.error('[MapaOrbital] Geolocation failed completely:', err2.message),
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
      );
    }

    // ── Click en mapa → pin celeste con popup inmediato ─────────────────
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;

      if (clickMarkerRef.current) clickMarkerRef.current.remove();

      const html = `
        <div class="mapa-popup">
          <div class="mapa-popup__title" style="color:#38bdf8">
            <i class="fa-solid fa-location-crosshairs" style="margin-right:6px"></i>Punto seleccionado
          </div>
          <div class="mapa-popup__coords">
            <span>Lat: <strong>${lat.toFixed(5)}°</strong></span>
            <span>Lon: <strong>${lng.toFixed(5)}°</strong></span>
          </div>
        </div>`;

      const popup = L.popup({
        closeButton: true,
        className: 'mapa-popup-wrapper mapa-popup-wrapper--blue',
        offset: [0, -5],
        autoClose: true,
        closeOnClick: false,
      }).setContent(html);

      const marker = L.marker([lat, lng], { icon: iconoClick })
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

  return (
    <div className="mapa-orbital-container">
      <div ref={mountRef} className="mapa-orbital-map" />
    </div>
  );
};

export default MapaOrbital;
