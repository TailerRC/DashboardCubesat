import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './CubeSatModel.css';

// ── Función auxiliar para construir el modelo 3D con Puerta Abierta y Componentes Reales ──
function createRealisticCubeSat() {
  const cubesatGroup = new THREE.Group();

  // Materiales principales optimizados
  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.9,
    roughness: 0.25
  });

  const darkAluminumMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    metalness: 0.85,
    roughness: 0.3
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2
  });

  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    roughness: 0.5,
    metalness: 0.2
  });

  const solarPanelMat = new THREE.MeshStandardMaterial({
    color: 0x071527,
    metalness: 0.95,
    roughness: 0.1,
    emissive: 0x0284c7,
    emissiveIntensity: 0.12
  });

  const screwMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.1
  });

  // 1. RAÍLES DE ESQUINA CUBESAT 1U (8x8x10 cm proporcional)
  const railHeight = 10.0;
  const size = 8.0;
  const halfS = size / 2;

  const railGeom = new THREE.BoxGeometry(0.5, railHeight, 0.5);
  const railPositions = [
    [-halfS, 0, -halfS],
    [halfS, 0, -halfS],
    [-halfS, 0, halfS],
    [halfS, 0, halfS]
  ];

  railPositions.forEach(([rx, ry, rz]) => {
    const rail = new THREE.Mesh(railGeom, aluminumMat);
    rail.position.set(rx, ry, rz);
    cubesatGroup.add(rail);

    // Pies de despliegue con resorte
    const footGeom = new THREE.BoxGeometry(0.7, 0.4, 0.7);
    const footTop = new THREE.Mesh(footGeom, darkAluminumMat);
    footTop.position.set(rx, railHeight / 2 + 0.2, rz);
    cubesatGroup.add(footTop);

    const footBottom = new THREE.Mesh(footGeom, darkAluminumMat);
    footBottom.position.set(rx, -railHeight / 2 - 0.2, rz);
    cubesatGroup.add(footBottom);
  });

  // 2. MARCOS SUPERIOR E INFERIOR CNC
  const topBottomFrameGeom = new THREE.BoxGeometry(size + 0.2, 0.3, size + 0.2);
  const topFrame = new THREE.Mesh(topBottomFrameGeom, aluminumMat);
  topFrame.position.set(0, railHeight / 2, 0);
  cubesatGroup.add(topFrame);

  const bottomFrame = new THREE.Mesh(topBottomFrameGeom, aluminumMat);
  bottomFrame.position.set(0, -railHeight / 2, 0);
  cubesatGroup.add(bottomFrame);

  // 3. PANELES SOLARES LATERALES Y TRASERO (CARAS CERRADAS)
  const sidePlateGeom = new THREE.BoxGeometry(size - 0.2, railHeight - 0.6, 0.15);

  const panelOffsets = [
    { pos: [0, 0, -halfS - 0.08], rot: [0, Math.PI, 0] },         // Cara Trasera
    { pos: [-halfS - 0.08, 0, 0], rot: [0, -Math.PI / 2, 0] },    // Cara Izquierda
    { pos: [halfS + 0.08, 0, 0], rot: [0, Math.PI / 2, 0] }       // Cara Derecha
  ];

  panelOffsets.forEach(({ pos, rot }) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.set(...pos);
    faceGroup.rotation.set(...rot);

    const frame = new THREE.Mesh(sidePlateGeom, aluminumMat);
    faceGroup.add(frame);

    const solarSurfaceGeom = new THREE.BoxGeometry(size - 1.2, railHeight - 1.4, 0.05);
    const solarMesh = new THREE.Mesh(solarSurfaceGeom, solarPanelMat);
    solarMesh.position.z = 0.08;
    faceGroup.add(solarMesh);

    const gridGeo = new THREE.PlaneGeometry(size - 1.4, railHeight - 1.6, 3, 5);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    const gridLines = new THREE.LineSegments(new THREE.WireframeGeometry(gridGeo), gridMat);
    gridLines.position.z = 0.12;
    faceGroup.add(gridLines);

    // Tornillos M2 en las esquinas
    const screwGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
    const screwPos = [
      [-halfS + 0.6, railHeight / 2 - 0.6, 0.1],
      [halfS - 0.6, railHeight / 2 - 0.6, 0.1],
      [-halfS + 0.6, -railHeight / 2 + 0.6, 0.1],
      [halfS - 0.6, -railHeight / 2 + 0.6, 0.1]
    ];
    screwPos.forEach(([sx, sy, sz]) => {
      const screw = new THREE.Mesh(screwGeom, screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, sz);
      faceGroup.add(screw);
    });

    cubesatGroup.add(faceGroup);
  });

  // 4. PUERTA FRONTAL TRANSPARENTE ABIERTA (HATCH ACRÍLICO CON BISAGRAS)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-halfS, 0, halfS + 0.08); // Bisagra en el raíl izquierdo
  doorPivot.rotation.y = Math.PI * 0.35; // Abierta a 63 grados

  // Marco de la puerta
  const doorFrameGeom = new THREE.BoxGeometry(size - 0.2, railHeight - 0.6, 0.12);
  const doorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    metalness: 0.9,
    side: THREE.DoubleSide
  });
  const doorGlass = new THREE.Mesh(doorFrameGeom, doorGlassMat);
  doorGlass.position.set(halfS - 0.1, 0, 0);
  doorPivot.add(doorGlass);

  // Bordes del cristal de la puerta
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorFrameGeom),
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 })
  );
  doorEdges.position.set(halfS - 0.1, 0, 0);
  doorPivot.add(doorEdges);

  // 2 Bisagras metálicas en el raíl izquierdo
  const hingeGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
  const hingeTop = new THREE.Mesh(hingeGeom, aluminumMat);
  hingeTop.position.set(0, 3.2, 0);
  doorPivot.add(hingeTop);

  const hingeBottom = new THREE.Mesh(hingeGeom, aluminumMat);
  hingeBottom.position.set(0, -3.2, 0);
  doorPivot.add(hingeBottom);

  cubesatGroup.add(doorPivot);

  // 5. COMPONENTES REALES DENTRO DEL CUBESAT (PILA DE CAPAS PCB REALISTAS)
  const stackGroup = new THREE.Group();
  const layerSpacing = 1.8;
  const startY = -2.7;

  // 4 Varillas de latón/oro
  const rodGeom = new THREE.CylinderGeometry(0.08, 0.08, 6.8, 8);
  const rodOffset = 2.8;
  const rodCoords = [
    [-rodOffset, 0, -rodOffset],
    [rodOffset, 0, -rodOffset],
    [-rodOffset, 0, rodOffset],
    [rodOffset, 0, rodOffset]
  ];
  rodCoords.forEach(([rx, ry, rz]) => {
    const rod = new THREE.Mesh(rodGeom, brassMat);
    rod.position.set(rx, ry, rz);
    stackGroup.add(rod);
  });

  const pcbBoardGeom = new THREE.BoxGeometry(6.4, 0.12, 6.4);

  // --- CAPA 1 (INFERIOR): EPS - ALIMENTACIÓN & BATERÍAS 18650 ---
  const pcb1 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb1.position.y = startY;
  stackGroup.add(pcb1);

  // Dos baterías cilíndricas Li-ion 18650 (con wrapper verde esmeralda y polos dorados)
  const batGeom = new THREE.CylinderGeometry(0.55, 0.55, 3.2, 16);
  const batWrapperMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
  const batCapMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9 });

  const bat1Group = new THREE.Group();
  bat1Group.add(new THREE.Mesh(batGeom, batWrapperMat));
  const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.2, 16), batCapMat);
  cap1.position.y = 1.6;
  bat1Group.add(cap1);
  bat1Group.rotation.z = Math.PI / 2;
  bat1Group.position.set(0, startY + 0.45, -1.2);
  stackGroup.add(bat1Group);

  const bat2Group = bat1Group.clone();
  bat2Group.position.set(0, startY + 0.45, 1.2);
  stackGroup.add(bat2Group);

  // Módulo de monitor de corriente INA219 (Placa roja pequeña con bornes)
  const inaPcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xd97706 })
  );
  inaPcb.position.set(-2.0, startY + 0.15, 0);
  stackGroup.add(inaPcb);

  // --- CAPA 2: O.B.C. COMPUTADOR DE ABORDO (ESP32 + MPU6050) ---
  const pcb2 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb2.position.y = startY + layerSpacing;
  stackGroup.add(pcb2);

  // Microcontrolador ESP32-WROOM-32 (Lámina metálica plateada de blindaje + pinout negro)
  const espGroup = new THREE.Group();
  espGroup.position.set(0, startY + layerSpacing + 0.15, 0);
  
  const espBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.08, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  espGroup.add(espBase);

  // Blindaje metálico RF del ESP32 (Canopy plateado grabado)
  const espShield = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.18, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
  );
  espShield.position.set(0, 0.1, -0.2);
  espGroup.add(espShield);

  // LED de estado del ESP32 (Azul emisor brillante)
  const ledMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.1, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x00e5ff, emissiveIntensity: 1.5 })
  );
  ledMesh.position.set(0.6, 0.1, 0.8);
  espGroup.add(ledMesh);

  stackGroup.add(espGroup);

  // Módulo MPU6050 (Acelerómetro/Giroscopio de 6 ejes - Placa azul con chip en el centro)
  const mpuGroup = new THREE.Group();
  mpuGroup.position.set(-2.0, startY + layerSpacing + 0.12, -1.8);
  
  const mpuPcb = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2563eb })
  );
  mpuGroup.add(mpuPcb);

  const mpuChip = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.08, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x0f172a })
  );
  mpuChip.position.y = 0.08;
  mpuGroup.add(mpuChip);

  stackGroup.add(mpuGroup);

  // Lector de Tarjeta MicroSD (Zócalo metálico plateado)
  const sdSlot = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
  );
  sdSlot.position.set(2.0, startY + layerSpacing + 0.1, -1.8);
  stackGroup.add(sdSlot);

  // --- CAPA 3: COMUNICACIONES RF & GPS ---
  const pcb3 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb3.position.y = startY + layerSpacing * 2;
  stackGroup.add(pcb3);

  // Módulo GPS NEO-7M (Antena cerámica cuadrada blanco/marrón)
  const gpsGroup = new THREE.Group();
  gpsGroup.position.set(-1.8, startY + layerSpacing * 2 + 0.2, 1.6);
  
  const gpsShield = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.12, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 })
  );
  gpsGroup.add(gpsShield);

  const ceramicAnt = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.2, 1.0),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
  );
  ceramicAnt.position.y = 0.15;
  gpsGroup.add(ceramicAnt);

  stackGroup.add(gpsGroup);

  // Módulo Transceptor NRF24L01 / LoRa (Placa verde con conector dorado)
  const rfPcb = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x047857 })
  );
  rfPcb.position.set(1.8, startY + layerSpacing * 2 + 0.12, 0);
  stackGroup.add(rfPcb);

  // --- CAPA 4 (SUPERIOR): SENSORES AMBIENTALES & RECUPERACIÓN ---
  const pcb4 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb4.position.y = startY + layerSpacing * 3;
  stackGroup.add(pcb4);

  // Sensor CO2 NDIR SCD-41 (Cubo metálico oscuro con rejilla de ventilación)
  const scdGroup = new THREE.Group();
  scdGroup.position.set(1.8, startY + layerSpacing * 3 + 0.35, 1.6);
  
  const scdBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.6, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  scdGroup.add(scdBody);

  const scdMeshFilter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
  );
  scdMeshFilter.position.y = 0.32;
  scdGroup.add(scdMeshFilter);

  stackGroup.add(scdGroup);

  // Sensor BME280 (Presión/Temperatura/Humedad - Placa morada pequeña)
  const bmePcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x7c3aed })
  );
  bmePcb.position.set(-1.8, startY + layerSpacing * 3 + 0.1, 1.8);
  stackGroup.add(bmePcb);

  // Sensor UV GUVA-S12SD (Mini chip con fotodiodo)
  const uvPcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.08, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x0284c7 })
  );
  uvPcb.position.set(-1.8, startY + layerSpacing * 3 + 0.1, -1.8);
  stackGroup.add(uvPcb);

  // Bote Cilindro de Paracaídas con Resorte e Hilos
  const paraCanisterGeom = new THREE.CylinderGeometry(1.0, 1.0, 2.2, 16);
  const paraCanisterMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.5
  });
  const paraCanister = new THREE.Mesh(paraCanisterGeom, paraCanisterMat);
  paraCanister.position.set(0, startY + layerSpacing * 3 + 1.2, 0);
  
  // Tejido plegado naranja del paracaídas
  const parachuteMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.8 })
  );
  parachuteMesh.position.set(0, startY + layerSpacing * 3 + 1.2, 0);
  
  stackGroup.add(paraCanister);
  stackGroup.add(parachuteMesh);

  cubesatGroup.add(stackGroup);

  // 6. ANTENAS DE COMUNICACIONES EN LA TAPA SUPERIOR
  const smaBaseGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 12);
  const smaBase = new THREE.Mesh(smaBaseGeom, brassMat);
  smaBase.position.set(-2.0, railHeight / 2 + 0.25, -2.0);
  cubesatGroup.add(smaBase);

  const whipAntennaGeom = new THREE.CylinderGeometry(0.04, 0.04, 5.5, 8);
  const whipAntenna = new THREE.Mesh(whipAntennaGeom, new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 }));
  whipAntenna.position.set(-2.0, railHeight / 2 + 3.0, -2.0);
  cubesatGroup.add(whipAntenna);

  const smaBase2 = new THREE.Mesh(smaBaseGeom, brassMat);
  smaBase2.position.set(2.0, railHeight / 2 + 0.25, 2.0);
  cubesatGroup.add(smaBase2);

  const rubberAntGeom = new THREE.CylinderGeometry(0.2, 0.15, 2.2, 12);
  const rubberAnt = new THREE.Mesh(rubberAntGeom, new THREE.MeshStandardMaterial({ color: 0x111827 }));
  rubberAnt.position.set(2.0, railHeight / 2 + 1.35, 2.0);
  cubesatGroup.add(rubberAnt);

  // 7. CINTA ROJA "REMOVE BEFORE FLIGHT"
  const rbfGroup = new THREE.Group();
  rbfGroup.position.set(halfS + 0.3, -1.0, halfS - 0.5);

  const ringGeom = new THREE.TorusGeometry(0.35, 0.04, 8, 20);
  const ringMesh = new THREE.Mesh(ringGeom, aluminumMat);
  rbfGroup.add(ringMesh);

  const ribbonGeom = new THREE.BoxGeometry(0.08, 3.8, 0.9);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.8 });
  const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
  ribbonMesh.position.set(0, -2.0, 0);
  ribbonMesh.rotation.z = -0.15;
  rbfGroup.add(ribbonMesh);

  const textStripGeom = new THREE.BoxGeometry(0.1, 3.0, 0.6);
  const textStripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const textStrip = new THREE.Mesh(textStripGeom, textStripMat);
  textStrip.position.set(0, -2.0, 0);
  textStrip.rotation.z = -0.15;
  rbfGroup.add(textStrip);

  cubesatGroup.add(rbfGroup);

  return cubesatGroup;
}

const CubeSatModel = ({ cabeceo = 0, balanceo = 0, giro = 0, modo = 'AUTO', onAutoUpdate }) => {
  const mountRef = useRef(null);
  const cubesatGroupRef = useRef(null);
  
  const modoRef = useRef(modo);
  const rotRef = useRef({ cabeceo, balanceo, giro });
  const callbackRef = useRef(onAutoUpdate);

  useEffect(() => {
    modoRef.current = modo;
    rotRef.current = { cabeceo, balanceo, giro };
    callbackRef.current = onAutoUpdate;
  }, [modo, cabeceo, balanceo, giro, onAutoUpdate]);

  useEffect(() => {
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(16, 14, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    renderer.domElement.className = 'three-canvas';
    mountRef.current.appendChild(renderer.domElement);

    // --- ILUMINACIÓN PROFESIONAL ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainLight.position.set(15, 25, 20);
    scene.add(mainLight);

    const cyanRimLight = new THREE.PointLight(0x00e5ff, 2.0, 60);
    cyanRimLight.position.set(-15, 12, -15);
    scene.add(cyanRimLight);

    const blueFillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    blueFillLight.position.set(-10, -10, 10);
    scene.add(blueFillLight);

    // --- CUBESAT GROUP ---
    const cubesatGroup = createRealisticCubeSat();
    scene.add(cubesatGroup);
    cubesatGroupRef.current = cubesatGroup;

    // Cuadrícula / Piso inercial
    const gridHelper = new THREE.GridHelper(40, 30, 0x00e5ff, 0x1e293b);
    gridHelper.position.y = -7.5;
    scene.add(gridHelper);

    // --- ARRASTRE MANUAL (MOUSE / TOUCH) ---
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let manualOffset = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !cubesatGroup) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      manualOffset.x += deltaY * 0.008;
      manualOffset.y += deltaX * 0.008;

      cubesatGroup.rotation.x += deltaY * 0.008;
      cubesatGroup.rotation.y += deltaX * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.01;
      camera.position.z = Math.max(8.0, Math.min(45.0, camera.position.z));
    };

    const handleDoubleClick = () => {
      manualOffset = { x: 0, y: 0 };
      camera.position.set(16, 14, 22);
      camera.lookAt(0, 0, 0);
    };

    const domElement = renderer.domElement;
    domElement.style.cursor = 'grab';
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mouseup', handleMouseUp);

    // Eventos Táctiles
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1 || !cubesatGroup) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      manualOffset.x += deltaY * 0.008;
      manualOffset.y += deltaX * 0.008;

      cubesatGroup.rotation.x += deltaY * 0.008;
      cubesatGroup.rotation.y += deltaX * 0.008;

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    domElement.addEventListener('touchend', handleTouchEnd);

    const normalizeAngle = (radians) => {
      let deg = (radians * 180) / Math.PI;
      deg = deg % 360;
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;
      return deg;
    };

    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const toRad = Math.PI / 180;
      const { cabeceo: c, balanceo: b, giro: g } = rotRef.current;

      if (!isDragging) {
        if (modoRef.current === 'AUTO') {
          cubesatGroup.rotation.x += 0.005;
          cubesatGroup.rotation.y += 0.005;
          cubesatGroup.rotation.z += 0.002;

          if (callbackRef.current) {
            const normC = normalizeAngle(cubesatGroup.rotation.x);
            const normG = normalizeAngle(cubesatGroup.rotation.y);
            const normB = normalizeAngle(cubesatGroup.rotation.z);
            callbackRef.current(normC, normB, normG);
          }
        } else {
          cubesatGroup.rotation.x = c * toRad + manualOffset.x;
          cubesatGroup.rotation.y = g * toRad + manualOffset.y;
          cubesatGroup.rotation.z = b * toRad;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (mountRef.current) {
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);

    const currentMount = mountRef.current;

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('dblclick', handleDoubleClick);
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mouseup', handleMouseUp);

      if (currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      cubesatGroup.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      gridHelper.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="cubesat-container" ref={mountRef}>
    </div>
  );
};

export default CubeSatModel;
