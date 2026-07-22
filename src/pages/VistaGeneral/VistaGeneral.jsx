import './VistaGeneral.css';

const cards = [
  {
    icon: <i className="fa-solid fa-smog"></i>,
    value: '450.34',
    unit: 'ppm',
    label: 'CO2',
    color: '#f9a825',
  },
  {
    icon: <i className="fa-solid fa-biohazard"></i>,
    value: '0.12',
    unit: 'ppb',
    label: 'GAS NOCIVO VOC',
    color: '#00bcd4',
  },
  {
    icon: <i className="fa-solid fa-thermometer-half"></i>,
    value: '23.46',
    unit: '°C',
    label: 'TEMPERATURA',
    color: '#ff7043',
  },
  {
    icon: <i className="fa-solid fa-sun"></i>,
    value: '2.93',
    unit: 'UV',
    label: 'RADIACIÓN UV',
    color: '#ab47bc',
  },
  {
    icon: <i className="fa-solid fa-mountain"></i>,
    value: '500.67',
    unit: 'm',
    label: 'ALTITUD',
    color: '#ef5350',
  },
  {
    icon: <i className="fa-solid fa-bolt"></i>,
    value: '12.46',
    unit: 'V',
    label: 'VOLTAJE',
    color: '#66bb6a',
  },
  {
    icon: <i className="fa-solid fa-arrow-trend-down"></i>,
    value: 'DESCENSO',
    unit: '',
    label: 'FASE DE MISIÓN',
    color: '#4caf50',
    isText: true,
  },
  {
    icon: <i className="fa-solid fa-box"></i>,
    value: '2657',
    unit: 'IX',
    label: 'PAQUETES RECIBIDOS',
    color: '#5c6bc0',
  },
];

export default function VistaGeneral() {
  return (
    <div className="vista-general">
      {/* Security Status */}
      <section className="security-status">
        <h3 className="section-title">ESTADO AMBIENTAL DE SEGURIDAD</h3>
        <div className="security-banner security-banner--ok">
          <div className="security-icon">
            <i className="fa-solid fa-circle-check" style={{ fontSize: '18px', color: '#fff' }}></i>
          </div>
          <div className="security-text">
            <span className="security-label">SEGURO</span>
            <span className="security-detail">TODOS LOS PARAMETROS EN RANGO NORMAL</span>
          </div>
        </div>
      </section>

      {/* Data Cards */}
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
