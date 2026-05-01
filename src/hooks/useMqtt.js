import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";

const BROKER_URL = "wss://7eb56c3b6d244dde8b76a7d983191cf9.s1.eu.hivemq.cloud:8884/mqtt";
const OPTIONS = {
  username: "tester",
  password: "Qwerty123",
  clientId: "react-dashboard-" + Math.random().toString(16).slice(2),
  clean: true,
  rejectUnauthorized: false  
};

const TOPIC = "cubesat/sensores";
const MAX_PUNTOS = 30;

export function useMqtt() {
  const [datos, setDatos] = useState([]);
  const [ultimo, setUltimo] = useState(null);
  const [conectado, setConectado] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, OPTIONS);
    clientRef.current = client;

    client.on("connect", () => {
      setConectado(true);
      client.subscribe(TOPIC);
      console.log("✓ MQTT conectado");
    });

    client.on("message", (topic, message) => {
      try {
        const parsed = JSON.parse(message.toString());
        setUltimo(parsed);
        setDatos(prev => {
          const nuevo = [...prev, {
            ...parsed,
            time: new Date().toLocaleTimeString()
          }];
          return nuevo.slice(-MAX_PUNTOS);
        });
      } catch (e) {
        console.error("Error parseando MQTT:", e);
      }
    });

    client.on("disconnect", () => setConectado(false));
    client.on("error", (err) => console.error("MQTT error:", err));

    return () => client.end();
  }, []);

  return { datos, ultimo, conectado };
}