import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import VistaGeneral from './pages/VistaGeneral/VistaGeneral';
import Ambiental from './pages/Ambiental/Ambiental';
import Ubicacion from './pages/Ubicacion/Ubicacion';
import Satelite from './pages/Satelite/Satelite';
import Orientacion3D from './pages/Orientacion3D/Orientacion3D';
import Mision from './pages/Mision/Mision';
import Comunicacion from './pages/Comunicacion/Comunicacion';
import Vision from './pages/Vision/Vision';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<VistaGeneral />} />
          <Route path="/ambiental" element={<Ambiental />} />
          <Route path="/ubicacion" element={<Ubicacion />} />
          <Route path="/satelite" element={<Satelite />} />
          <Route path="/mision" element={<Mision />} />
          <Route path="/comunicacion" element={<Comunicacion />} />
          <Route path="/orientacion3d" element={<Orientacion3D />} />
          <Route path="/vision" element={<Vision />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
