import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import './Vision.css';

export default function Vision() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  const [modelStatus, setModelStatus] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [stats, setStats] = useState({
    vegetacion_pct: 0,
    personas: 0,
    vehiculos: 0
  });

  // Estados añadidos para captura, galería, modal explicativo y gestión de confirmaciones/errores
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [captures, setCaptures] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [selectedCaptureIndex, setSelectedCaptureIndex] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [cameraError, setCameraError] = useState('');

  // Cargar lista de capturas guardadas en la carpeta public/captures
  async function fetchCaptures() {
    try {
      const response = await fetch('/api/list-captures');
      const data = await response.json();
      if (data.captures) {
        setCaptures(data.captures);
      }
    } catch (err) {
      console.error('[Vision] Error al cargar capturas:', err);
    }
  }

  // ── Obtener lista de cámaras ──────────────────────────────────────────────
  async function updateDevices() {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        // Buscar si hay alguna cámara USB o externa de captura (EasyCap, Grabadora, etc.)
        const usbCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes('usb') || 
          d.label.toLowerCase().includes('easycap') ||
          d.label.toLowerCase().includes('grabadora') ||
          d.label.toLowerCase().includes('video') ||
          d.label.toLowerCase().includes('oem')
        );
        if (usbCamera) {
          setSelectedDeviceId(usbCamera.deviceId);
        } else {
          // Si no hay externa, usar la primera (por defecto, integrada)
          setSelectedDeviceId(prev => prev || videoDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.error('[Vision] Error enumerando dispositivos de video:', err);
    }
  }

  // ── Cargar modelo COCO-SSD al montar el componente ────────────────────────
  useEffect(() => {
    async function loadModel() {
      try {
        // Asegurar que TensorFlow esté listo antes de cargar el modelo
        await tf.ready();
        modelRef.current = await cocoSsd.load();
        setModelStatus('listo');
        await updateDevices();
      } catch (err) {
        console.error('[Vision] Error cargando modelo TensorFlow/COCO-SSD:', err);
        setModelStatus('error');
      }
    }
    loadModel();
    fetchCaptures();

    // Escuchar si se conectan o desconectan dispositivos
    navigator.mediaDevices.addEventListener('devicechange', updateDevices);

    return () => {
      stopStream();
      navigator.mediaDevices.removeEventListener('devicechange', updateDevices);
    };
  }, []);

  // ── Iniciar captura de video y bucle de detección ────────────────────────
  async function startStream() {
    try {
      setStats({ vegetacion_pct: 0, personas: 0, vehiculos: 0 });
      const constraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: 640, height: 480 }
          : { width: 640, height: 480 }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsStreamActive(true);
          // Ejecutar bucle cada 300ms (optimizado para rendimiento)
          intervalRef.current = setInterval(runDetection, 300);
        };
      }
      
      // Volver a enumerar cámaras ahora que el permiso fue concedido para obtener etiquetas con nombres
      await updateDevices();
    } catch (err) {
      console.error('[Vision] Error al acceder a la cámara web:', err);
      setCameraError('No se pudo acceder a la cámara. Por favor verifica los permisos del dispositivo y del navegador.');
      setIsStreamActive(false);
    }
  }

  // ── Cambiar de cámara activamente ─────────────────────────────────────────
  async function handleDeviceChange(deviceId) {
    setSelectedDeviceId(deviceId);
    if (isStreamActive) {
      // Detener stream e intervalos actuales
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: 640, height: 480 }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            intervalRef.current = setInterval(runDetection, 300);
          };
        }
      } catch (err) {
        console.error('[Vision] Error al cambiar de cámara:', err);
        setIsStreamActive(false);
      }
    }
  }

  // ── Detener captura de video y limpiar intervalos/canvas ──────────────────
  function stopStream() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreamActive(false);

    // Limpiar canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── Captura fotográfica local ─────────────────────────────────────────────
  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !isStreamActive || isCapturing) return;

    setIsCapturing(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      // Reflejar la imagen horizontalmente para que coincida exactamente con lo visto en pantalla
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/png');
      
      const response = await fetch('/api/save-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: dataUrl }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchCaptures();
      } else {
        console.error('[Vision] Error al guardar la captura:', result.error);
      }
    } catch (err) {
      console.error('[Vision] Error capturando foto:', err);
    } finally {
      setIsCapturing(false);
    }
  }

  // ── Controles de visualización (Lightbox) ──────────────────────────────────
  function openLightbox(index) {
    setSelectedCaptureIndex(index);
  }

  function closeLightbox() {
    setSelectedCaptureIndex(null);
  }

  function navigatePrev() {
    if (selectedCaptureIndex === null || captures.length === 0) return;
    setSelectedCaptureIndex(prev => (prev === 0 ? captures.length - 1 : prev - 1));
  }

  function navigateNext() {
    if (selectedCaptureIndex === null || captures.length === 0) return;
    setSelectedCaptureIndex(prev => (prev === captures.length - 1 ? 0 : prev + 1));
  }

  // ── Eliminar captura de foto local ────────────────────────────────────────
  function deleteCapture(filename) {
    setPhotoToDelete(filename);
  }

  async function executeDelete(filename) {
    try {
      const response = await fetch('/api/delete-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });
      const result = await response.json();
      if (result.success) {
        // Ajustar índice de lightbox si está abierto
        if (selectedCaptureIndex !== null) {
          if (captures.length <= 1) {
            closeLightbox();
          } else {
            const currentIdx = selectedCaptureIndex;
            if (currentIdx === captures.length - 1) {
              setSelectedCaptureIndex(currentIdx - 1);
            }
          }
        }
        await fetchCaptures();
      } else {
        console.error('[Vision] Error al eliminar captura:', result.error);
      }
    } catch (err) {
      console.error('[Vision] Error eliminando captura:', err);
    }
  }

  // Navegación por teclado
  useEffect(() => {
    function handleKeyDown(e) {
      if (selectedCaptureIndex === null) return;
      if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCaptureIndex, captures]);

  // ── Cálculo heurístico de vegetación (conteo de píxeles verdes) ──────────
  function calcularVegetacion(ctx, width, height) {
    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;
    let verdes = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Heurística simple: el canal verde predomina sobre rojo y azul, y tiene cierta intensidad mínima
      if (g > r && g > b && g > 90) {
        verdes++;
      }
    }
    return ((verdes / total) * 100).toFixed(2);
  }

  // ── Bucle de detección y renderizado ──────────────────────────────────────
  async function runDetection() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !modelRef.current || video.paused || video.ended) return;

    const ctx = canvas.getContext('2d');
    // Ajustar dimensiones del canvas para que coincidan exactamente con el video renderizado
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Dibujar el frame actual del video en el canvas para poder analizarlo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let personas = 0;
    let vehiculos = 0;

    try {
      const predictions = await modelRef.current.detect(video);

      // Limpiar y redibujar el canvas solo con los rectángulos para no superponer imagen sobre imagen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      predictions.forEach(pred => {
        const [x, y, w, h] = pred.bbox;

        if (pred.class === 'person') personas++;
        if (['car', 'truck', 'bus', 'motorbike'].includes(pred.class)) vehiculos++;

        // Dibujar bounding box solo para personas y vehículos
        if (pred.class === 'person' || ['car', 'truck', 'bus', 'motorbike'].includes(pred.class)) {
          // Color de marco exterior
          ctx.strokeStyle = '#00bcd4';
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#00bcd4';
          ctx.strokeRect(x, y, w, h);

          // Estilo de banner de etiqueta superior
          ctx.fillStyle = 'rgba(0, 188, 212, 0.85)';
          ctx.shadowBlur = 0;
          ctx.fillRect(x - 1, y - 22, Math.max(w * 0.4, 75), 22);

          // Texto de la etiqueta
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          const label = pred.class === 'person' ? 'PERSONA' : pred.class.toUpperCase();
          ctx.fillText(label, x + 5, y - 6);
        }
      });

      // Calcular vegetación estimada a partir del frame (usando un canvas temporal o el propio canvas)
      // Para optimizar rendimiento, volvemos a dibujar el video una milésima de segundo para obtener píxeles
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const vegetacion = calcularVegetacion(tempCtx, tempCanvas.width, tempCanvas.height);

      setStats({
        vegetacion_pct: parseFloat(vegetacion),
        personas,
        vehiculos
      });
    } catch (err) {
      console.error('[Vision] Error durante la detección:', err);
    }
  }

  return (
    <div className="vision-view">
      {/* Banner Superior de Estado */}
      <section className="vision-banner">
        <div className="vision-banner-left">
          <div className="vision-banner-icon">
            <i className="fa-solid fa-eye"></i>
          </div>
          <div>
            <div className="vision-banner-title">MÓDULO DE PROCESAMIENTO VISUAL</div>
            <div className="vision-banner-status">
              {modelStatus === 'cargando' && 'Inicializando TensorFlow.js...'}
              {modelStatus === 'error' && 'ERROR DE INICIALIZACIÓN'}
              {modelStatus === 'listo' && (isStreamActive ? 'ANÁLISIS EN TIEMPO REAL ACTIVO' : 'SISTEMA LISTO — FEED INACTIVO')}
            </div>
          </div>
        </div>
        <div className="vision-banner-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {modelStatus === 'cargando' && (
            <div className="model-loading-indicator">
              <span className="spinner"></span>
              Cargando COCO-SSD...
            </div>
          )}
          {modelStatus === 'listo' && (
            <>
              <button 
                className="info-details-btn" 
                onClick={() => setShowInfoModal(true)} 
                title="Ver especificaciones técnicas"
              >
                <i className="fa-solid fa-circle-info"></i>
              </button>

              {devices.length > 0 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="camera-select"
                  title="Seleccionar Cámara"
                >
                  {devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Cámara ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
              
              {!isStreamActive ? (
                <button className="feed-control-btn" onClick={startStream}>
                  <i className="fa-solid fa-play" style={{ marginRight: '8px' }}></i>
                  Activar Cámara FPV
                </button>
              ) : (
                <>
                  <button 
                    className="feed-control-btn feed-control-btn--capture" 
                    onClick={capturePhoto}
                    disabled={isCapturing}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i>
                    {isCapturing ? 'Capturando...' : 'Capturar Foto'}
                  </button>
                  <button className="feed-control-btn feed-control-btn--stop" onClick={stopStream}>
                    <i className="fa-solid fa-stop" style={{ marginRight: '8px' }}></i>
                    Detener Cámara
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Grid Principal */}
      <div className="vision-grid">
        {/* Lado Izquierdo: Viewport del Feed FPV */}
        <div className="vision-feed-card">
          <div className="feed-header">
            <h3 className="feed-title">CAPTURA DE CÁMARA (WEB CUBESAT FPV)</h3>
            <span className={`feed-stream-dot ${isStreamActive ? 'feed-stream-dot--active' : 'feed-stream-dot--inactive'}`}></span>
          </div>

          <div className="feed-viewport">
            <video
              ref={videoRef}
              className="feed-viewport-video"
              autoPlay
              muted
              playsInline
              style={{ display: isStreamActive ? 'block' : 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="feed-viewport-canvas"
              style={{ display: isStreamActive ? 'block' : 'none' }}
            />
            
            {showFlash && <div className="camera-flash" />}

            {!isStreamActive && (
              <div className="feed-placeholder">
                <i className="fa-solid fa-video-slash placeholder-icon"></i>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                    Cámara Desactivada
                  </p>
                  <p style={{ fontSize: '11px', color: '#6b7280', maxWidth: '300px' }}>
                    Haz clic en "Activar Cámara FPV" para iniciar la transmisión y el análisis visual local.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Estadísticas del Análisis */}
        <div className="vision-stats-column">
          {/* Tarjeta Vegetación */}
          <div className="vision-stat-card premium-card-hover" style={{ '--card-color': '#4caf50' }}>
            <div className="stat-card-icon">
              <i className="fa-solid fa-leaf"></i>
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Cobertura Vegetal Estimada</span>
              <div className="stat-card-value-row">
                <span className="stat-card-value">{stats.vegetacion_pct}</span>
                <span className="stat-card-unit">%</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Personas */}
          <div className="vision-stat-card premium-card-hover" style={{ '--card-color': '#ff9800' }}>
            <div className="stat-card-icon">
              <i className="fa-solid fa-person-walking"></i>
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Personas Identificadas</span>
              <div className="stat-card-value-row">
                <span className="stat-card-value">{stats.personas}</span>
                <span className="stat-card-unit">ind.</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Vehículos */}
          <div className="vision-stat-card premium-card-hover" style={{ '--card-color': '#00bcd4' }}>
            <div className="stat-card-icon">
              <i className="fa-solid fa-car"></i>
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Vehículos en Zona</span>
              <div className="stat-card-value-row">
                <span className="stat-card-value">{stats.vehiculos}</span>
                <span className="stat-card-unit">uds.</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sección de Capturas Guardadas */}
      <section className="captures-section">
        <div className="captures-header">
          <h3>
            <i className="fa-solid fa-images"></i> Galería de Capturas Cubesat
          </h3>
          <span className="captures-count">{captures.length} capturas guardadas</span>
        </div>

        {captures.length === 0 ? (
          <div className="captures-empty">
            <i className="fa-solid fa-camera-retro empty-icon"></i>
            <p>No hay capturas fotográficas guardadas aún.</p>
            <p className="empty-sub">Usa el botón "Capturar Foto" cuando la cámara esté activa para registrar imágenes.</p>
          </div>
        ) : (
          <div className="captures-carousel-container">
            <div className="captures-grid">
              {captures.map((filename, index) => {
                const timestampStr = filename.split('_')[1]?.split('.')[0];
                const date = timestampStr ? new Date(parseInt(timestampStr)) : new Date();
                const formattedDate = date.toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div 
                    key={filename} 
                    className="capture-thumb-card" 
                    onClick={() => openLightbox(index)}
                  >
                    <button 
                      className="thumb-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCapture(filename);
                      }}
                      title="Eliminar captura"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                    <div className="thumb-img-wrapper">
                      <img src={`/captures/${filename}`} alt={formattedDate} loading="lazy" />
                    </div>
                    <div className="thumb-info">
                      <span className="thumb-date">{formattedDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Modal de Detalles Técnicos */}
      {showInfoModal && (
        <div className="vision-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="vision-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vision-modal-header">
              <h3><i className="fa-solid fa-circle-info"></i> Especificaciones Técnicas</h3>
              <button className="vision-modal-close" onClick={() => setShowInfoModal(false)}>&times;</button>
            </div>
            <div className="vision-modal-body">
              <section className="technical-section">
                <h4><i className="fa-solid fa-leaf"></i> Cobertura Vegetal Estimada</h4>
                <p>
                  El porcentaje de cobertura vegetal se calcula a través de un análisis cromático en tiempo real (conteo heurístico de píxeles dominantes en el canal verde):
                </p>
                <ul>
                  <li><strong>Algoritmo:</strong> Se evalúa cada píxel del frame y se clasifica como vegetación si <code>G &gt; R</code> y <code>G &gt; B</code> con una intensidad mínima de <code>G &gt; 90</code>.</li>
                  <li><strong>Limitación:</strong> Representa una aproximación cromática visual y no sustituye mediciones espectrales calibradas (como el índice NDVI).</li>
                </ul>
              </section>

              <section className="technical-section">
                <h4><i className="fa-solid fa-brain"></i> Detección de Objetos (COCO-SSD)</h4>
                <p>
                  Utilizamos la red neuronal convolucional <strong>COCO-SSD</strong> sobre <strong>TensorFlow.js</strong> cargada en el cliente web local para identificar elementos en tiempo real:
                </p>
                <ul>
                  <li><strong>Clases analizadas:</strong> Personas (<code>person</code>) y Vehículos (<code>car</code>, <code>truck</code>, <code>bus</code>, <code>motorbike</code>).</li>
                  <li><strong>Rendimiento:</strong> El bucle de inferencia se ejecuta optimizado cada 300 ms para mantener alta tasa de frames sin sobrecargar la CPU/GPU del cliente.</li>
                  <li><strong>Precisión:</strong> Sujeta a las condiciones lumínicas, sombras y el ángulo de inclinación focal de la cámara FPV.</li>
                </ul>
              </section>
            </div>
            <div className="vision-modal-footer">
              <button className="vision-modal-btn-close" onClick={() => setShowInfoModal(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal (Visualizador de pantalla completa) */}
      {selectedCaptureIndex !== null && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox} title="Cerrar (Esc)">&times;</button>
            
            <button 
              className="lightbox-nav lightbox-nav--prev" 
              onClick={navigatePrev}
              title="Anterior (Flecha Izquierda)"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            <div className="lightbox-content">
              <img 
                src={`/captures/${captures[selectedCaptureIndex]}`} 
                alt="Captura grande" 
                className="lightbox-img"
              />
              <div className="lightbox-meta">
                <span className="lightbox-index">Foto {selectedCaptureIndex + 1} de {captures.length}</span>
                
                <button 
                  className="lightbox-delete-btn"
                  onClick={() => deleteCapture(captures[selectedCaptureIndex])}
                  title="Eliminar esta foto"
                >
                  <i className="fa-solid fa-trash" style={{ marginRight: '6px' }}></i>
                  Eliminar Foto
                </button>

                <span className="lightbox-date">
                  {(() => {
                    const filename = captures[selectedCaptureIndex];
                    const timestampStr = filename.split('_')[1]?.split('.')[0];
                    const date = timestampStr ? new Date(parseInt(timestampStr)) : new Date();
                    return date.toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });
                  })()}
                </span>
              </div>
            </div>

            <button 
              className="lightbox-nav lightbox-nav--next" 
              onClick={navigateNext}
              title="Siguiente (Flecha Derecha)"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {photoToDelete !== null && (
        <div className="vision-modal-overlay" onClick={() => setPhotoToDelete(null)}>
          <div className="vision-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vision-modal-header" style={{ borderBottomColor: '#d32f2f' }}>
              <h3><i className="fa-solid fa-triangle-exclamation" style={{ color: '#f44336' }}></i> Confirmar Eliminación</h3>
              <button className="vision-modal-close" onClick={() => setPhotoToDelete(null)}>&times;</button>
            </div>
            <div className="vision-modal-body">
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                ¿Estás seguro de que deseas eliminar permanentemente esta captura fotográfica?
              </p>
              <p style={{ fontSize: '11px', color: '#8892b0', marginTop: '6px', marginBottom: 0 }}>
                Esta acción no se puede deshacer y el archivo será borrado del repositorio.
              </p>
            </div>
            <div className="vision-modal-footer">
              <button className="vision-modal-btn-close" style={{ marginRight: '8px' }} onClick={() => setPhotoToDelete(null)}>Cancelar</button>
              <button 
                className="vision-modal-btn-close" 
                style={{ background: '#d32f2f', borderColor: '#d32f2f', color: '#fff' }}
                onClick={async () => {
                  const filename = photoToDelete;
                  setPhotoToDelete(null);
                  await executeDelete(filename);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error de Cámara */}
      {cameraError && (
        <div className="vision-modal-overlay" onClick={() => setCameraError('')}>
          <div className="vision-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vision-modal-header" style={{ borderBottomColor: '#f44336' }}>
              <h3><i className="fa-solid fa-circle-xmark" style={{ color: '#f44336' }}></i> Error de Dispositivo</h3>
              <button className="vision-modal-close" onClick={() => setCameraError('')}>&times;</button>
            </div>
            <div className="vision-modal-body">
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                {cameraError}
              </p>
            </div>
            <div className="vision-modal-footer">
              <button className="vision-modal-btn-close" onClick={() => setCameraError('')}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
