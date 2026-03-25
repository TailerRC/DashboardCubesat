import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Vista general', icon: 'grid' },
  { path: '/ambiental', label: 'Ambiental', icon: 'leaf' },
  { path: '/ubicacion', label: 'Ubicación', icon: 'pin' },
  { path: '/satelite', label: 'Satélite', icon: 'satellite' },
  { path: '/mision', label: 'Misión', icon: 'rocket' },
  { path: '/comunicacion', label: 'Comunicación', icon: 'comm' },
  { path: '/orientacion3d', label: 'Orientación 3D', icon: 'cube' },
];

const iconMap = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L7 18c4-1 7-3 9-7s2-7 2-7-2 0-1 4z" />
      <path d="M2 2l20 20" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  satellite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0m3 7v5s3.03-.55 4-2c1.08-1.62 0-3 0-3" />
    </svg>
  ),
  comm: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  cube: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#00bcd4" strokeWidth="2" fill="#1a237e" />
              <path d="M24 8c-3 4-6 10-6 16s3 12 6 16c3-4 6-10 6-16S27 12 24 8z" fill="#00bcd4" opacity="0.6" />
              <ellipse cx="24" cy="24" rx="14" ry="6" stroke="#4fc3f7" strokeWidth="1.5" fill="none" transform="rotate(-30 24 24)" />
              <ellipse cx="24" cy="24" rx="14" ry="6" stroke="#4fc3f7" strokeWidth="1.5" fill="none" transform="rotate(30 24 24)" />
              <circle cx="24" cy="24" r="3" fill="#fff" />
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-title">Panel de Operaciones Satelitales</span>
            <div className="logo-subtitle">
              <span className="cempai-label">CEMPAI</span>
              <span className="enlace-badge">
                <span className="enlace-dot"></span>
                ENLACE ACTIVO
              </span>
            </div>
          </div>
        </div>

        <div className="mission-phase">
          <span className="phase-label">FASE DE MISIÓN</span>
          <span className="phase-value">DESCENSO</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
            end={item.path === '/'}
          >
            <span className="nav-icon">{iconMap[item.icon]}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
