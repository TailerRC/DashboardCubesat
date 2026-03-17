import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import TopBar from '../TopBar/TopBar';
import BottomBar from '../BottomBar/BottomBar';
import './Layout.css';

export default function Layout({ viewName = 'Vista General' }) {
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
