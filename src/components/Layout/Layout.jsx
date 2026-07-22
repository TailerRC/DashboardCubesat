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

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopBar viewName={viewName} />
        <main className="layout-content">
          <Outlet />
        </main>
        <BottomBar />
      </div>
    </div>
  );
}
