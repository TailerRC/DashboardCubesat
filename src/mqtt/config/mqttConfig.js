// ── MQTT Service — Modular Pub-Sub Broker ───────────────────────────────────
// Acts as a client wrapper. In development, it uses an in-memory pub-sub bus.
// To switch to a live broker (e.g. HiveMQ over WebSockets), set USE_REAL_MQTT to true
// and configure the broker URL.

const USE_REAL_MQTT = true;
const REAL_MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

class MqttBroker {
  constructor() {
    this.subscribers = {};
    this.client = null;

    if (USE_REAL_MQTT) {
      this.initRealMqtt();
    }
  }

  /**
   * Initializes connection to real MQTT broker over WebSockets.
   * Can be fully enabled once 'mqtt' package is installed.
   */
  async initRealMqtt() {
    try {
      // Dynamic import with variable string to completely bypass Vite static analysis
      const libraryName = 'mqtt';
      const mqtt = await import(/* @vite-ignore */ libraryName);
      this.client = mqtt.connect(REAL_MQTT_BROKER_URL, {
        clientId: 'cempai_dashboard_' + Math.random().toString(16).substring(2, 8),
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      });

      this.client.on('connect', () => {
        console.log('[MQTT] Connected to HiveMQ Broker!');
        // Re-subscribe to all existing local topics
        Object.keys(this.subscribers).forEach(topic => {
          this.client.subscribe(topic);
        });
      });

      this.client.on('message', (topic, message) => {
        try {
          const parsed = JSON.parse(message.toString());
          this.triggerLocalPublish(topic, parsed);
        } catch (e) {
          console.error(`[MQTT] Failed to parse message on topic: ${topic}`, e);
        }
      });

      this.client.on('error', (err) => {
        console.error('[MQTT] Connection error:', err);
      });
    } catch (e) {
      console.warn('[MQTT] Real client initialization failed, falling back to mock.', e);
    }
  }

  /**
   * Subscribes a callback function to an MQTT topic.
   * Returns a cleanup unsubscribe function.
   */
  subscribe(topic, callback) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = [];
      if (USE_REAL_MQTT && this.client && this.client.connected) {
        this.client.subscribe(topic);
      }
    }
    this.subscribers[topic].push(callback);

    return () => this.unsubscribe(topic, callback);
  }

  /**
   * Unsubscribes a callback from a topic.
   */
  unsubscribe(topic, callback) {
    if (!this.subscribers[topic]) return;
    this.subscribers[topic] = this.subscribers[topic].filter(cb => cb !== callback);
    if (this.subscribers[topic].length === 0) {
      delete this.subscribers[topic];
      if (USE_REAL_MQTT && this.client && this.client.connected) {
        this.client.unsubscribe(topic);
      }
    }
  }

  /**
   * Publishes a message to a topic.
   * If not connected to real broker, triggers subscribers locally.
   */
  publish(topic, payload) {
    if (USE_REAL_MQTT && this.client && this.client.connected) {
      const msgStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.client.publish(topic, msgStr);
    } else {
      // Local/mock routing
      this.triggerLocalPublish(topic, payload);
    }
  }

  /**
   * Triggers subscribers locally
   */
  triggerLocalPublish(topic, payload) {
    const callbacks = this.subscribers[topic];
    if (callbacks) {
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      callbacks.forEach(cb => {
        try {
          cb(parsedPayload);
        } catch (e) {
          console.error(`[MQTT] Error in subscriber callback for topic: ${topic}`, e);
        }
      });
    }
  }
}

export const MqttService = new MqttBroker();
