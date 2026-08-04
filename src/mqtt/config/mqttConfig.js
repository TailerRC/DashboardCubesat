import mqtt from 'mqtt';

// ── MQTT Service — Modular Pub-Sub Broker ───────────────────────────────────
// Acts as a client wrapper. In development, it uses an in-memory pub-sub bus.
// To switch to a live broker (e.g. HiveMQ over WebSockets), set USE_REAL_MQTT to true
// and configure the broker URL.

const USE_REAL_MQTT = true;
const REAL_MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

class MqttBroker {
  constructor() {
    this.subscribers = {};
    this.statusSubscribers = [];
    this.client = null;
    this.isConnected = false;

    if (USE_REAL_MQTT) {
      this.initRealMqtt();
    }
  }

  /**
   * Subscribes a listener to WebSocket connection status changes.
   */
  subscribeStatus(callback) {
    this.statusSubscribers.push(callback);
    callback(this.isConnected);
    return () => {
      this.statusSubscribers = this.statusSubscribers.filter(cb => cb !== callback);
    };
  }

  notifyStatus(connected) {
    this.isConnected = connected;
    this.statusSubscribers.forEach(cb => {
      try {
        cb(connected);
      } catch (e) {
        console.error('[MQTT] Error in status callback', e);
      }
    });
  }

  /**
   * Initializes connection to real MQTT broker over WebSockets.
   */
  async initRealMqtt() {
    try {
      this.client = mqtt.connect(REAL_MQTT_BROKER_URL, {
        clientId: 'cempai_dashboard_' + Math.random().toString(16).substring(2, 8),
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 2000,
        keepalive: 60
      });

      this.client.on('connect', () => {
        console.log('[MQTT] Connected to HiveMQ Broker!');
        this.notifyStatus(true);
        // Re-subscribe to all existing local topics
        Object.keys(this.subscribers).forEach(topic => {
          this.client.subscribe(topic);
        });
      });

      this.client.on('offline', () => {
        console.warn('[MQTT] Broker offline.');
        this.notifyStatus(false);
      });

      this.client.on('close', () => {
        this.notifyStatus(false);
      });

      this.client.on('message', (topic, message) => {
        const rawStr = message.toString();
        try {
          const parsed = JSON.parse(rawStr);
          this.triggerLocalPublish(topic, parsed);
        } catch (e) {
          console.error(`[MQTT] Failed to parse message on topic: ${topic}. Raw payload: "${rawStr}"`, e);
        }
      });

      this.client.on('error', (err) => {
        console.error('[MQTT] Connection error:', err);
        this.notifyStatus(false);
      });
    } catch (e) {
      console.warn('[MQTT] Real client initialization failed, falling back to mock.', e);
      this.notifyStatus(false);
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
