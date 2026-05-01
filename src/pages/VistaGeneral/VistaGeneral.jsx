import './VistaGeneral.css';
import { useMqtt } from '../../hooks/useMqtt';

const getCards = (mqttData) => [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#f9a825" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    value: '450.34',
    unit: 'ppm',
    label: 'CO2',
    color: '#f9a825',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    value: '0.12',
    unit: 'ppb',
    label: 'GAS NOCIVO VOC',
    color: '#00bcd4',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#ff7043" strokeWidth="2">
        <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
      </svg>
    ),
    value: '23.46',
    unit: '°C',
    label: 'TEMPERATURA',
    color: '#ff7043',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#ab47bc" strokeWidth="2">
        <polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9" />
      </svg>
    ),
    value: '2.93',
    unit: 'UV',
    label: 'RADIACIÓN UV',
    color: '#ab47bc',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#ef5350" strokeWidth="2">
        <path d="M3 17l6-6 4 4 8-8" />
        <polyline points="17 7 21 7 21 11" />
      </svg>
    ),
    value: '500.67',
    unit: 'm',
    label: 'ALTITUD',
    color: '#ef5350',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#66bb6a" strokeWidth="2">
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
        <line x1="23" y1="10" x2="23" y2="14" />
      </svg>
    ),
    // ✅ Esta carta usa el dato real del potenciómetro via MQTT
    value: mqttData ? mqttData.voltaje.toFixed(2) : '---',
    unit: 'V',
    label: 'VOLTAJE',
    color: '#66bb6a',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="6 13 12 19 18 13" />
      </svg>
    ),
    value: 'DESCENSO',
    unit: '',
    label: 'FASE DE MISIÓN',
    color: '#4caf50',
    isText: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#5c6bc0" strokeWidth="2">
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
      </svg>
    ),
    value: '2657',
    unit: 'IX',
    label: 'PAQUETES RECIBIDOS',
    color: '#5c6bc0',
  },
];

export default function VistaGeneral() {
  const { ultimo, conectado } = useMqtt();
  const cards = getCards(ultimo);

  return (
    <div className="vista-general">

      #Indicador de conexión MQTT

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        fontSize: '12px',
        color: conectado ? '#66bb6a' : '#ef5350'
      }}>
        <span style={{ fontSize: '10px' }}>{conectado ? '●' : '○'}</span>
        {conectado ? 'MQTT CONECTADO' : 'MQTT DESCONECTADO'}
      </div>

      #Security Status

      <section className="security-status">
        <h3 className="section-title">ESTADO AMBIENTAL DE SEGURIDAD</h3>
        <div className="security-banner security-banner--ok">
          <div className="security-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="security-text">
            <span className="security-label">SEGURO</span>
            <span className="security-detail">TODOS LOS PARAMETROS EN RANGO NORMAL</span>
          </div>
        </div>
      </section>

      <section className="data-cards">
        {cards.map((card, i) => (
          <div key={i} className="data-card">
            <div className="card-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="card-content">
              <div className="card-value-row">
                <span
                  className={`card-value ${card.isText ? 'card-value--text' : ''}`}
                  style={{ color: card.isText ? card.color : '#e0e0e0' }}
                >
                  {card.value}
                </span>
                {card.unit && <span className="card-unit">{card.unit}</span>}
              </div>
              <span className="card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}