import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Función auxiliar para dibujar una cuadrícula de panel solar con líneas ortogonales puras (sin diagonales)
function createSolarGrid(w, h, cols, rows) {
  const points = [];

  // Líneas verticales
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (i / cols) * w;
    points.push(new THREE.Vector3(x, -h / 2, 0));
    points.push(new THREE.Vector3(x, h / 2, 0));
  }

  // Líneas horizontales
  for (let j = 0; j <= rows; j++) {
    const y = -h / 2 + (j / rows) * h;
    points.push(new THREE.Vector3(-w / 2, y, 0));
    points.push(new THREE.Vector3(w / 2, y, 0));
  }

  const geom = new THREE.BufferGeometry().setFromPoints(points);
  return geom;
}

// ── Función auxiliar para construir el modelo 3D con Puerta Abierta y Componentes Reales ──
function createRealisticCubeSat() {
  const cubesatGroup = new THREE.Group();

  // Aluminio gris metálico — raíles CNC y marcos
  const aluminumMat = new THREE.MeshPhysicalMaterial({
    color: 0x8a9099,
    metalness: 0.65,
    roughness: 0.30,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12
  });

  // Aluminio oscuro anodizado — patas y conectores
  const darkAluminumMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a3d45,
    metalness: 0.6,
    roughness: 0.25,
    clearcoat: 0.5,
    clearcoatRoughness: 0.15
  });

  // Latón dorado pulido — varillas de soporte
  const brassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8a020,
    metalness: 0.75,
    roughness: 0.12,
    clearcoat: 0.8,
    clearcoatRoughness: 0.06
  });

  // PCB verde esmeralda lacado
  const pcbMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a6b4a,
    roughness: 0.30,
    metalness: 0.15,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    emissive: 0x0a3322,
    emissiveIntensity: 0.2
  });

  // Panel solar azul profundo con líneas fotovoltaicas
  const solarPanelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1e40,
    metalness: 0.5,
    roughness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    emissive: 0x003878,
    emissiveIntensity: 0.20
  });

  // Tornillos de acero inoxidable
  const screwMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8ecf2,
    metalness: 0.7,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04
  });

  // 1. RAÍLES DE ESQUINA CUBESAT 1U (Cubo perfecto de 8x8x8 para medir 1m proporcional)
  const railHeight = 8.0;
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
    { pos: [0, 0, -halfS - 0.08], rot: [0, Math.PI, 0] },
    { pos: [-halfS - 0.08, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [halfS + 0.08, 0, 0], rot: [0, Math.PI / 2, 0] }
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

    const gridGeo = createSolarGrid(size - 1.4, railHeight - 1.6, 3, 5);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    const gridLines = new THREE.LineSegments(gridGeo, gridMat);
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

  // 4. FRONTAL COMPLETAMENTE ABIERTO PARA VISUALIZACIÓN DIRECTA (SIN PUERTA)

  // 5. COMPONENTES REALES DENTRO DEL CUBESAT (PROPORCIONALMENTE ESCALADOS FACTOR 0.8)
  const stackGroup = new THREE.Group();
  const layerSpacing = 1.4;
  const startY = -2.2;

  const rodGeom = new THREE.CylinderGeometry(0.08, 0.08, 5.6, 8);
  const rodOffset = 2.8;
  const rodCoords = [
    [-rodOffset, 0, -rodOffset],
    [rodOffset, 0, -rodOffset],
    [-rodOffset, 0, rodOffset],
    [rodOffset, 0, rodOffset]
  ];
  rodCoords.forEach(([rx, ry, rz]) => {
    const rod = new THREE.Mesh(rodGeom, brassMat);
    rod.position.set(rx, 0, rz);
    stackGroup.add(rod);
  });

  const pcbBoardGeom = new THREE.BoxGeometry(6.4, 0.12, 6.4);

  // --- CAPA 1: EPS & BATERÍAS LIPO 18650 ---
  const pcb1 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb1.position.y = startY;
  stackGroup.add(pcb1);

  const batGeom = new THREE.CylinderGeometry(0.55, 0.55, 2.5, 16);
  const batWrapperMat = new THREE.MeshPhysicalMaterial({ color: 0x15803d, roughness: 0.2, metalness: 0.1, clearcoat: 0.5, emissive: 0x052e16, emissiveIntensity: 0.3 });
  const batCapMat = new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, metalness: 1.0, roughness: 0.05, clearcoat: 1.0 });

  const bat1Group = new THREE.Group();
  bat1Group.add(new THREE.Mesh(batGeom, batWrapperMat));
  const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.15, 16), batCapMat);
  cap1.position.y = 1.25;
  bat1Group.add(cap1);
  bat1Group.rotation.z = Math.PI / 2;
  bat1Group.position.set(0, startY + 0.35, -1.3);
  stackGroup.add(bat1Group);

  const bat2Group = bat1Group.clone();
  bat2Group.position.set(0, startY + 0.35, 1.3);
  stackGroup.add(bat2Group);

  const inaPcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.12, 0.8),
    new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2, emissive: 0x92400e, emissiveIntensity: 0.4 })
  );
  inaPcb.position.set(-1.8, startY + 0.15, 0);
  stackGroup.add(inaPcb);

  // --- CAPA 2: OBC (ESP32 + MPU6050) ---
  const pcb2 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb2.position.y = startY + layerSpacing;
  stackGroup.add(pcb2);

  const espGroup = new THREE.Group();
  espGroup.position.set(0, startY + layerSpacing + 0.12, 0);
  const espBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 2.5), new THREE.MeshPhysicalMaterial({ color: 0x0f1729, metalness: 0.3, roughness: 0.4, emissive: 0x0a0f20, emissiveIntensity: 0.2 }));
  espGroup.add(espBase);
  const espShield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.6), new THREE.MeshPhysicalMaterial({ color: 0xe8edf5, metalness: 1.0, roughness: 0.05, clearcoat: 1.0 }));
  espShield.position.set(0, 0.08, -0.2);
  espGroup.add(espShield);
  const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x00ffff, emissive: 0x00e5ff, emissiveIntensity: 3.0 }));
  ledMesh.position.set(0.6, 0.08, 0.85);
  espGroup.add(ledMesh);
  stackGroup.add(espGroup);

  const mpuGroup = new THREE.Group();
  mpuGroup.position.set(-2.0, startY + layerSpacing + 0.1, -1.8);
  const mpuPcb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2), new THREE.MeshPhysicalMaterial({ color: 0x1d4ed8, metalness: 0.2, roughness: 0.3, emissive: 0x1e3a8a, emissiveIntensity: 0.4 }));
  mpuGroup.add(mpuPcb);
  const mpuChip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), new THREE.MeshPhysicalMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.1, clearcoat: 0.8 }));
  mpuChip.position.y = 0.08;
  mpuGroup.add(mpuChip);
  stackGroup.add(mpuGroup);

  // --- CAPA 3: COMUNICACIONES (GPS & RF) ---
  const pcb3 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb3.position.y = startY + layerSpacing * 2;
  stackGroup.add(pcb3);

  const gpsGroup = new THREE.Group();
  gpsGroup.position.set(-1.6, startY + layerSpacing * 2 + 0.16, 1.6);
  const gpsShield = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.2), new THREE.MeshPhysicalMaterial({ color: 0xd4d8e0, metalness: 1.0, roughness: 0.05, clearcoat: 1.0 }));
  gpsGroup.add(gpsShield);
  const ceramicAnt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.9), new THREE.MeshPhysicalMaterial({ color: 0xfafafa, roughness: 0.85, emissive: 0x88aaff, emissiveIntensity: 0.15 }));
  ceramicAnt.position.y = 0.12;
  gpsGroup.add(ceramicAnt);
  stackGroup.add(gpsGroup);

  const rfPcb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 2.2), new THREE.MeshPhysicalMaterial({ color: 0x065f46, metalness: 0.3, roughness: 0.25, clearcoat: 0.5, emissive: 0x022c22, emissiveIntensity: 0.3 }));
  rfPcb.position.set(1.8, startY + layerSpacing * 2 + 0.1, 0);
  stackGroup.add(rfPcb);

  // --- CAPA 4: PAYLOAD SENSORES (BME280, SCD40 CO2, PARACAÍDAS) ---
  const pcb4 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb4.position.y = startY + layerSpacing * 3;
  stackGroup.add(pcb4);

  const scdGroup = new THREE.Group();
  scdGroup.position.set(1.8, startY + layerSpacing * 3 + 0.22, 1.6);
  const scdBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 1.0), new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.5, clearcoat: 0.7 }));
  scdGroup.add(scdBody);
  const scdMeshFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), new THREE.MeshPhysicalMaterial({ color: 0xb0bec5, metalness: 1.0, roughness: 0.05, clearcoat: 1.0 }));
  scdMeshFilter.position.y = 0.23;
  scdGroup.add(scdMeshFilter);
  stackGroup.add(scdGroup);

  const bmePcb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), new THREE.MeshPhysicalMaterial({ color: 0x7c3aed, metalness: 0.2, roughness: 0.3, emissive: 0x4c1d95, emissiveIntensity: 0.5 }));
  bmePcb.position.set(-1.8, startY + layerSpacing * 3 + 0.08, 1.8);
  stackGroup.add(bmePcb);

  // Canasta del paracaídas y paracaídas (esfera naranja) proporcionalmente dimensionados y centrados
  const paraCanisterGeom = new THREE.CylinderGeometry(1.0, 1.0, 1.3, 16);
  const paraCanisterMat = new THREE.MeshPhysicalMaterial({ color: 0xb0bec5, metalness: 1.0, roughness: 0.08, clearcoat: 1.0, transparent: true, opacity: 0.55 });
  const paraCanister = new THREE.Mesh(paraCanisterGeom, paraCanisterMat);
  paraCanister.position.set(0, startY + layerSpacing * 3 + 0.65, 0);

  const parachuteMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 16), new THREE.MeshPhysicalMaterial({ color: 0xf97316, roughness: 0.55, metalness: 0.1, clearcoat: 0.4, emissive: 0x7c2d12, emissiveIntensity: 0.2 }));
  parachuteMesh.position.set(0, startY + layerSpacing * 3 + 0.65, 0);

  stackGroup.add(paraCanister);
  stackGroup.add(parachuteMesh);

  cubesatGroup.add(stackGroup);

  // 6. ANTENAS DE COMUNICACIÓN
  const smaBaseGeom = new THREE.CylinderGeometry(0.25, 0.32, 0.5, 12);
  const smaBase = new THREE.Mesh(smaBaseGeom, brassMat);
  smaBase.position.set(-2.0, railHeight / 2 + 0.25, -2.0);
  cubesatGroup.add(smaBase);

  const whipAntennaGeom = new THREE.CylinderGeometry(0.04, 0.04, 5.0, 8);
  const whipAntenna = new THREE.Mesh(whipAntennaGeom, new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 }));
  whipAntenna.position.set(-2.0, railHeight / 2 + 2.75, -2.0);
  cubesatGroup.add(whipAntenna);

  const smaBase2 = new THREE.Mesh(smaBaseGeom, brassMat);
  smaBase2.position.set(2.0, railHeight / 2 + 0.25, 2.0);
  cubesatGroup.add(smaBase2);

  const rubberAntGeom = new THREE.CylinderGeometry(0.2, 0.14, 2.2, 12);
  const rubberAnt = new THREE.Mesh(rubberAntGeom, new THREE.MeshStandardMaterial({ color: 0x111827 }));
  rubberAnt.position.set(2.0, railHeight / 2 + 1.1, 2.0);
  cubesatGroup.add(rubberAnt);

  // 7. CINTA ROJA "REMOVE BEFORE FLIGHT"
  const rbfGroup = new THREE.Group();
  rbfGroup.position.set(halfS + 0.3, -0.8, halfS - 0.4);

  const ringRingGeom = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
  const ringMesh = new THREE.Mesh(ringRingGeom, aluminumMat);
  rbfGroup.add(ringMesh);

  const ribbonGeom = new THREE.BoxGeometry(0.08, 3.5, 0.8);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.8 });
  const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
  ribbonMesh.position.set(0, -1.75, 0);
  ribbonMesh.rotation.z = -0.15;
  rbfGroup.add(ribbonMesh);

  const textStripGeom = new THREE.BoxGeometry(0.1, 2.8, 0.5);
  const textStripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const textStrip = new THREE.Mesh(textStripGeom, textStripMat);
  textStrip.position.set(0, -1.75, 0);
  textStrip.rotation.z = -0.15;
  rbfGroup.add(textStrip);

  cubesatGroup.add(rbfGroup);

  return cubesatGroup;
}

const CubesatVisor3D = ({ cabeceo = 0, balanceo = 0, giro = 0 }) => {
  const mountRef = useRef(null);
  const cubesatGroupRef = useRef(null);
  const cameraRef = useRef(null);
  const manualOffsetRef = useRef({ x: 0, y: 0, z: 0, posX: 0, posY: 0 });
  const rotRef = useRef({ cabeceo, balanceo, giro });

  useEffect(() => {
    rotRef.current = { cabeceo, balanceo, giro };
  }, [cabeceo, balanceo, giro]);

  useEffect(() => {
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2035); // Azul marino aclarado

    const width = mountRef.current.clientWidth || 380;
    const height = mountRef.current.clientHeight || 280;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 20.0); // Zoom out: más alejado para ver el cubesat completo
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    // --- ILUMINACIÓN EQUILIBRADA ---
    // Ambiente moderado para rellenar sombras sin blanquear
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.50);
    scene.add(ambientLight);

    // Luz principal desde la cámara frontal
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
    mainLight.position.set(8, 15, 18);
    scene.add(mainLight);

    // Relleno izquierdo suave
    const fillLight = new THREE.DirectionalLight(0xcce8ff, 0.8);
    fillLight.position.set(-12, 5, 10);
    scene.add(fillLight);

    // Relleno derecho suave
    const rightFill = new THREE.DirectionalLight(0xfff5e0, 0.6);
    rightFill.position.set(12, 5, 10);
    scene.add(rightFill);

    // Contorno superior
    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 20, 5);
    scene.add(topLight);

    // Acento cian neón lateral
    const cyanRimLight = new THREE.PointLight(0x00d4ff, 2.0, 30);
    cyanRimLight.position.set(-8, -3, 14);
    scene.add(cyanRimLight);

    // Acento dorado cálido para el latón
    const warmLight = new THREE.PointLight(0xffbb55, 1.2, 20);
    warmLight.position.set(8, -4, 12);
    scene.add(warmLight);

    // --- CUBESAT GROUP ---
    // Agregamos únicamente el diseño limpio y realista de createRealisticCubeSat sin meshes duplicados viejos
    const cubesatGroup = createRealisticCubeSat();
    scene.add(cubesatGroup);
    cubesatGroupRef.current = cubesatGroup;

    // --- INTERACTIVIDAD COMPLETA (MOUSE / TOUCH) ---
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let initialTouchDistance = null;

    let isPanning = false;

    const handleMouseDown = (e) => {
      if (e.button === 2 || e.shiftKey) {
        isPanning = true;
        isDragging = false;
      } else {
        isDragging = true;
        isPanning = false;
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!cubesatGroup) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (isDragging) {
        cubesatGroup.rotation.y += deltaX * 0.008;
        cubesatGroup.rotation.x += deltaY * 0.008;
      } else if (isPanning) {
        manualOffsetRef.current.posX += deltaX * 0.015;
        manualOffsetRef.current.posY -= deltaY * 0.015;
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        // Zoom con Ctrl + Rueda
        e.preventDefault();
        camera.position.z += e.deltaY * 0.012;
        camera.position.z = Math.max(6.0, Math.min(30.0, camera.position.z));
      } else {
        // PAN vertical directo con la Rueda
        e.preventDefault();
        manualOffsetRef.current.posY -= e.deltaY * 0.008;
        manualOffsetRef.current.posY = Math.max(-10.0, Math.min(10.0, manualOffsetRef.current.posY));
      }
    };

    const handleDoubleClick = () => {
      manualOffsetRef.current = { x: 0, y: 0, z: 0, posX: 0, posY: 0 };
      camera.position.set(0, 4.5, 16.0);
      camera.lookAt(0, 0, 0);
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('dblclick', handleDoubleClick);
    domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mouseup', handleMouseUp);

    // Eventos Táctiles (Soporte móvil)
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        isPanning = false;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isPanning = true;
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
        previousMousePosition = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
      }
    };

    const handleTouchMove = (e) => {
      if (!cubesatGroup) return;

      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        cubesatGroup.rotation.y += deltaX * 0.008;
        cubesatGroup.rotation.x += deltaY * 0.008;

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (isPanning && e.touches.length === 2) {
        const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const deltaX = currentMidX - previousMousePosition.x;
        const deltaY = currentMidY - previousMousePosition.y;

        manualOffsetRef.current.posX += deltaX * 0.015;
        manualOffsetRef.current.posY -= deltaY * 0.015;

        // Pinch to zoom simultáneo
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        if (initialTouchDistance) {
          const factor = currentDist / initialTouchDistance;
          camera.position.z = Math.max(6.0, Math.min(30.0, camera.position.z / (factor > 1 ? 1.02 : 0.98)));
        }

        previousMousePosition = { x: currentMidX, y: currentMidY };
        initialTouchDistance = currentDist;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
      isPanning = false;
      initialTouchDistance = null;
    };

    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    domElement.addEventListener('touchend', handleTouchEnd);

    // --- ANIMATION LOOP ---
    const toRad = Math.PI / 180;
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Aplicar rotación inercial (telemetría offline) + offsets de arrastre
      const { cabeceo: c, balanceo: b, giro: g } = rotRef.current;
      cubesatGroup.position.x = manualOffsetRef.current.posX;
      cubesatGroup.position.y = manualOffsetRef.current.posY;

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
      domElement.removeEventListener('contextmenu', handleContextMenu);
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
      renderer.dispose();
    };
  }, []);

  const rotateSat = (direction) => {
    const step = 0.15;
    if (cubesatGroupRef.current) {
      if (direction === 'left') cubesatGroupRef.current.rotation.y -= step;
      if (direction === 'right') cubesatGroupRef.current.rotation.y += step;
      if (direction === 'up') cubesatGroupRef.current.rotation.x -= step;
      if (direction === 'down') cubesatGroupRef.current.rotation.x += step;
    }
  };

  const zoomSat = (type) => {
    if (cameraRef.current) {
      const step = 1.0;
      if (type === 'in') {
        cameraRef.current.position.z = Math.max(6.0, cameraRef.current.position.z - step);
      } else {
        cameraRef.current.position.z = Math.min(30.0, cameraRef.current.position.z + step);
      }
    }
  };

  const resetSat = () => {
    manualOffsetRef.current = { x: 0, y: 0, z: 0, posX: 0, posY: 0 };
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 4.5, 16.0);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (cubesatGroupRef.current) {
      cubesatGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  return (
    <div className="visor-3d-container-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .cubesat-visor-3d canvas {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='11' stroke='%2300e5ff' stroke-width='1.5' fill='none' stroke-dasharray='3, 2' /><circle cx='16' cy='16' r='1.5' fill='%2300e5ff' /><path d='M16 1 L16 4 M16 28 L16 31 M1 16 L4 16 M28 16 L31 16' stroke='%2300e5ff' stroke-width='1.5' /><path d='M23 9 A 10 10 0 0 1 23 23' stroke='%2300e5ff' stroke-width='1.5' fill='none' /><polygon points='23,23 20,20 26,20' fill='%2300e5ff' /></svg>") 16 16, grab !important;
        }
        .cubesat-visor-3d canvas:active {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='11' stroke='%2300e5ff' stroke-width='1.5' fill='none' stroke-dasharray='3, 2' /><circle cx='16' cy='16' r='1.5' fill='%2300e5ff' /><path d='M16 1 L16 4 M16 28 L16 31 M1 16 L4 16 M28 16 L31 16' stroke='%2300e5ff' stroke-width='1.5' /><path d='M23 9 A 10 10 0 0 1 23 23' stroke='%2300e5ff' stroke-width='1.5' fill='none' /><polygon points='23,23 20,20 26,20' fill='%2300e5ff' /></svg>") 16 16, grabbing !important;
        }
        .visor-3d-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 10;
        }
        .visor-3d-btn {
          width: 28px;
          height: 28px;
          background: rgba(18, 24, 38, 0.85);
          border: 1px solid rgba(0, 229, 255, 0.3);
          color: #00e5ff;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }
        .visor-3d-btn:hover {
          background: rgba(0, 229, 255, 0.2);
          border-color: #00e5ff;
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
        }
        .visor-3d-btn--active {
          background: #00e5ff !important;
          color: #0d1117 !important;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
        }
        .visor-3d-btn-group-row {
          display: flex;
          gap: 6px;
        }
      `}</style>

      <div className="cubesat-visor-3d" ref={mountRef} style={{ width: '100%', height: '100%' }}></div>

      <div className="visor-3d-controls">
        {/* Fila de Rotación arriba/abajo */}
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={() => rotateSat('up')} title="Orbitar Arriba">
            <i className="fa-solid fa-arrow-up"></i>
          </button>
          <button className="visor-3d-btn" onClick={() => rotateSat('down')} title="Orbitar Abajo">
            <i className="fa-solid fa-arrow-down"></i>
          </button>
        </div>

        {/* Fila de Rotación izquierda/derecha */}
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={() => rotateSat('left')} title="Orbitar Izquierda">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <button className="visor-3d-btn" onClick={() => rotateSat('right')} title="Orbitar Derecha">
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>

        {/* Zoom */}
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={() => zoomSat('in')} title="Acercar (Zoom +)">
            <i className="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <button className="visor-3d-btn" onClick={() => zoomSat('out')} title="Alejar (Zoom -)">
            <i className="fa-solid fa-magnifying-glass-minus"></i>
          </button>
        </div>

        {/* Reset */}
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={resetSat} title="Vista de Fábrica (Home)" style={{ width: '62px' }}>
            <i className="fa-solid fa-house" style={{ marginRight: '4px' }}></i> Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CubesatVisor3D;
