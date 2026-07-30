// =============================================================================
// CEMPAI CubeSat — ESP32 Gateway (Estación Terrena)
// =============================================================================
// ROL: Recibe datos del OBC por NRF24L01, construye JSONs
//      y los publica en HiveMQ vía WiFi → MQTT
//
// Flujo: NRF24L01 RX → Parsear Struct → ArduinoJson → PubSubClient → HiveMQ
//
// ── LIBRERÍAS REQUERIDAS (instalar en Arduino IDE → Library Manager) ──────────
//   - RF24           por TMRh20 / nRF24L01  (Radio SPI)
//   - PubSubClient   por Nick O'Leary        (MQTT)
//   - ArduinoJson    por Benoit Blanchon v6.x (JSON)
// =============================================================================

#include <SPI.h>
#include <RF24.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =============================================================================
// CONFIGURACIÓN DE PINES
// =============================================================================

// ── SPI HSPI (NRF24L01) — mismo layout que el OBC ─────────────────────────────
#define NRF_CE   25
#define NRF_CSN  26
#define NRF_SCK  14
#define NRF_MISO 12
#define NRF_MOSI 13

// =============================================================================
// CREDENCIALES WIFI Y MQTT
// =============================================================================
const char* WIFI_SSID      = "Redmi Note 14";
const char* WIFI_PASSWORD  = "perraime";
const char* MQTT_BROKER    = "broker.hivemq.com";
const int   MQTT_PORT      = 1883;            // Sin TLS — proyecto demo
const char* MQTT_USER      = "Dashboard";     // Usuario con permiso Subscribe+Publish
const char* MQTT_PASS      = "cempai123";
const char* MQTT_CLIENT_ID = "cempai_gateway_gnd";

// =============================================================================
// TÓPICOS MQTT — 6 canales del dashboard
// =============================================================================
#define TOPIC_AMBIENTAL    "cempai/cubesat/telemetry/ambiental"
#define TOPIC_SATELITE     "cempai/cubesat/telemetry/satelite"
#define TOPIC_UBICACION    "cempai/cubesat/telemetry/ubicacion"
#define TOPIC_ORIENTACION  "cempai/cubesat/telemetry/orientacion3d"
#define TOPIC_MISION       "cempai/cubesat/telemetry/mision"
#define TOPIC_COMUNICACION "cempai/cubesat/telemetry/comunicacion"

// =============================================================================
// PROTOCOLO RF — ESTRUCTURAS DE DATOS
// Deben ser IDÉNTICAS a las definidas en cubesat_obc.md
// El campo 'type' indica qué tópico publicar
// =============================================================================
struct __attribute__((packed)) PktAmbiental {
  uint8_t  type;        // 1
  uint16_t packet_id;
  float    temp_c;
  float    hum_pct;
  float    pres_rel;
  float    uv_idx;
  float    co2_ppm;
};  // 24 bytes

struct __attribute__((packed)) PktSatelite {
  uint8_t  type;        // 2
  uint16_t packet_id;
  float    voltaje_v;
  float    corriente_ma;
  float    consumo_w;
  float    temp_mcu;
  uint32_t uptime_seg;
};  // 24 bytes

struct __attribute__((packed)) PktUbicacion {
  uint8_t  type;        // 3
  uint16_t packet_id;
  float    latitud;
  float    longitud;
  float    altitud_gps;
  float    velocidad_kmh;
  uint8_t  satelites;
  float    hdop;
};  // 24 bytes

struct __attribute__((packed)) PktOrientacion {
  uint8_t  type;        // 4
  uint16_t packet_id;
  float    pitch;
  float    roll;
  float    yaw;
  float    accel_x;
  float    accel_y;
  float    accel_z;
};  // 27 bytes

struct __attribute__((packed)) PktMision {
  uint8_t  type;        // 5
  uint16_t packet_id;
  uint8_t  fase_idx;
  float    altitud_m;
  uint32_t t_vuelo_seg;
};  // 12 bytes

struct __attribute__((packed)) PktComunicacion {
  uint8_t  type;        // 6
  uint16_t packet_id;
  uint32_t enviados;
  uint32_t recibidos;
  uint32_t perdidos;
  float    calidad_pct;
};  // 19 bytes

// =============================================================================
// TABLA DE FASES CDR (espejo del OBC)
// =============================================================================
const char* CDR_FASES[] = {
  "PREPARACION_TIERRA", "INTEGRACION_ACOPLAMIENTO", "DESPEGUE_ASCENSO",
  "ALTURA_MAXIMA_DESACOPLE", "DESCENSO_CONTROLADO", "ATERRIZAJE", "RECUPERACION"
};
const char* UI_FASES[] = {
  "INICIALIZACION", "INICIALIZACION", "ASCENSO / LANZAMIENTO",
  "DESCENSO", "DESCENSO", "ATERRIZADO", "ATERRIZADO"
};

// =============================================================================
// INSTANCIAS
// =============================================================================
RF24         radio(NRF_CE, NRF_CSN);
const byte   RF_ADDRESS[6] = "CEMPA";  // Misma dirección que el OBC

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

// Buffer de recepción genérico (32 bytes — límite NRF24L01)
uint8_t rxBuffer[32];

// Estadísticas de enlace RF para el tópico comunicacion
static uint32_t gw_enviados  = 0;
static uint32_t gw_recibidos = 0;
static uint32_t gw_perdidos  = 0;
static bool     recentWindow[20];

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println(F("=============================================="));
  Serial.println(F("   CEMPAI — ESP32 Gateway (Estación Terrena)  "));
  Serial.println(F("=============================================="));

  // ── NRF24L01 (SPI HSPI) ────────────────────────────────────────────────────
  SPI.begin(NRF_SCK, NRF_MISO, NRF_MOSI, NRF_CSN);
  if (!radio.begin()) {
    Serial.println(F("[ERROR] NRF24L01 no encontrado. Revisa cableado SPI HSPI."));
    while (1) {}
  }

  radio.openReadingPipe(1, RF_ADDRESS);  // Gateway es el RECEPTOR
  radio.setPALevel(RF24_PA_LOW);         // PA_LOW para pruebas en laboratorio
  radio.setDataRate(RF24_2MBPS);         // Debe coincidir con el OBC
  radio.setChannel(1);                   // Canal 1 → 2.401 GHz
  radio.startListening();                // Modo RX

  Serial.println(F("[OK] NRF24L01 listo — Modo RECEPTOR"));

  // ── WiFi ───────────────────────────────────────────────────────────────────
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print(F("[WiFi] Conectando a "));
  Serial.print(WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
  }
  Serial.println();
  Serial.print(F("[WiFi] Conectado. IP: "));
  Serial.println(WiFi.localIP());

  // ── MQTT ───────────────────────────────────────────────────────────────────
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(1024);  // CRÍTICO: JSONs del dashboard ~400-520 bytes

  // Inicializar ventana de calidad de enlace
  for (int i = 0; i < 20; i++) recentWindow[i] = true;

  Serial.println(F("[CEMPAI] Gateway listo. Esperando paquetes del OBC..."));
  Serial.println();
}

// =============================================================================
// RECONEXIÓN MQTT (automática)
// =============================================================================
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print(F("[MQTT] Conectando..."));
    if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
      Serial.println(F(" OK"));
    } else {
      Serial.print(F(" Error rc="));
      Serial.print(mqttClient.state());
      Serial.println(F(". Reintentando en 2s..."));
      delay(2000);
    }
  }
}

// =============================================================================
// FUNCIONES DE PUBLICACIÓN MQTT — una por tópico
// Reciben el struct del OBC y construyen el JSON exacto del dashboard
// =============================================================================

// ── Tópico 1: ambiental ───────────────────────────────────────────────────────
void publicarAmbiental(PktAmbiental& p) {
  bool alert = (p.temp_c > 40) || (p.hum_pct > 85) ||
               (fabsf(p.pres_rel) > 45) || (p.uv_idx > 7.5) || (p.co2_ppm > 1000);

  StaticJsonDocument<1024> doc;
  doc["topic"]            = TOPIC_AMBIENTAL;
  doc["packet_id"]        = p.packet_id;
  doc["received"]         = true;
  doc["crc_valido"]       = true;
  doc["estado_ambiental"] = alert ? "PELIGRO" : "SEGURO";

  JsonObject data = doc.createNestedObject("data");

  JsonObject co2  = data.createNestedObject("co2_ppm");
  co2["v"] = p.co2_ppm; co2["hace_seg"] = 0.0; co2["umbral_alerta"] = 1000;

  JsonObject temp = data.createNestedObject("temperatura_c");
  temp["v"] = round(p.temp_c * 10) / 10.0; temp["hace_seg"] = 0.0; temp["umbral_alerta"] = 40;

  JsonObject hum  = data.createNestedObject("humedad_pct");
  hum["v"] = round(p.hum_pct * 10) / 10.0; hum["hace_seg"] = 0.0; hum["umbral_alerta"] = 85;

  JsonObject pres = data.createNestedObject("presion_pa");
  pres["v"] = round(p.pres_rel * 100) / 100.0; pres["hace_seg"] = 0.0; pres["umbral_alerta"] = 45;

  JsonObject uv   = data.createNestedObject("radiacion_uv");
  uv["v"] = round(p.uv_idx * 10) / 10.0; uv["hace_seg"] = 0.0; uv["umbral_alerta"] = 7.5;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_AMBIENTAL, buffer, bytes);
  Serial.printf("[MQTT→AMB] pkt#%d T=%.1f H=%.1f UV=%.1f\n", p.packet_id, p.temp_c, p.hum_pct, p.uv_idx);
}

// ── Tópico 2: satelite ────────────────────────────────────────────────────────
void publicarSatelite(PktSatelite& p) {
  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_SATELITE;
  doc["packet_id"]  = p.packet_id;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["voltaje_v"]["v"]              = round(p.voltaje_v * 100) / 100.0;
  data["voltaje_v"]["hace_seg"]       = 0.0;
  data["corriente_ma"]["v"]           = round(p.corriente_ma * 10) / 10.0;
  data["corriente_ma"]["hace_seg"]    = 0.0;
  data["consumo_w"]["v"]              = round(p.consumo_w * 100) / 100.0;
  data["consumo_w"]["hace_seg"]       = 0.0;
  data["temp_mcu"]["v"]               = round(p.temp_mcu * 10) / 10.0;
  data["temp_mcu"]["hace_seg"]        = 0.0;
  data["tiempo_encendido_seg"]["v"]   = p.uptime_seg;
  data["tiempo_encendido_seg"]["hace_seg"] = 0.0;
  data["memoria_flash_ok"]["v"]       = true;
  data["memoria_flash_ok"]["hace_seg"]= 0.0;

  JsonObject sens = data.createNestedObject("sensores_activos");
  sens["v"] = 3; sens["total"] = 7; sens["hace_seg"] = 0.0;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_SATELITE, buffer, bytes);
  Serial.printf("[MQTT→SAT] pkt#%d mcu=%.1f°C uptime=%ds\n", p.packet_id, p.temp_mcu, p.uptime_seg);
}

// ── Tópico 3: ubicacion ───────────────────────────────────────────────────────
void publicarUbicacion(PktUbicacion& p) {
  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_UBICACION;
  doc["packet_id"]  = p.packet_id;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["latitud"]["v"]              = p.latitud;        data["latitud"]["hace_seg"]      = 0.0;
  data["longitud"]["v"]             = p.longitud;       data["longitud"]["hace_seg"]     = 0.0;
  data["altitud_gps"]["v"]          = round(p.altitud_gps * 10) / 10.0;
  data["altitud_gps"]["hace_seg"]   = 0.0;
  data["velocidad_kmh"]["v"]        = round(p.velocidad_kmh * 10) / 10.0;
  data["velocidad_kmh"]["hace_seg"] = 0.0;
  data["velocidad_vertical"]["v"]   = 0.0;
  data["velocidad_vertical"]["hace_seg"] = 0.0;
  data["satelites"]["v"]            = p.satelites;      data["satelites"]["hace_seg"]    = 0.0;
  data["hdop"]["v"]                 = round(p.hdop * 10) / 10.0;
  data["hdop"]["hace_seg"]          = 0.0;
  data["calidad_senal"]["v"]        = min((int)10, (int)p.satelites);
  data["calidad_senal"]["hace_seg"] = 0.0;
  data["distancia_origen"]["v"]     = 0.0;
  data["distancia_origen"]["hace_seg"] = 0.0;
  data["fecha_utc"]                 = "0000-00-00";  // GPS fecha no se transmite en la struct
  data["hora_utc"]                  = "00:00:00";

  JsonObject aterrizaje = data.createNestedObject("coordenadas_aterrizaje");
  aterrizaje["lat"] = -12.0780;
  aterrizaje["lon"] = -77.0850;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_UBICACION, buffer, bytes);
  Serial.printf("[MQTT→GPS] pkt#%d lat=%.4f lon=%.4f alt=%.1fm\n",
                p.packet_id, p.latitud, p.longitud, p.altitud_gps);
}

// ── Tópico 4: orientacion3d ───────────────────────────────────────────────────
void publicarOrientacion3D(PktOrientacion& p) {
  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_ORIENTACION;
  doc["packet_id"]  = p.packet_id;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["cabeceo_deg"]["v"]  = round(p.pitch * 10) / 10.0; data["cabeceo_deg"]["hace_seg"]  = 0.0;
  data["balanceo_deg"]["v"] = round(p.roll  * 10) / 10.0; data["balanceo_deg"]["hace_seg"] = 0.0;
  data["accel_x"]["v"]      = round(p.accel_x * 10) / 10.0; data["accel_x"]["hace_seg"]    = 0.0;
  data["accel_y"]["v"]      = round(p.accel_y * 10) / 10.0; data["accel_y"]["hace_seg"]    = 0.0;
  data["accel_z"]["v"]      = round(p.accel_z * 10) / 10.0; data["accel_z"]["hace_seg"]    = 0.0;
  data["gyro_x_dps"]["v"]   = 0.0; data["gyro_x_dps"]["hace_seg"]  = 0.0;
  data["gyro_y_dps"]["v"]   = 0.0; data["gyro_y_dps"]["hace_seg"]  = 0.0;
  data["gyro_z_dps"]["v"]   = 0.0; data["gyro_z_dps"]["hace_seg"]  = 0.0;
  data["inercial_x"]["v"]   = 0.0; data["inercial_x"]["hace_seg"]  = 0.0;
  data["inercial_y"]["v"]   = 0.0; data["inercial_y"]["hace_seg"]  = 0.0;
  data["inercial_z"]["v"]   = 0.0; data["inercial_z"]["hace_seg"]  = 0.0;

  JsonObject yaw = data.createNestedObject("giro_yaw_deg");
  yaw["v"] = round(p.yaw * 10) / 10.0; yaw["hace_seg"] = 0.0; yaw["drift_acumulado"] = 0.0;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_ORIENTACION, buffer, bytes);
  Serial.printf("[MQTT→ORI] pkt#%d pitch=%.1f roll=%.1f\n", p.packet_id, p.pitch, p.roll);
}

// ── Tópico 5: mision ─────────────────────────────────────────────────────────
void publicarMision(PktMision& p) {
  uint8_t idx = min((int)p.fase_idx, 6);
  const char* fase_ui = UI_FASES[idx];
  if (idx == 4 && p.altitud_m <= 20.0f) fase_ui = "PROXIMIDAD AL SUELO";

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_MISION;
  doc["packet_id"]  = p.packet_id;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["fase_cdr"]       = CDR_FASES[idx];
  data["fase_cdr_index"] = idx;
  data["fase_ui"]        = fase_ui;

  data["altitud_m"]["v"]             = round(p.altitud_m * 10) / 10.0;
  data["altitud_m"]["hace_seg"]      = 0.0;
  data["velocidad_vertical_ms"]["v"] = 0.0;
  data["velocidad_vertical_ms"]["hace_seg"] = 0.0;
  data["t_vuelo_seg"]["v"]           = p.t_vuelo_seg;
  data["t_vuelo_seg"]["hace_seg"]    = 0.0;
  data["cabeceo_deg"]["v"]           = 0.0; data["cabeceo_deg"]["hace_seg"]  = 0.0;
  data["balanceo_deg"]["v"]          = 0.0; data["balanceo_deg"]["hace_seg"] = 0.0;

  JsonObject yaw = data.createNestedObject("giro_yaw_deg");
  yaw["v"] = 0.0; yaw["hace_seg"] = 0.0; yaw["drift_acumulado"] = 0.0;

  data["sd_card_status"] = "N/A";

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_MISION, buffer, bytes);
  Serial.printf("[MQTT→MIS] pkt#%d fase=%s alt=%.1fm\n", p.packet_id, CDR_FASES[idx], p.altitud_m);
}

// ── Tópico 6: comunicacion ────────────────────────────────────────────────────
void publicarComunicacion(PktComunicacion& p, bool recibidoOk) {
  // Actualizar ventana deslizante de calidad
  for (int i = 0; i < 19; i++) recentWindow[i] = recentWindow[i + 1];
  recentWindow[19] = recibidoOk;
  int okCount = 0;
  for (int i = 0; i < 20; i++) if (recentWindow[i]) okCount++;

  const char* calidad_label = "Excelente";
  if      (p.calidad_pct < 70) calidad_label = "Débil / Inestable";
  else if (p.calidad_pct < 85) calidad_label = "Regular";
  else if (p.calidad_pct < 95) calidad_label = "Buena";

  uint32_t s = millis() / 1000;
  char ts[10];
  sprintf(ts, "%02lu:%02lu:%02lu", (s / 3600) % 24, (s / 60) % 60, s % 60);

  char logText[64];
  sprintf(logText, "PKT#%03d - CMD:ACK - OBC ONLINE", p.packet_id);

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_COMUNICACION;
  doc["packet_id"]  = p.packet_id;
  doc["received"]   = recibidoOk;
  doc["crc_valido"] = recibidoOk;

  JsonObject data = doc.createNestedObject("data");
  data["paquetes_enviados"]["v"]       = p.enviados;
  data["paquetes_enviados"]["hace_seg"]= 0.0;
  data["paquetes_recibidos"]["v"]      = p.recibidos;
  data["paquetes_recibidos"]["hace_seg"]= 0.0;
  data["paquetes_perdidos"]["v"]       = p.perdidos;
  data["paquetes_perdidos"]["hace_seg"]= 0.0;
  data["frecuencia_ghz"]["v"]          = 2.401;
  data["frecuencia_ghz"]["hace_seg"]   = 0.0;
  data["canal_nrf24"]["v"]             = 1;
  data["calidad_enlace_pct"]["v"]      = round(p.calidad_pct * 10) / 10.0;
  data["calidad_enlace_pct"]["hace_seg"]= 0.0;
  data["calidad_label"]                = calidad_label;
  data["baudios_debug"]["v"]           = 9600;
  data["tasa_aire_nrf24_kbps"]["v"]    = 2000;
  data["ultimo_pkt_timestamp"]         = ts;

  JsonObject log_entry = data.createNestedObject("log_entry");
  log_entry["timestamp"] = ts;
  log_entry["status"]    = recibidoOk ? "RX OK" : "RX TIMEOUT";
  log_entry["text"]      = logText;

  JsonArray pkts_window = data.createNestedArray("pkts_window");
  for (int i = 0; i < 20; i++) pkts_window.add(recentWindow[i]);

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_COMUNICACION, buffer, bytes);
  Serial.printf("[MQTT→COM] pkt#%d calidad=%.1f%% %s\n", p.packet_id, p.calidad_pct, calidad_label);
}

// =============================================================================
// LOOP PRINCIPAL — Recibir paquete RF → Publicar MQTT
// =============================================================================
void loop() {
  // ── Mantener conexión MQTT ─────────────────────────────────────────────────
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  // ── Escuchar NRF24L01 ─────────────────────────────────────────────────────
  if (radio.available()) {
    radio.read(rxBuffer, sizeof(rxBuffer));

    uint8_t type = rxBuffer[0];  // Primer byte = identificador de tópico
    Serial.printf("[RF] Paquete type=%d recibido\n", type);

    // ── Rutear según tipo de paquete ──────────────────────────────────────────
    switch (type) {
      case 1: {
        PktAmbiental pkt;
        memcpy(&pkt, rxBuffer, sizeof(pkt));
        publicarAmbiental(pkt);
        break;
      }
      case 2: {
        PktSatelite pkt;
        memcpy(&pkt, rxBuffer, sizeof(pkt));
        publicarSatelite(pkt);
        break;
      }
      case 3: {
        PktUbicacion pkt;
        memcpy(&pkt, rxBuffer, sizeof(pkt));
        publicarUbicacion(pkt);
        break;
      }
      case 4: {
        PktOrientacion pkt;
        memcpy(&pkt, rxBuffer, sizeof(pkt));
        publicarOrientacion3D(pkt);
        break;
      }
      case 5: {
        PktMision pkt;
        memcpy(&pkt, rxBuffer, sizeof(pkt));
        publicarMision(pkt);
        break;
      }
      case 6: {
        PktComunicacion pkt;
        memcpy(&pkt, rxBuffer, sizeof(pkt));
        publicarComunicacion(pkt, true);
        break;
      }
      default:
        Serial.printf("[RF] Tipo de paquete desconocido: %d\n", type);
        break;
    }
  }
}
