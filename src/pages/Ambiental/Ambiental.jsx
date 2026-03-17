import './Ambiental.css';

export default function Ambiental() {
  return (
    <div className="empty-view">
      <div className="empty-view-content">
        <div className="empty-view-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L7 18c4-1 7-3 9-7s2-7 2-7-2 0-1 4z" />
          </svg>
        </div>
        <h2 className="empty-view-title">Ambiental</h2>
        <p className="empty-view-subtitle">
          Esta vista está en desarrollo. Próximamente se mostrarán los datos ambientales del satélite.
        </p>
      </div>
    </div>
  );
}
