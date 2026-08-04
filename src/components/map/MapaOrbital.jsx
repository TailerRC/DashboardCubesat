import React, { useEffect, useRef, useState } from 'react';
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
  const mountRef = useRef(null);
  const mapRef = useRef(null);
  const miMarkerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  const DEFAULT_LAT = -12.0850;
  const DEFAULT_LON = -77.0900;

  const [userLoc, setUserLoc] = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [isRealGps, setIsRealGps] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLoc({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setIsRealGps(true);
        },
        (error) => {
          console.warn("Geolocalización del navegador no disponible, usando Estación Terrena:", error);
          setIsRealGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const lat = userLoc.lat;
  const lon = userLoc.lon;

  useEffect(() => {
    if (mapRef.current || lat === null || lon === null) return;

    // ── Crear mapa ──────────────────────────────────────────────────────
    const map = L.map(mountRef.current, {
      center: [lat, lon],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.attributionControl.setPrefix(false);

    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);

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
  }, [lat, lon]);

  // Actualizar la posición del pin con tu ubicación real
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat === null || lon === null) return;

    const html = `
      <div class="mapa-popup">
        <div class="mapa-popup__title" style="color:#00ff66">
          <i class="fa-solid fa-location-arrow" style="margin-right:6px"></i>Mi Ubicación Actual
        </div>
        <div class="mapa-popup__coords">
          <span>Lat: <strong>${lat.toFixed(5)}°</strong></span>
          <span>Lon: <strong>${lon.toFixed(5)}°</strong></span>
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
  }, [lat, lon]);

  return (
    <div className="mapa-orbital-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} className="mapa-orbital-map" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default MapaOrbital;
