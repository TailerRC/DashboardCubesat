import React, { useState, useEffect, useRef } from 'react';
import { useMisionMqtt } from '../../mqtt/paquete_mqtt/useMisionMqtt';
import globosGif from '../../assets/images/globos.gif';
import monkeyGif from '../../assets/images/monkeypls.gif';
import './CelebrationOverlay.css';

export default function CelebrationOverlay() {
  const { faseUI } = useMisionMqtt();
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const hasTriggeredRef = useRef(false);

  const handleClose = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setShowCelebration(false);
      setIsFadingOut(false);
    }, 800); // 800ms matches fadeOutCelebration keyframes animation
  };

  useEffect(() => {
    // Trigger celebration ONLY when phase becomes 'ATERRIZADO'
    if (faseUI === 'ATERRIZADO' && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setShowCelebration(true);
      setIsFadingOut(false);

      // Auto-close celebration after 10 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 10000);

      return () => clearTimeout(timer);
    } else if (faseUI !== 'ATERRIZADO') {
      // Reset trigger lock when phase moves away from ATERRIZADO
      hasTriggeredRef.current = false;
    }
  }, [faseUI]);

  if (!showCelebration) return null;

  return (
    <div 
      className={`celebration-overlay ${isFadingOut ? 'fade-out' : ''}`} 
      onClick={handleClose}
    >
      <div className="celebration-header">
        <h1 className="celebration-title">MISION COMPLETA</h1>
        <span className="celebration-subtitle">CubeSat CEMPAI Aterrizado con Éxito</span>
      </div>

      <div className="celebration-gifs-grid">
        {/* Sequence: Mono - Globo - Mono - Globo - Mono */}
        <div className="celebration-gif-col">
          <img src={monkeyGif} alt="Mono monkeypls" className="celebration-gif gif-monkey" />
        </div>
        <div className="celebration-gif-col">
          <img src={globosGif} alt="Globos" className="celebration-gif gif-globos" />
        </div>
        <div className="celebration-gif-col">
          <img src={monkeyGif} alt="Mono monkeypls" className="celebration-gif gif-monkey gif-center" />
        </div>
        <div className="celebration-gif-col">
          <img src={globosGif} alt="Globos" className="celebration-gif gif-globos" />
        </div>
        <div className="celebration-gif-col">
          <img src={monkeyGif} alt="Mono monkeypls" className="celebration-gif gif-monkey" />
        </div>
      </div>
    </div>
  );
}
