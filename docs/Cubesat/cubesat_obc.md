// =============================================================================
// CEMPAI CubeSat — ESP32 OBC (Ordenador de a Bordo)
// =============================================================================
// ROL: Lee todos los sensores y los transmite por antena NRF24L01
//      a la Estación Terrena (gateway_terrena.md)
//
// NO usa WiFi. NO usa MQTT. Solo lee sensores y envía por RF.
//
// Flujo: Sensores → Structs → NRF24L01 TX → Gateway → MQTT → Dashboard
//
// ── LIBRERÍAS REQUERIDAS (instalar en Arduino IDE → Library Manager) ──────────
//   - RF24             por TMRh20 / nRF24L01  (Radio SPI)
//   - TinyGPS++        por Mikal Hart          (GPS NMEA)       — ya instalada
//   - Adafruit BME280  por Adafruit            (Temp/Hum/Pres)  — ya instalada
//   - Adafruit INA219  por Adafruit            (Voltaje/Corriente) PENDIENTE
//   - MPU6050          por ElectronicCats       (IMU)              PENDIENTE
// =============================================================================

#include <SPI.h>
#include <RF24.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

// ── Librerías PENDIENTES (descomentar al conectar el sensor físico) ───────────
#include <Adafruit_INA219.h>   // INA219  — I2C addr 0x40 (ACTIVO)
#include <MPU6050.h>           // MPU6050 — I2C addr 0x69 (ACTIVO)

// =============================================================================
// CONFIGURACIÓN DE PINES
// =============================================================================

// ── UART2 (GPS NEO-7M) — ACTIVO ──────────────────────────────────────────────
#define RXD2     16      // Pin RX2 del ESP32 → conectar a TXD del GPS
#define TXD2     17      // Pin TX2 del ESP32 → conectar a RXD del GPS
#define GPS_BAUD 9600

// ── I2C Bus — ACTIVO (compartido: BME280, INA219, MPU6050) ───────────────────
#define SDA_PIN  21
#define SCL_PIN  22
//   BME280  → 0x76 ó 0x76  [ACTIVO]
#define INA219_ADDR 0x40    // [ACTIVO]
#define MPU6050_ADDR 0x68   // [ACTIVO]   AD0 en VCC o clon en 0x69

// ── ADC (GUVA-S12SD) — ACTIVO ────────────────────────────────────────────────
#define UV_PIN    4

// ── ADC (MQ135) — ACTIVO ──────────────────────────────────────────────────────
#define MQ135_PIN 34     // Input-only pin

// ── SPI HSPI (NRF24L01) — ACTIVO ─────────────────────────────────────────────
//   HSPI no colisiona con I2C (pines 19/18)
#define NRF_CE   25
#define NRF_CSN  26
#define NRF_SCK  14
#define NRF_MISO 12
#define NRF_MOSI 13

// =============================================================================
// PROTOCOLO RF — ESTRUCTURAS DE DATOS
// Cada struct cabe en 32 bytes (límite hardware NRF24L01)
// El campo 'type' identifica el tópico en el Gateway
// =============================================================================
struct __attribute__((packed)) PktAmbiental {
  uint8_t  type       = 1;   // tópico: ambiental
  uint16_t packet_id;
  float    temp_c;
  float    hum_pct;
  float    pres_rel;         // presión relativa a P0 calibrado (Pa)
  float    uv_idx;
  float    co2_ppm;          // 0.0 hasta conectar MQ135
  float    altura_m;         // NUEVO — altitud barométrica relativa (m)
  bool     calibrando;       // NUEVO — true mientras no se complete la calibración de 15s
};  // 29 bytes

struct __attribute__((packed)) PktSatelite {
  uint8_t  type       = 2;   // tópico: satelite
  uint16_t packet_id;
  float    voltaje_v;        // 0.0 hasta conectar INA219
  float    corriente_ma;     // 0.0 hasta conectar INA219
  float    consumo_w;        // 0.0 hasta conectar INA219
  float    temp_mcu;
  uint32_t uptime_seg;
};  // 24 bytes

struct __attribute__((packed)) PktUbicacion {
  uint8_t  type       = 3;   // tópico: ubicacion
  uint16_t packet_id;
  float    latitud;
  float    longitud;
  float    altitud_gps;
  float    velocidad_kmh;
  uint8_t  satelites;
  float    hdop;
};  // 24 bytes

struct __attribute__((packed)) PktOrientacion {
  uint8_t  type       = 4;   // tópico: orientacion3d
  uint16_t packet_id;
  float    pitch;            // 0.0 hasta conectar MPU6050
  float    roll;             // 0.0 hasta conectar MPU6050
  float    yaw;              // 0.0 hasta conectar MPU6050
  float    accel_x;          // 0.0 hasta conectar MPU6050
  float    accel_y;          // 0.0 hasta conectar MPU6050
  float    accel_z;          // 0.0 hasta conectar MPU6050
};  // 27 bytes

struct __attribute__((packed)) PktMision {
  uint8_t  type       = 5;   // tópico: mision
  uint16_t packet_id;
  uint8_t  fase_idx;         // 0=PREPARACION_TIERRA ... 6=RECUPERACION
  float    altitud_m;
  uint32_t t_vuelo_seg;
};  // 12 bytes

struct __attribute__((packed)) PktComunicacion {
  uint8_t  type       = 6;   // tópico: comunicacion
  uint16_t packet_id;
  uint32_t enviados;
  uint32_t recibidos;
  uint32_t perdidos;
  float    calidad_pct;
};  // 19 bytes

// =============================================================================
// INSTANCIAS Y OBJETOS
// =============================================================================

// ── Radio NRF24L01 (SPI HSPI) — ACTIVO ───────────────────────────────────────
RF24 radio(NRF_CE, NRF_CSN);
const byte RF_ADDRESS[6] = "CEMPA";  // Dirección compartida con el Gateway

// ── GPS NEO-7M ─────────────────────────────────────────────────────────────
TinyGPSPlus    gps;
HardwareSerial gpsSerial(2);

// ── BME280 ─────────────────────────────────────────────────────────────────
Adafruit_BME280 bme;

// ── Sensores PENDIENTES (descomentar al conectar) ─────────────────────────
Adafruit_INA219 ina219;   // I2C SDA=19, SCL=18, addr 0x40 (ACTIVO)
MPU6050         mpu(MPU6050_ADDR); // MPU6050 (ACTIVO)

static bool ina219Ok = false;
static bool mpuOk = false;

// ── Contadores y estado ────────────────────────────────────────────────────
static uint16_t pkt_amb = 1000, pkt_sat = 3000, pkt_gps = 2000;
static uint16_t pkt_ori = 4000, pkt_mis = 5000, pkt_com = 6000;

static uint32_t totalEnviados  = 0;
static uint32_t totalRecibidos = 0;
static uint32_t totalPerdidos  = 0;
static bool     recentWindow[20];

// ── Calibración de altitud barométrica relativa ─────────────────────────────
#define CALIB_LECTURAS_TOTAL 15      // 1 lectura por segundo → 15 lecturas (~15s)

static float    calib_suma_presion   = 0.0f;
static uint8_t  calib_contador       = 0;
static bool     calib_completa       = false;
static float    P0                   = 0.0f;   // Presión de referencia (Pa), fijada una sola vez

// Fase de misión (actualizar manualmente o por umbral de altitud)
static uint8_t fase_idx = 0;  // 0 = PREPARACION_TIERRA

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println(F("=============================================="));
  Serial.println(F("   CEMPAI — ESP32 OBC (Transmisor RF)         "));
  Serial.println(F("=============================================="));

  // ── GPS UART2 ──────────────────────────────────────────────────────────────
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, RXD2, TXD2);

  // ── I2C Bus ────────────────────────────────────────────────────────────────
  Wire.begin(SDA_PIN, SCL_PIN);

  // ── BME280 (I2C 0x76 ó 0x77) — ACTIVO ────────────────────────────────────
  if (!bme.begin(0x76, &Wire)) {
    if (!bme.begin(0x77, &Wire)) {
      Serial.println(F("[ERROR] BME280 no encontrado (SDA=19, SCL=18)"));
    }
  } else {
    Serial.println(F("[OK] BME280 inicializado"));
  }

  // ── INA219 (I2C 0x40) — ACTIVO ─────────────────────────────────────────────
  if (!ina219.begin()) {
    Serial.println(F("[WARN] INA219 no encontrado (0x40)"));
  } else {
    ina219Ok = true;
    Serial.println(F("[OK] INA219 inicializado"));
  }

  // ── MPU6050 (I2C 0x69) — ACTIVO ────────────────────────────────────────────
  Wire.beginTransmission(MPU6050_ADDR);
  int mpuError = (int)Wire.endTransmission();
  if (mpuError != 0) {
    Serial.print(F("[WARN] MPU6050 no responde en bus I2C (err="));
    Serial.print(mpuError);
    Serial.println(F("). Verifica SDA=19 SCL=18"));
  } else {
    mpu.initialize();
    mpuOk = true;
    Serial.println(F("[OK] MPU6050 inicializado"));
  }

  // ── GUVA-S12SD (ADC Pin 4) — ACTIVO ───────────────────────────────────────
  pinMode(UV_PIN, INPUT);

  // ── MQ135 (ADC Pin 34) — ACTIVO ───────────────────────────────────────────
  pinMode(MQ135_PIN, INPUT);

  // ── NRF24L01 (SPI HSPI) ────────────────────────────────────────────────────
  SPI.begin(NRF_SCK, NRF_MISO, NRF_MOSI, NRF_CSN);
  if (!radio.begin()) {
    Serial.println(F("[ERROR] NRF24L01 no encontrado. Revisa cableado SPI HSPI."));
    while (1) {}   // Detener si no hay radio
  }

  radio.openWritingPipe(RF_ADDRESS);  // OBC es el TRANSMISOR
  radio.setPALevel(RF24_PA_LOW);      // PA_LOW para pruebas en laboratorio
  radio.setDataRate(RF24_2MBPS);      // 2 Mbps = menor latencia
  radio.setChannel(1);                // Canal 1 → 2.401 GHz
  radio.stopListening();              // Modo TX

  // Inicializar ventana de paquetes
  for (int i = 0; i < 20; i++) recentWindow[i] = true;

  Serial.println(F("[OK] NRF24L01 listo — Modo TRANSMISOR"));
  Serial.println(F("[CEMPAI] OBC iniciado. Transmitiendo telemetría..."));
  Serial.println(F("[CALIB BME] Iniciando calibración de altitud (15 lecturas, ~15s)..."));
  Serial.println();
}

// =============================================================================
// FUNCIONES DE LECTURA DE SENSORES
// =============================================================================

float leerUV() {
  int   raw  = analogRead(UV_PIN);
  float volt = (raw / 4095.0f) * 3.3f;
  return constrain(volt / 0.1f, 0.0f, 15.0f);
}

// MQ135 — ACTIVO (ADC Pin 34)
float leerCO2() {
  int   raw  = analogRead(MQ135_PIN);
  float volt = (raw / 4095.0f) * 3.3f;
  return 400.0f + (volt / 3.3f) * 1600.0f; // Fórmula calibrada
}

// =============================================================================
// FUNCIONES DE CALIBRACIÓN Y CÁLCULO DE ALTITUD BAROMÉTRICA (BME280)
// =============================================================================

// Se llama una vez por ciclo de transmitirAmbiental() (ya corre ~1x/750ms según el loop)
void actualizarCalibracionAltitud(float presionActualPa) {
  if (calib_completa) return; // Ya está fija, no hacer nada más

  calib_suma_presion += presionActualPa;
  calib_contador++;

  Serial.printf("[CALIB BME] Lectura %d/%d — P=%.2f Pa\n",
    calib_contador, CALIB_LECTURAS_TOTAL, presionActualPa);

  if (calib_contador >= CALIB_LECTURAS_TOTAL) {
    P0 = calib_suma_presion / calib_contador;
    calib_completa = true;
    Serial.printf("[CALIB BME] P0 fijado en %.2f Pa (promedio de %d lecturas)\n",
      P0, calib_contador);
  }
}

// Fórmula barométrica estándar. Devuelve 0.0 si aún no terminó de calibrar.
float calcularAlturaRelativa(float presionActualPa) {
  if (!calib_completa) return 0.0f;
  return 44330.0f * (1.0f - powf(presionActualPa / P0, 1.0f / 5.255f));
}

bool estaCalibrando() {
  return !calib_completa;
}

// =============================================================================
// FUNCIONES DE TRANSMISIÓN RF — una por tópico
// =============================================================================

void transmitirAmbiental() {
  PktAmbiental pkt;
  pkt.packet_id = ++pkt_amb;

  pkt.temp_c   = bme.readTemperature();
  pkt.hum_pct  = bme.readHumidity();

  float pres_abs = bme.readPressure();

  actualizarCalibracionAltitud(pres_abs);

  pkt.pres_rel   = pres_abs - (calib_completa ? P0 : pres_abs); // presión relativa a P0 calibrado
  pkt.altura_m   = calcularAlturaRelativa(pres_abs);
  pkt.calibrando = estaCalibrando();

  pkt.uv_idx  = leerUV();
  pkt.co2_ppm = leerCO2();

  bool ok = radio.write(&pkt, sizeof(pkt));
  totalEnviados++;
  if (ok) { totalRecibidos++; Serial.printf("[TX AMB] pkt#%d T=%.1f H=%.1f UV=%.1f Alt=%.1fm Calib=%d OK\n", pkt_amb, pkt.temp_c, pkt.hum_pct, pkt.uv_idx, pkt.altura_m, pkt.calibrando); }
  else    { totalPerdidos++;  Serial.printf("[TX AMB] pkt#%d FAIL\n", pkt_amb); }
}

void transmitirSatelite() {
  PktSatelite pkt;
  pkt.packet_id  = ++pkt_sat;
  pkt.temp_mcu   = temperatureRead();
  pkt.uptime_seg = millis() / 1000;

  // INA219 — ACTIVO (I2C SDA=19, SCL=18, addr 0x40)
  pkt.voltaje_v    = 0.0f;
  pkt.corriente_ma = 0.0f;
  pkt.consumo_w    = 0.0f;
  if (ina219Ok) {
    pkt.voltaje_v    = ina219.getBusVoltage_V();
    pkt.corriente_ma = ina219.getCurrent_mA();
    pkt.consumo_w    = (pkt.voltaje_v * pkt.corriente_ma) / 1000.0f;
  }

  bool ok = radio.write(&pkt, sizeof(pkt));
  totalEnviados++;
  if (ok) { totalRecibidos++; Serial.printf("[TX SAT] pkt#%d mcu=%.1f°C uptime=%ds volt=%.2fV curr=%.1fmA OK\n", pkt_sat, pkt.temp_mcu, pkt.uptime_seg, pkt.voltaje_v, pkt.corriente_ma); }
  else    { totalPerdidos++;  Serial.printf("[TX SAT] pkt#%d FAIL\n", pkt_sat); }
}

void transmitirUbicacion() {
  if (!gps.location.isValid()) {
    Serial.println(F("[GPS] Sin fix — no transmitir ubicacion"));
    return;
  }
  PktUbicacion pkt;
  pkt.packet_id     = ++pkt_gps;
  pkt.latitud       = (float)gps.location.lat();
  pkt.longitud      = (float)gps.location.lng();
  pkt.altitud_gps   = (float)gps.altitude.meters();
  pkt.velocidad_kmh = (float)gps.speed.kmph();
  pkt.satelites     = (uint8_t)gps.satellites.value();
  pkt.hdop          = (float)gps.hdop.hdop();

  bool ok = radio.write(&pkt, sizeof(pkt));
  totalEnviados++;
  if (ok) { totalRecibidos++; Serial.printf("[TX GPS] pkt#%d lat=%.4f lon=%.4f alt=%.1fm OK\n", pkt_gps, pkt.latitud, pkt.longitud, pkt.altitud_gps); }
  else    { totalPerdidos++;  Serial.printf("[TX GPS] pkt#%d FAIL\n", pkt_gps); }
}

void transmitirOrientacion3D() {
  PktOrientacion pkt;
  pkt.packet_id = ++pkt_ori;

  pkt.pitch   = 0.0f;
  pkt.roll    = 0.0f;
  pkt.yaw     = 0.0f;
  pkt.accel_x = 0.0f;
  pkt.accel_y = 0.0f;
  pkt.accel_z = 0.0f;
  if (mpuOk) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    float accel_x_g = ax / 16384.0f;
    float accel_y_g = ay / 16384.0f;
    float accel_z_g = az / 16384.0f;
    pkt.accel_x = accel_x_g * 9.81f;
    pkt.accel_y = accel_y_g * 9.81f;
    pkt.accel_z = accel_z_g * 9.81f;
    pkt.pitch = atan2f(-accel_x_g, sqrtf(accel_y_g * accel_y_g + accel_z_g * accel_z_g)) * 180.0f / M_PI;
    pkt.roll  = atan2f(accel_y_g, accel_z_g) * 180.0f / M_PI;
  }

  bool ok = radio.write(&pkt, sizeof(pkt));
  totalEnviados++;
  if (ok) { Serial.printf("[TX ORI] pkt#%d pitch=%.1f roll=%.1f OK\n", pkt_ori, pkt.pitch, pkt.roll); totalRecibidos++; }
  else    { Serial.printf("[TX ORI] pkt#%d FAIL\n", pkt_ori); totalPerdidos++; }
}

void transmitirMision() {
  PktMision pkt;
  pkt.packet_id  = ++pkt_mis;
  pkt.fase_idx   = fase_idx;
  pkt.altitud_m  = gps.altitude.isValid() ? (float)gps.altitude.meters() : 0.0f;
  pkt.t_vuelo_seg= millis() / 1000;

  bool ok = radio.write(&pkt, sizeof(pkt));
  totalEnviados++;
  if (ok) { Serial.printf("[TX MIS] pkt#%d fase=%d alt=%.1fm OK\n", pkt_mis, fase_idx, pkt.altitud_m); totalRecibidos++; }
  else    { Serial.printf("[TX MIS] pkt#%d FAIL\n", pkt_mis); totalPerdidos++; }
}

void transmitirComunicacion() {
  // Actualizar ventana deslizante de calidad de enlace
  for (int i = 0; i < 19; i++) recentWindow[i] = recentWindow[i + 1];

  PktComunicacion pkt;
  pkt.packet_id = ++pkt_com;
  pkt.enviados  = totalEnviados;
  pkt.recibidos = totalRecibidos;
  pkt.perdidos  = totalPerdidos;

  int okCount = 0;
  for (int i = 0; i < 20; i++) if (recentWindow[i]) okCount++;
  pkt.calidad_pct = (okCount / 20.0f) * 100.0f;

  bool ok = radio.write(&pkt, sizeof(pkt));
  recentWindow[19] = ok;
  if (ok) { Serial.printf("[TX COM] pkt#%d calidad=%.1f%% OK\n", pkt_com, pkt.calidad_pct); }
  else    { Serial.printf("[TX COM] pkt#%d FAIL\n", pkt_com); }
}

// =============================================================================
// FUNCIONES DE DIAGNÓSTICO SERIAL (para monitoreo local del OBC)
// =============================================================================
void imprimirUbicacion() {
  if (gps.location.isValid()) {
    Serial.printf("Lat: %.6f | Lng: %.6f", gps.location.lat(), gps.location.lng());
  } else {
    Serial.print(F("Ubicación: INVALIDA (buscando satélites)"));
  }
}

void imprimirBME280() {
  Serial.printf(" | Temp: %.1f°C | Hum: %.1f%% | Presión: %.1f hPa",
    bme.readTemperature(), bme.readHumidity(), bme.readPressure() / 100.0F);
}

void imprimirUV() {
  Serial.printf(" | UV: %.1f", leerUV());
}

void imprimirMQ135() {
  Serial.printf(" | CO2: %.0f ppm", leerCO2());
}

void imprimirMPU6050() {
  if (mpuOk) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    float accel_x_g = ax / 16384.0f;
    float accel_y_g = ay / 16384.0f;
    float accel_z_g = az / 16384.0f;
    float pitch = atan2f(-accel_x_g, sqrtf(accel_y_g * accel_y_g + accel_z_g * accel_z_g)) * 180.0f / M_PI;
    float roll  = atan2f(accel_y_g, accel_z_g) * 180.0f / M_PI;
    Serial.printf(" | Pitch: %.1f° | Roll: %.1f°", pitch, roll);
  } else {
    Serial.print(F(" | MPU6050: N/A"));
  }
}

// =============================================================================
// LOOP PRINCIPAL
// =============================================================================
void loop() {
  // ── Leer GPS continuamente ─────────────────────────────────────────────────
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  static unsigned long ultimoTiempo = 0;
  if (millis() - ultimoTiempo > 750) {   // Transmitir cada 750ms
    ultimoTiempo = millis();

    // ── Diagnóstico local por Serial ───────────────────────────────────────────
    imprimirUbicacion();
    imprimirBME280();
    imprimirUV();
    imprimirMQ135();
    imprimirMPU6050();
    Serial.println();

    if (millis() > 5000 && gps.charsProcessed() < 10) {
      Serial.println(F("[ERROR] GPS sin datos — revisa cableado TXD/RXD"));
    }

    // ── Transmitir los 6 paquetes RF al Gateway ────────────────────────────────
    transmitirAmbiental();
    transmitirSatelite();
    transmitirUbicacion();
    transmitirOrientacion3D();
    transmitirMision();
    transmitirComunicacion();

    Serial.println(F("---"));
  }
}