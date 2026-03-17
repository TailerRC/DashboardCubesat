import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import VistaGeneral from './pages/VistaGeneral/VistaGeneral';
import Ambiental from './pages/Ambiental/Ambiental';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<VistaGeneral />} />
          <Route path="/ambiental" element={<Ambiental />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
