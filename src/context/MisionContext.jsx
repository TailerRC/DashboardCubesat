/**
 * MisionContext — singleton de estado de la misión.
 * Wrapping the app with <MisionProvider> garantiza que todos los
 * componentes (Sidebar, Mision page, VistaGeneral) compartan exactamente
 * la misma instancia del hook y nunca diverjan.
 */

import { createContext, useContext } from 'react';
import { useMisionMqtt } from '../mqtt/paquete_mqtt/useMisionMqtt';

const MisionContext = createContext(null);

export function MisionProvider({ children }) {
  const mision = useMisionMqtt();
  return (
    <MisionContext.Provider value={mision}>
      {children}
    </MisionContext.Provider>
  );
}

export function useMisionContext() {
  const ctx = useContext(MisionContext);
  if (!ctx) throw new Error('useMisionContext must be used inside <MisionProvider>');
  return ctx;
}
