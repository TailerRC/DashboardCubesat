import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import './Layout.css';

export default function Layout() {
  const location = useLocation();

  const pathMap = {
    '/': 'Vista General',
    '/ambiental': 'Ambiental',
    '/ubicacion': 'Ubicación',
    '/satelite': 'Satélite',
    '/mision': 'Misión',
    '/comunicacion': 'Comunicación',
    '/orientacion3d': 'Orientación 3D',
  };

  const viewName = pathMap[location.pathname] || 'Vista General';

  // ── Scroll progress ──────────────────────────────────────────
  const contentRef = useRef(null);
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const scrollable = el.scrollHeight - el.clientHeight;
        setScrollPct(scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0);
        rafId = null;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopBar viewName={viewName} scrollPct={scrollPct} />
        <main className="layout-content" ref={contentRef}>
          <Outlet />
        </main>
        <BottomBar />
      </div>
    </div>
  );
}
