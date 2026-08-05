// =============================================================================
// CEMPAI CubeSat — Firmware ESP32 OBC con MQTT
// =============================================================================
// Sensores ACTIVOS   : GPS NEO-7M · BME280/BMP280 · GUVA-S12SD · MPU6050 · MQ135
// Sensores PENDIENTES: INA219 · NRF24L01
//                      (pines asignados, descomentar al conectar)
// Broker : broker.hivemq.com:1883 (sin TLS — proyecto demo)
// Usuario: ESP32 / cempai123
// =============================================================================
//
// ── LIBRERÍAS REQUERIDAS (instalar en Arduino IDE → Library Manager) ──────────
//   - PubSubClient       por Nick O'Leary          (MQTT)
//   - ArduinoJson        por Benoit Blanchon  v6.x  (JSON)
//   - TinyGPS++          por Mikal Hart             (GPS NMEA) — ya instalada
//   - Adafruit INA219    por Adafruit               (PENDIENTE)
//   - RF24               por TMRh20                  (PENDIENTE)
// =============================================================================

// ── Librerías ACTIVAS ─────────────────────────────────────────────────────────
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <Wire.h>

// ── Librerías PENDIENTES (descomentar al conectar el sensor físico) ───────────
// #include <Adafruit_INA219.h>   // INA219  — I2C addr 0x40
// #include <RF24.h>              // NRF24L01 — SPI HSPI

// =============================================================================
// CONFIGURACIÓN DE PINES Y DIRECCIONES I2C
// =============================================================================

// ── UART2 (GPS NEO-7M) — ACTIVO ──────────────────────────────────────────────
#define RXD2     16      // Pin RX2 del ESP32 → conectar a TXD del GPS
#define TXD2     17      // Pin TX2 del ESP32 → conectar a RXD del GPS
#define GPS_BAUD 9600

// ── I2C Bus — ACTIVO (compartido: BME280/BMP280 · INA219 · MPU6050) ───────────
#define SDA_PIN      21
#define SCL_PIN      22
#define BME_ADDR     0x76   // [ACTIVO]   BME280 / BMP280 en 0x76
#define MPU_ADDR     0x69   // [ACTIVO]   MPU6050 (AD0 en VCC/HIGH) en 0x69
//   INA219  → 0x40          [PENDIENTE]

// ── ADC (GUVA-S12SD) — ACTIVO ────────────────────────────────────────────────
#define UV_PIN    4      // Entrada analógica, solo lectura

// ── ADC (MQ135) — ACTIVO ──────────────────────────────────────────────────────
#define MQ135_PIN 34     // Input-only pin (resistente a 3.3V). Entrada analógica de gas.

// ── SPI HSPI (NRF24L01) — PENDIENTE ─────────────────────────────────────────
#define NRF_MOSI 13
#define NRF_MISO 12
#define NRF_SCK  14
#define NRF_CE   25
#define NRF_CSN  26

// =============================================================================
// CREDENCIALES WIFI Y MQTT
// =============================================================================
const char* WIFI_SSID      = "elias";
const char* WIFI_PASSWORD  = "perraime";
const char* MQTT_BROKER    = "broker.hivemq.com";
const int   MQTT_PORT      = 1883;            // Sin TLS — demo
const char* MQTT_USER      = "ESP32";
const char* MQTT_PASS      = "cempai123";
const char* MQTT_CLIENT_ID = "cempai_esp32_obc";

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
// INSTANCIAS Y VARIABLES GLOBALES
// =============================================================================

// ── GPS ──────────────────────────────────────────────────────────────────────
TinyGPSPlus      gps;
HardwareSerial   gpsSerial(2);

// ── BME280/BMP280 (I2C Directo Wire) ─────────────────────────────────────────
static bool bmeOk = false;
uint16_t dig_T1, dig_P1;
int16_t  dig_T2, dig_T3, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9;
int32_t  t_fine = 0;
float    presionInicial_hPa = 0.0f;
bool     bmeCalibrado = false;

// ── MPU6050 (I2C Directo Wire) ───────────────────────────────────────────────
static bool mpuOk = false;
int16_t rawAX = 0, rawAY = 0, rawAZ = 0;
float   rollInicial  = 0.0f;
float   pitchInicial = 0.0f;
bool    mpuCalibrado = false;

// ── WiFi y MQTT ───────────────────────────────────────────────────────────────
WiFiClient       espClient;
PubSubClient     mqttClient(espClient);

// ── Sensores PENDIENTES (descomentar al conectar el hardware) ─────────────────
// Adafruit_INA219 ina219;          // I2C SDA=21, SCL=22, addr 0x40
// RF24            radio(NRF_CE, NRF_CSN); // SPI HSPI MOSI=13,MISO=12,SCK=14

// ── Contadores de paquetes por tópico ────────────────────────────────────────
static uint32_t pkt_amb = 1000;
static uint32_t pkt_sat = 3000;
static uint32_t pkt_gps = 2000;
static uint32_t pkt_ori = 4000;
static uint32_t pkt_mis = 5000;
static uint32_t pkt_com = 6000;

// ── Estadísticas de comunicación (emuladas hasta conectar NRF24L01) ──────────
static uint32_t totalEnviados  = 0;
static uint32_t totalRecibidos = 0;
static uint32_t totalPerdidos  = 0;
static bool     recentWindow[20];

// ── Calibración de Altitud de Vuelo GPS (NEO-7M) ─────────────────────────────
static float altitudGpsBase    = 0.0f;
static bool  altitudGpsBaseSet = false;
static int   muestrasBaseGps   = 0;
static float sumaAltitudGps    = 0.0f;
const  int   MUESTRAS_CALIBRACION_GPS = 10;

// =============================================================================
// FUNCIONES AUXILIARES I2C — BME280/BMP280
// =============================================================================
uint16_t read16_LE(uint8_t reg) {
  Wire.beginTransmission(BME_ADDR);
  Wire.write(reg);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)BME_ADDR, (uint8_t)2);
  return (Wire.read() | (Wire.read() << 8));
}

int16_t readS16_LE(uint8_t reg) {
  return (int16_t)read16_LE(reg);
}

void cargarCalibracionBME() {
  dig_T1 = read16_LE(0x88);
  dig_T2 = readS16_LE(0x8A);
  dig_T3 = readS16_LE(0x8C);
  dig_P1 = read16_LE(0x8E);
  dig_P2 = readS16_LE(0x90);
  dig_P3 = readS16_LE(0x92);
  dig_P4 = readS16_LE(0x94);
  dig_P5 = readS16_LE(0x96);
  dig_P6 = readS16_LE(0x98);
  dig_P7 = readS16_LE(0x9A);
  dig_P8 = readS16_LE(0x9C);
  dig_P9 = readS16_LE(0x9E);
}

float obtenerTemperaturaBME() {
  Wire.beginTransmission(BME_ADDR);
  Wire.write(0xFA);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)BME_ADDR, (uint8_t)3);
  if (Wire.available() < 3) return 0.0f;
  
  int32_t adc_T = ((uint32_t)Wire.read() << 12) | ((uint32_t)Wire.read() << 4) | ((uint32_t)Wire.read() >> 4);
  int32_t var1 = ((((adc_T >> 3) - ((int32_t)dig_T1 << 1))) * ((int32_t)dig_T2)) >> 11;
  int32_t var2 = (((((adc_T >> 4) - ((int32_t)dig_T1)) * ((adc_T >> 4) - ((int32_t)dig_T1))) >> 12) * ((int32_t)dig_T3)) >> 14;
  t_fine = var1 + var2;
  return (float)((t_fine * 5 + 128) >> 8) / 100.0F;
}

float obtenerPresionBME() {
  obtenerTemperaturaBME(); // Actualiza t_fine
  Wire.beginTransmission(BME_ADDR);
  Wire.write(0xF7);
  Wire.endTransmission();
  Wire.requestFrom((uint8_t)BME_ADDR, (uint8_t)3);
  if (Wire.available() < 3) return 0.0f;

  int32_t adc_P = ((uint32_t)Wire.read() << 12) | ((uint32_t)Wire.read() << 4) | ((uint32_t)Wire.read() >> 4);
  int64_t var1 = ((int64_t)t_fine) - 128000;
  int64_t var2 = var1 * var1 * (int64_t)dig_P6;
  var2 = var2 + ((var1 * (int64_t)dig_P5) << 17);
  var2 = var2 + (((int64_t)dig_P4) << 35);
  var1 = ((var1 * var1 * (int64_t)dig_P3) >> 8) + ((var1 * (int64_t)dig_P2) << 12);
  var1 = (((((int64_t)1) << 47) + var1)) * ((int64_t)dig_P1) >> 33;

  if (var1 == 0) return 0.0f;

  int64_t p = 1048576 - adc_P;
  p = (((p << 31) - var2) * 3125) / var1;
  var1 = (((int64_t)dig_P9) * (p >> 13) * (p >> 13)) >> 25;
  var2 = (((int64_t)dig_P8) * p) >> 19;
  p = ((p + var1 + var2) >> 8) + (((int64_t)dig_P7) << 4);

  return (float)p / 25600.0F; // Retorna presión en hPa
}

// =============================================================================
// FUNCIONES AUXILIARES I2C — MPU6050
// =============================================================================
void obtenerAngulosMPU(float &roll, float &pitch) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)6, (uint8_t)true);

  if (Wire.available() >= 6) {
    rawAX = Wire.read() << 8 | Wire.read();
    rawAY = Wire.read() << 8 | Wire.read();
    rawAZ = Wire.read() << 8 | Wire.read();

    float ax = rawAX / 16384.0f;
    float ay = rawAY / 16384.0f;
    float az = rawAZ / 16384.0f;

    roll  = atan2(ay, az) * 180.0 / M_PI;
    pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / M_PI;
  }
}

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // ── GPS UART2 ──────────────────────────────────────────────────────────────
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, RXD2, TXD2);

  // ── I2C Bus (SDA=21, SCL=22) ──────────────────────────────────────────────
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  Serial.println(F("=========================================="));
  Serial.println(F("  CEMPAI CubeSat OBC — Firmware MQTT     "));
  Serial.println(F("=========================================="));
  Serial.print(F("TinyGPS++ v. "));
  Serial.println(TinyGPSPlus::libraryVersion());

  // ── Inicializar MPU6050 (Intenta en 0x69, fallback a 0x68) ──────────────────
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // Registro PWR_MGMT_1
  Wire.write(0);    // Despertar
  if (Wire.endTransmission() == 0) {
    mpuOk = true;
    Serial.printf("✅ MPU6050 Detectado e Inicializado en 0x%02X\n", MPU_ADDR);
  } else {
    // Intentar dirección alternativa 0x68 (AD0 a GND)
    Wire.beginTransmission(0x68);
    Wire.write(0x6B);
    Wire.write(0);
    if (Wire.endTransmission() == 0) {
      mpuOk = true;
      Serial.println(F("✅ MPU6050 Detectado e Inicializado en 0x68 (AD0 GND)"));
    } else {
      Serial.println(F("❌ Error: No responde MPU6050 ni en 0x69 ni en 0x68"));
    }
  }

  // ── Inicializar BME280/BMP280 (Intenta en 0x76, fallback a 0x77) ───────────
  Wire.beginTransmission(BME_ADDR);
  Wire.write(0xF4); // Registro control mediciones
  Wire.write(0x27); // Modo normal
  if (Wire.endTransmission() == 0) {
    cargarCalibracionBME();
    bmeOk = true;
    Serial.printf("✅ BME/BMP Detectado e Inicializado en 0x%02X\n", BME_ADDR);
  } else {
    // Intentar dirección alternativa 0x77 (SDO a VCC)
    Wire.beginTransmission(0x77);
    Wire.write(0xF4);
    Wire.write(0x27);
    if (Wire.endTransmission() == 0) {
      bmeOk = true;
      // Actualizar BME_ADDR temporalmente para lectura de registros
      #undef BME_ADDR
      #define BME_ADDR 0x77
      cargarCalibracionBME();
      Serial.println(F("✅ BME/BMP Detectado e Inicializado en 0x77 (SDO VCC)"));
    } else {
      Serial.println(F("❌ Error: No responde BME/BMP ni en 0x76 ni en 0x77"));
    }
  }

  // ── GUVA-S12SD (ADC Pin 4) — ACTIVO ───────────────────────────────────────
  pinMode(UV_PIN, INPUT);

  // ── MQ135 (ADC Pin 34) — ACTIVO ───────────────────────────────────────────
  pinMode(MQ135_PIN, INPUT);

  // ── REPORTE DE SENSORES HARDWARE AL ARRANQUE ──────────────────────────────
  Serial.println(F("\n=========================================="));
  Serial.println(F("       ESTADO DE SENSORES HARDWARE       "));
  Serial.println(F("=========================================="));
  Serial.println(F(" - GPS NEO-7M : ACTIVO (UART2 RX:16 TX:17)"));
  Serial.print(F(" - BME280/BMP : ")); Serial.println(bmeOk ? F("ACTIVO (I2C 0x76)") : F("NO DETECTADO"));
  Serial.print(F(" - MPU6050    : ")); Serial.println(mpuOk ? F("ACTIVO (I2C 0x69)") : F("NO DETECTADO"));
  Serial.println(F(" - GUVA-S12SD : ACTIVO (ADC Pin 4)"));
  Serial.println(F(" - MQ135      : ACTIVO (ADC Pin 34)"));
  Serial.println(F(" - INA219     : PENDIENTE (I2C 0x40)"));
  Serial.println(F(" - NRF24L01   : PENDIENTE (SPI HSPI)"));
  Serial.println(F("==========================================\n"));

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

  for (int i = 0; i < 20; i++) recentWindow[i] = true;

  Serial.println(F("[CEMPAI] OBC listo. Publicando telemetría cada 750ms..."));
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
// FUNCIONES DE IMPRESIÓN POR SERIAL
// =============================================================================

void imprimirUbicacion() {
  if (gps.location.isValid()) {
    Serial.print(F("Lat: "));
    Serial.print(gps.location.lat(), 6);
    Serial.print(F(" | Lng: "));
    Serial.print(gps.location.lng(), 6);
  } else {
    Serial.print(F("Ubicación: INVALIDA (Buscando satélites)"));
  }
}

void imprimirFechaHora() {
  Serial.print(F(" | Hora Local: "));

  if (gps.date.isValid() && gps.time.isValid()) {
    int dia    = gps.date.day();
    int mes    = gps.date.month();
    int anio   = gps.date.year();
    int hora   = gps.time.hour();
    int minuto = gps.time.minute();
    int segundo= gps.time.second();

    // Ajuste GMT-5 (Perú)
    hora -= 5;
    if (hora < 0) {
      hora += 24;
      dia -= 1;
      if (dia < 1) {
        mes -= 1;
        if (mes < 1) { mes = 12; anio -= 1; }
        if (mes == 2) dia = 28;
        else if (mes == 4 || mes == 6 || mes == 9 || mes == 11) dia = 30;
        else dia = 31;
      }
    }

    if (dia    < 10) Serial.print(F("0")); Serial.print(dia);    Serial.print(F("/"));
    if (mes    < 10) Serial.print(F("0")); Serial.print(mes);    Serial.print(F("/"));
    Serial.print(anio); Serial.print(F(" "));
    if (hora   < 10) Serial.print(F("0")); Serial.print(hora);   Serial.print(F(":"));
    if (minuto < 10) Serial.print(F("0")); Serial.print(minuto); Serial.print(F(":"));
    if (segundo< 10) Serial.print(F("0")); Serial.print(segundo);
  } else {
    Serial.print(F("INVALIDA"));
  }
}

void imprimirOtrosDatos() {
  Serial.print(F(" | Satélites: "));
  if (gps.satellites.isValid()) Serial.print(gps.satellites.value());
  else                          Serial.print(F("N/A"));

  Serial.print(F(" | Alt MSL: "));
  if (gps.altitude.isValid()) { Serial.print(gps.altitude.meters(), 1); Serial.print(F("m")); }
  else                          Serial.print(F("N/A"));

  Serial.print(F(" | Alt Vuelo: "));
  if (gps.altitude.isValid() && altitudGpsBaseSet) {
    float altVuelo = gps.altitude.meters() - altitudGpsBase;
    Serial.print(altVuelo, 1); Serial.print(F("m"));
  } else {
    Serial.print(F("Calibrando/No Fix"));
  }
}

void imprimirBME280() {
  if (bmeOk) {
    float tempBME = obtenerTemperaturaBME();
    float presBME = obtenerPresionBME(); // hPa

    if (!bmeCalibrado && presBME > 300.0f) {
      presionInicial_hPa = presBME;
      bmeCalibrado = true;
    }

    float altitudRelativaBaro = 0.0f;
    if (bmeCalibrado) {
      altitudRelativaBaro = 44330.0f * (1.0f - pow(presBME / presionInicial_hPa, 0.19029495f));
    }

    Serial.print(F(" | Temp: "));   Serial.print(tempBME, 1); Serial.print(F("°C"));
    Serial.print(F(" | Presión: ")); Serial.print(presBME, 1); Serial.print(F(" hPa"));
    Serial.print(F(" | Alt Baro: ")); Serial.print(altitudRelativaBaro, 1); Serial.print(F("m"));
  } else {
    Serial.print(F(" | BME280: N/A"));
  }
}

void imprimirUV() {
  int   uvValorAnalogico = analogRead(UV_PIN);
  float voltajeUV = (uvValorAnalogico / 4095.0f) * 3.3f;
  float indiceUV  = voltajeUV / 0.1f;
  Serial.print(F(" | UV: "));
  Serial.print(indiceUV, 1);
}

void imprimirMQ135() {
  int   mq_raw  = analogRead(MQ135_PIN);
  float mq_volt = (mq_raw / 4095.0f) * 3.3f;
  float co2_ppm = 400.0f + (mq_volt / 3.3f) * 1600.0f;
  Serial.print(F(" | CO2: "));
  Serial.print(co2_ppm, 0);
  Serial.print(F(" ppm"));
}

void imprimirMPU6050() {
  if (mpuOk) {
    float rollActual = 0.0f, pitchActual = 0.0f;
    obtenerAngulosMPU(rollActual, pitchActual);

    if (!mpuCalibrado) {
      rollInicial  = rollActual;
      pitchInicial = pitchActual;
      mpuCalibrado = true;
    }

    float rollRelativo  = rollActual - rollInicial;
    float pitchRelativo = pitchActual - pitchInicial;
    float accel_x_g     = rawAX / 16384.0f;

    Serial.print(F(" | Pitch: ")); Serial.print(pitchRelativo, 1); Serial.print(F("°"));
    Serial.print(F(" | Roll: "));  Serial.print(rollRelativo, 1);  Serial.print(F("°"));
    Serial.print(F(" | AccX: "));  Serial.print(accel_x_g, 2); Serial.print(F("g"));
  } else {
    Serial.print(F(" | MPU6050: N/A"));
  }
}

// =============================================================================
// FUNCIONES MQTT — PUBLICAR TÓPICOS
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// TÓPICO 1: ambiental
// ACTIVO   : BME280/BMP280 (temp · hum · presión relativa Pa) · GUVA-S12SD (UV) · MQ135 (CO2)
// ─────────────────────────────────────────────────────────────────────────────
void publicarAmbiental() {
  pkt_amb++;

  float temp_c   = 0.0f;
  float pres_hpa = 0.0f;
  float pres_pa  = 0.0f;
  float pres_rel_pa = 0.0f;

  if (bmeOk) {
    temp_c   = obtenerTemperaturaBME();
    pres_hpa = obtenerPresionBME();
    pres_pa  = pres_hpa * 100.0f; // hPa a Pa

    if (!bmeCalibrado && pres_hpa > 300.0f) {
      presionInicial_hPa = pres_hpa;
      bmeCalibrado = true;
    }

    if (bmeCalibrado) {
      pres_rel_pa = (pres_hpa - presionInicial_hPa) * 100.0f; // Pa relativos al despegue
    }
  }

  float hum_pct = 0.0f; // Si es BMP280 o no mide humedad, por defecto 0.0

  int   uv_raw  = analogRead(UV_PIN);
  float uv_volt = (uv_raw / 4095.0f) * 3.3f;
  float uv_idx  = constrain(uv_volt / 0.1f, 0.0f, 15.0f);

  int   mq_raw  = analogRead(MQ135_PIN);
  float mq_volt = (mq_raw / 4095.0f) * 3.3f;
  float co2_ppm = 400.0f + (mq_volt / 3.3f) * 1600.0f;

  bool alert = (temp_c > 40) || (hum_pct > 85) || (fabsf(pres_rel_pa) > 4500) || (uv_idx > 7.5);

  StaticJsonDocument<1024> doc;
  doc["topic"]            = TOPIC_AMBIENTAL;
  doc["packet_id"]        = pkt_amb;
  doc["received"]         = true;
  doc["crc_valido"]       = true;
  doc["estado_ambiental"] = alert ? "PELIGRO" : "SEGURO";

  JsonObject data = doc.createNestedObject("data");

  JsonObject co2  = data.createNestedObject("co2_ppm");
  co2["v"] = co2_ppm; co2["hace_seg"] = 0.0; co2["umbral_alerta"] = 1000;

  JsonObject temp = data.createNestedObject("temperatura_c");
  temp["v"] = round(temp_c * 10) / 10.0; temp["hace_seg"] = 0.0; temp["umbral_alerta"] = 40;

  JsonObject hum  = data.createNestedObject("humedad_pct");
  hum["v"] = round(hum_pct * 10) / 10.0; hum["hace_seg"] = 0.0; hum["umbral_alerta"] = 85;

  JsonObject pres = data.createNestedObject("presion_pa");
  pres["v"] = round(pres_rel_pa * 100) / 100.0; pres["hace_seg"] = 0.0; pres["umbral_alerta"] = 4500;

  JsonObject uv   = data.createNestedObject("radiacion_uv");
  uv["v"] = round(uv_idx * 10) / 10.0; uv["hace_seg"] = 0.0; uv["umbral_alerta"] = 7.5;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_AMBIENTAL, buffer, bytes);
  Serial.printf("[TX AMB] pkt#%d temp=%.1f presRel=%.1fPa uv=%.1f (%d bytes)\n",
                pkt_amb, temp_c, pres_rel_pa, uv_idx, bytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// TÓPICO 2: satelite
// ACTIVO   : ESP32 interno (temp MCU · uptime)
// PENDIENTE: INA219 → voltaje/corriente/consumo = 0.0 hasta conectar
// ─────────────────────────────────────────────────────────────────────────────
void publicarSatelite() {
  pkt_sat++;

  float    temp_mcu = temperatureRead();
  uint32_t uptime   = millis() / 1000;

  float voltaje_v    = 0.0f;
  float corriente_ma = 0.0f;
  float consumo_w    = 0.0f;

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_SATELITE;
  doc["packet_id"]  = pkt_sat;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["voltaje_v"]["v"]              = voltaje_v;    data["voltaje_v"]["hace_seg"]   = 0.0;
  data["corriente_ma"]["v"]           = corriente_ma; data["corriente_ma"]["hace_seg"]= 0.0;
  data["consumo_w"]["v"]              = consumo_w;    data["consumo_w"]["hace_seg"]   = 0.0;
  data["temp_mcu"]["v"]               = round(temp_mcu * 10) / 10.0;
  data["temp_mcu"]["hace_seg"]        = 0.0;
  data["tiempo_encendido_seg"]["v"]   = uptime;
  data["tiempo_encendido_seg"]["hace_seg"] = 0.0;
  data["memoria_flash_ok"]["v"]       = true;
  data["memoria_flash_ok"]["hace_seg"]= 0.0;

  JsonObject sens = data.createNestedObject("sensores_activos");
  sens["v"] = 5;  // 5 sensores activos (GPS, BME/BMP, GUVA, MPU6050, MQ135)
  sens["total"] = 7;
  sens["hace_seg"] = 0.0;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_SATELITE, buffer, bytes);
  Serial.printf("[TX SAT] pkt#%d temp_mcu=%.1f°C uptime=%ds\n", pkt_sat, temp_mcu, uptime);
}

// ─────────────────────────────────────────────────────────────────────────────
// TÓPICO 3: ubicacion
// ACTIVO: GPS NEO-7M (UART2 RX=16, TX=17)
// ─────────────────────────────────────────────────────────────────────────────
void publicarUbicacion() {
  if (!gps.location.isValid()) return;
  pkt_gps++;

  float altitud_msl = gps.altitude.isValid() ? (float)gps.altitude.meters() : 0.0f;
  float altitud_vuelo = 0.0f;

  if (!altitudGpsBaseSet && gps.altitude.isValid() && gps.hdop.isValid() && gps.hdop.hdop() <= 5.0f && gps.satellites.value() >= 4) {
    sumaAltitudGps += altitud_msl;
    muestrasBaseGps++;
    if (muestrasBaseGps >= MUESTRAS_CALIBRACION_GPS) {
      altitudGpsBase = sumaAltitudGps / (float)MUESTRAS_CALIBRACION_GPS;
      altitudGpsBaseSet = true;
      Serial.printf("[GPS CALIBRADO] Altitud Base Lanzamiento (MSL): %.2fm\n", altitudGpsBase);
    }
  }

  if (altitudGpsBaseSet) {
    altitud_vuelo = altitud_msl - altitudGpsBase;
  }

  char fecha[12]   = "0000-00-00";
  char hora_str[10] = "00:00:00";

  if (gps.date.isValid())
    sprintf(fecha, "%04d-%02d-%02d", gps.date.year(), gps.date.month(), gps.date.day());

  if (gps.time.isValid()) {
    int h = gps.time.hour() - 5;
    if (h < 0) h += 24;
    sprintf(hora_str, "%02d:%02d:%02d", h, gps.time.minute(), gps.time.second());
  }

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_UBICACION;
  doc["packet_id"]  = pkt_gps;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["latitud"]["v"]            = gps.location.lat();
  data["latitud"]["hace_seg"]     = 0.0;
  data["longitud"]["v"]           = gps.location.lng();
  data["longitud"]["hace_seg"]    = 0.0;
  data["altitud_gps"]["v"]        = round(altitud_vuelo * 10) / 10.0;
  data["altitud_gps"]["hace_seg"] = 0.0;
  data["altitud_gps_msl"]["v"]    = round(altitud_msl * 10) / 10.0;
  data["altitud_gps_msl"]["hace_seg"] = 0.0;
  data["velocidad_kmh"]["v"]      = round(gps.speed.kmph() * 10) / 10.0;
  data["velocidad_kmh"]["hace_seg"]  = 0.0;
  data["velocidad_vertical"]["v"]    = 0.0;
  data["velocidad_vertical"]["hace_seg"] = 0.0;
  data["satelites"]["v"]          = gps.satellites.value();
  data["satelites"]["hace_seg"]   = 0.0;
  data["hdop"]["v"]               = gps.hdop.hdop();
  data["hdop"]["hace_seg"]        = 0.0;
  data["calidad_senal"]["v"]      = min((uint32_t)10, (uint32_t)gps.satellites.value());
  data["calidad_senal"]["hace_seg"]  = 0.0;
  data["distancia_origen"]["v"]      = 0.0;
  data["distancia_origen"]["hace_seg"] = 0.0;
  data["fecha_utc"]               = fecha;
  data["hora_utc"]                = hora_str;

  JsonObject aterrizaje = data.createNestedObject("coordenadas_aterrizaje");
  aterrizaje["lat"] = -12.0780;
  aterrizaje["lon"] = -77.0850;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_UBICACION, buffer, bytes);
  Serial.printf("[TX GPS] pkt#%d lat=%.6f lon=%.6f altVuelo=%.1fm altMSL=%.1fm sats=%d\n",
                pkt_gps, gps.location.lat(), gps.location.lng(),
                altitud_vuelo, altitud_msl, gps.satellites.value());
}

// ─────────────────────────────────────────────────────────────────────────────
// TÓPICO 4: orientacion3d
// ACTIVO   : MPU6050 (I2C SDA=21, SCL=22, addr 0x69)
// ─────────────────────────────────────────────────────────────────────────────
void publicarOrientacion3D() {
  pkt_ori++;

  float accel_x = 0.0f, accel_y = 0.0f, accel_z = 0.0f;
  float gyro_x  = 0.0f, gyro_y  = 0.0f, gyro_z  = 0.0f;
  float pitchRelativo = 0.0f, rollRelativo = 0.0f;

  if (mpuOk) {
    float rollActual = 0.0f, pitchActual = 0.0f;
    obtenerAngulosMPU(rollActual, pitchActual);

    if (!mpuCalibrado) {
      rollInicial  = rollActual;
      pitchInicial = pitchActual;
      mpuCalibrado = true;
    }

    rollRelativo  = rollActual - rollInicial;
    pitchRelativo = pitchActual - pitchInicial;

    float accel_x_g = rawAX / 16384.0f;
    float accel_y_g = rawAY / 16384.0f;
    float accel_z_g = rawAZ / 16384.0f;

    accel_x = accel_x_g * 9.81f;
    accel_y = accel_y_g * 9.81f;
    accel_z = accel_z_g * 9.81f;
  }

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_ORIENTACION;
  doc["packet_id"]  = pkt_ori;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["cabeceo_deg"]["v"]   = round(pitchRelativo * 10) / 10.0;   data["cabeceo_deg"]["hace_seg"]  = 0.0;
  data["balanceo_deg"]["v"]  = round(rollRelativo * 10) / 10.0;    data["balanceo_deg"]["hace_seg"] = 0.0;
  data["accel_x"]["v"]       = round(accel_x * 100) / 100.0;       data["accel_x"]["hace_seg"]  = 0.0;
  data["accel_y"]["v"]       = round(accel_y * 100) / 100.0;       data["accel_y"]["hace_seg"]  = 0.0;
  data["accel_z"]["v"]       = round(accel_z * 100) / 100.0;       data["accel_z"]["hace_seg"]  = 0.0;
  data["gyro_x_dps"]["v"]    = round(gyro_x * 10) / 10.0;        data["gyro_x_dps"]["hace_seg"]   = 0.0;
  data["gyro_y_dps"]["v"]    = round(gyro_y * 10) / 10.0;        data["gyro_y_dps"]["hace_seg"]   = 0.0;
  data["gyro_z_dps"]["v"]    = round(gyro_z * 10) / 10.0;        data["gyro_z_dps"]["hace_seg"]   = 0.0;
  data["inercial_x"]["v"]    = round(accel_x * 100) / 100.0;       data["inercial_x"]["hace_seg"] = 0.0;
  data["inercial_y"]["v"]    = round(accel_y * 100) / 100.0;       data["inercial_y"]["hace_seg"] = 0.0;
  data["inercial_z"]["v"]    = round(accel_z * 100) / 100.0;       data["inercial_z"]["hace_seg"] = 0.0;

  JsonObject yaw = data.createNestedObject("giro_yaw_deg");
  yaw["v"] = 0.0; yaw["hace_seg"] = 0.0; yaw["drift_acumulado"] = 0.0;

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_ORIENTACION, buffer, bytes);
  Serial.printf("[TX ORI] pkt#%d pitch=%.1f° roll=%.1f° accX=%.2f\n", pkt_ori, pitchRelativo, rollRelativo, accel_x);
}

// ─────────────────────────────────────────────────────────────────────────────
// TÓPICO 5: mision
// ACTIVO   : altitud de vuelo del GPS · uptime del ESP32 · cabeceo/balanceo del MPU6050
// ─────────────────────────────────────────────────────────────────────────────
void publicarMision() {
  pkt_mis++;

  float    altitud_msl   = gps.altitude.isValid() ? (float)gps.altitude.meters() : 0.0f;
  float    altitud_vuelo = altitudGpsBaseSet ? (altitud_msl - altitudGpsBase) : 0.0f;
  uint32_t t_vuelo       = millis() / 1000;

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_MISION;
  doc["packet_id"]  = pkt_mis;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["fase_cdr"]       = "PREPARACION_TIERRA";
  data["fase_cdr_index"] = 0;
  data["fase_ui"]        = "INICIALIZACION";

  data["altitud_m"]["v"]             = round(altitud_vuelo * 10) / 10.0;
  data["altitud_m"]["hace_seg"]      = 0.0;
  data["velocidad_vertical_ms"]["v"] = 0.0;
  data["velocidad_vertical_ms"]["hace_seg"] = 0.0;
  data["t_vuelo_seg"]["v"]           = t_vuelo;
  data["t_vuelo_seg"]["hace_seg"]    = 0.0;

  float pitchRelativo = 0.0f, rollRelativo = 0.0f;
  if (mpuOk) {
    float r = 0.0f, p = 0.0f;
    obtenerAngulosMPU(r, p);
    if (!mpuCalibrado) {
      rollInicial = r;
      pitchInicial = p;
      mpuCalibrado = true;
    }
    rollRelativo = r - rollInicial;
    pitchRelativo = p - pitchInicial;
  }
  data["cabeceo_deg"]["v"]           = round(pitchRelativo * 10) / 10.0; data["cabeceo_deg"]["hace_seg"]  = 0.0;
  data["balanceo_deg"]["v"]          = round(rollRelativo * 10) / 10.0;  data["balanceo_deg"]["hace_seg"] = 0.0;

  JsonObject yaw = data.createNestedObject("giro_yaw_deg");
  yaw["v"] = 0.0; yaw["hace_seg"] = 0.0; yaw["drift_acumulado"] = 0.0;

  data["sd_card_status"] = "N/A";

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_MISION, buffer, bytes);
  Serial.printf("[TX MIS] pkt#%d altVuelo=%.1fm t=%ds\n", pkt_mis, altitud_vuelo, t_vuelo);
}

// ─────────────────────────────────────────────────────────────────────────────
// TÓPICO 6: comunicacion
// ACTIVO   : contadores de paquetes MQTT emulados vía WiFi
// ─────────────────────────────────────────────────────────────────────────────
void publicarComunicacion() {
  pkt_com++;
  totalEnviados++;

  for (int i = 0; i < 19; i++) recentWindow[i] = recentWindow[i + 1];
  recentWindow[19] = mqttClient.connected();

  if (mqttClient.connected()) totalRecibidos++;
  else                        totalPerdidos++;

  int okCount = 0;
  for (int i = 0; i < 20; i++) if (recentWindow[i]) okCount++;
  float calidad_pct = (okCount / 20.0f) * 100.0f;

  const char* calidad_label = "Excelente";
  if      (calidad_pct < 70) calidad_label = "Débil / Inestable";
  else if (calidad_pct < 85) calidad_label = "Regular";
  else if (calidad_pct < 95) calidad_label = "Buena";

  uint32_t s = millis() / 1000;
  char ts[10];
  sprintf(ts, "%02lu:%02lu:%02lu", (s / 3600) % 24, (s / 60) % 60, s % 60);

  char logText[64];
  sprintf(logText, "PKT#%03d - CMD:ACK - OBC ONLINE (WiFi)", pkt_com);

  StaticJsonDocument<1024> doc;
  doc["topic"]      = TOPIC_COMUNICACION;
  doc["packet_id"]  = pkt_com;
  doc["received"]   = true;
  doc["crc_valido"] = true;

  JsonObject data = doc.createNestedObject("data");
  data["paquetes_enviados"]["v"]       = totalEnviados;
  data["paquetes_enviados"]["hace_seg"]= 0.0;
  data["paquetes_recibidos"]["v"]      = totalRecibidos;
  data["paquetes_recibidos"]["hace_seg"]= 0.0;
  data["paquetes_perdidos"]["v"]       = totalPerdidos;
  data["paquetes_perdidos"]["hace_seg"]= 0.0;
  data["frecuencia_ghz"]["v"]          = 2.401;
  data["frecuencia_ghz"]["hace_seg"]   = 0.0;
  data["canal_nrf24"]["v"]             = 1;
  data["calidad_enlace_pct"]["v"]      = round(calidad_pct * 10) / 10.0;
  data["calidad_enlace_pct"]["hace_seg"]= 0.0;
  data["calidad_label"]                = calidad_label;
  data["baudios_debug"]["v"]           = 115200;
  data["tasa_aire_nrf24_kbps"]["v"]    = 2000;
  data["ultimo_pkt_timestamp"]         = ts;

  JsonObject log_entry = data.createNestedObject("log_entry");
  log_entry["timestamp"] = ts;
  log_entry["status"]    = "RX OK";
  log_entry["text"]      = logText;

  JsonArray pkts_window = data.createNestedArray("pkts_window");
  for (int i = 0; i < 20; i++) pkts_window.add(recentWindow[i]);

  char buffer[1024];
  size_t bytes = serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_COMUNICACION, buffer, bytes);
  Serial.printf("[TX COM] pkt#%d calidad=%.1f%% %s\n", pkt_com, calidad_pct, calidad_label);
}

// =============================================================================
// LOOP PRINCIPAL
// =============================================================================
void loop() {
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  static unsigned long ultimoTiempo = 0;
  if (millis() - ultimoTiempo > 750) {    // 750ms — frecuencia requerida por el dashboard
    ultimoTiempo = millis();

    // Impresión por Serial
    imprimirUbicacion();
    imprimirFechaHora();
    imprimirOtrosDatos();
    imprimirBME280();
    imprimirUV();
    imprimirMQ135();
    imprimirMPU6050();
    Serial.println();

    if (millis() > 5000 && gps.charsProcessed() < 10) {
      Serial.println(F("ERROR: No se reciben datos del GPS. Revisa cableado TXD/RXD."));
    }

    // Publicación por MQTT
    if (mqttClient.connected()) {
      publicarAmbiental();
      publicarSatelite();
      publicarUbicacion();      // publica si gps.location.isValid()
      publicarOrientacion3D();
      publicarMision();
      publicarComunicacion();
    }
  }
}