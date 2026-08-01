import { NavLink } from 'react-router-dom';
import { useMisionMqtt } from '../../mqtt/paquete_mqtt/useMisionMqtt';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Vista general', icon: 'grid' },
  { path: '/ambiental', label: 'Ambiental', icon: 'leaf' },
  { path: '/ubicacion', label: 'Ubicación', icon: 'pin' },
  { path: '/satelite', label: 'Satélite', icon: 'satellite' },
  { path: '/mision', label: 'Misión', icon: 'rocket' },
  { path: '/comunicacion', label: 'Comunicación', icon: 'comm' },
  { path: '/orientacion3d', label: 'Orientación 3D', icon: 'cube' },
  { path: '/vision', label: 'Visión', icon: 'vision' },
];

const iconMap = {
  grid: <i className="fa-solid fa-chart-simple"></i>,
  leaf: <i className="fa-solid fa-leaf"></i>,
  pin: <i className="fa-solid fa-location-dot"></i>,
  satellite: <i className="fa-solid fa-satellite"></i>,
  rocket: <i className="fa-solid fa-rocket"></i>,
  comm: <i className="fa-solid fa-tower-broadcast"></i>,
  cube: <i className="fa-solid fa-cube"></i>,
  vision: <i className="fa-solid fa-eye"></i>,
};

export default function Sidebar() {
  const { faseUI } = useMisionMqtt();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <i className="fa-solid fa-satellite-dish" style={{ color: '#00bcd4', fontSize: '32px' }}></i>
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
          <span className="phase-value">{faseUI || '---'}</span>
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
