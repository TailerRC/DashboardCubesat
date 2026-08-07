import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Auxiliary function to create the green printed diagonal truss lattice side panel
function createLatticePanel(S, thickness, greenMat) {
  const shape = new THREE.Shape();
  const half = S / 2;

  // Outer square contour
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();

  // Center circular hole
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, 0.45, 0, Math.PI * 2, true);
  shape.holes.push(centerHole);

  // 8 triangular beveled windows matching the printed green truss frame
  const rim = 0.55;
  const strut = 0.35;
  const rHub = 0.85;

  for (let i = 0; i < 8; i++) {
    const r_in = rHub + 0.15;
    const r_out = S / 2 - rim;

    const A1 = i * Math.PI / 4;
    const A2 = (i + 1) * Math.PI / 4;
    const A_mid = (A1 + A2) / 2;

    // V1 (inner vertex near circular hub)
    const v1 = new THREE.Vector2(r_in * Math.cos(A_mid), r_in * Math.sin(A_mid));

    // V2 (outer corner near ray 1)
    const perp1X = -Math.sin(A1);
    const perp1Y = Math.cos(A1);
    const p1 = new THREE.Vector2(r_out * Math.cos(A1), r_out * Math.sin(A1));
    const v2 = new THREE.Vector2(
      p1.x + perp1X * (strut / 2),
      p1.y + perp1Y * (strut / 2)
    );

    // V3 (outer corner near ray 2)
    const perp2X = Math.sin(A2);
    const perp2Y = -Math.cos(A2);
    const p2 = new THREE.Vector2(r_out * Math.cos(A2), r_out * Math.sin(A2));
    const v3 = new THREE.Vector2(
      p2.x + perp2X * (strut / 2),
      p2.y + perp2Y * (strut / 2)
    );

    const triPath = new THREE.Path();
    triPath.moveTo(v1.x, v1.y);
    triPath.lineTo(v2.x, v2.y);
    triPath.lineTo(v3.x, v3.y);
    triPath.closePath();
    shape.holes.push(triPath);
  }

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 24
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();

  const mesh = new THREE.Mesh(geom, greenMat);
  return mesh;
}

function createRealisticCubeSat() {
  const cubesatGroup = new THREE.Group();

  // Vibrant green printed filament material for the side panels
  const greenLatticeMat = new THREE.MeshPhysicalMaterial({
    color: 0x22c55e, // Apple/filament green
    roughness: 0.25,
    metalness: 0.05,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15
  });

  // Matte black corner rails
  const blackCornerMat = new THREE.MeshPhysicalMaterial({
    color: 0x18181b,
    roughness: 0.4,
    metalness: 0.15,
    clearcoat: 0.1
  });

  // Brushed aluminum grey for top, bottom, and internal compartment
  const greyMetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x9ca3af,
    metalness: 0.6,
    roughness: 0.25,
    clearcoat: 0.5
  });

  // Shiny silver screw caps
  const screwMat = new THREE.MeshPhysicalMaterial({
    color: 0xe5e7eb,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 0.8
  });

  const railHeight = 8.0;
  const size = 8.0;
  const halfS = size / 2;

  // 1. BLACK CORNER RAILS & CORNER FOOT BRACKETS
  const railGeom = new THREE.BoxGeometry(0.4, railHeight, 0.4);
  const railPositions = [
    [-halfS, 0, -halfS],
    [halfS, 0, -halfS],
    [-halfS, 0, halfS],
    [halfS, 0, halfS]
  ];

  railPositions.forEach(([rx, ry, rz]) => {
    const rail = new THREE.Mesh(railGeom, blackCornerMat);
    rail.position.set(rx, ry, rz);
    cubesatGroup.add(rail);

    // Corner caps
    const footGeom = new THREE.BoxGeometry(0.6, 0.4, 0.6);
    const footTop = new THREE.Mesh(footGeom, blackCornerMat);
    footTop.position.set(rx, railHeight / 2 + 0.2, rz);
    cubesatGroup.add(footTop);

    const footBottom = new THREE.Mesh(footGeom, blackCornerMat);
    footBottom.position.set(rx, -railHeight / 2 - 0.2, rz);
    cubesatGroup.add(footBottom);
  });

  // 2. SOLID GREY TOP PLATE
  const topPlateGeom = new THREE.BoxGeometry(size - 0.2, 0.15, size - 0.2);
  const topPlate = new THREE.Mesh(topPlateGeom, greyMetalMat);
  topPlate.position.set(0, railHeight / 2, 0);
  cubesatGroup.add(topPlate);

  // 2b. GREEN BOTTOM PLATE WITH A SQUARE CORNER HOLE FOR THE CAMERA
  const plateSize = size - 0.2;
  const hP = plateSize / 2;
  const bottomPlateShape = new THREE.Shape();
  bottomPlateShape.moveTo(-hP, -hP);
  bottomPlateShape.lineTo(hP, -hP);
  bottomPlateShape.lineTo(hP, hP);
  bottomPlateShape.lineTo(-hP, hP);
  bottomPlateShape.closePath();

  // Add square hole in the front-left corner (in 2D shape coords)
  // Corner at X = -2.7, Y = 2.7 (representing Z in 3D)
  const holeSize = 1.0;
  const holeHalf = holeSize / 2;
  const holeX = -2.6;
  const holeY = 2.6;
  const cameraHole = new THREE.Path();
  cameraHole.moveTo(holeX - holeHalf, holeY - holeHalf);
  cameraHole.lineTo(holeX + holeHalf, holeY - holeHalf);
  cameraHole.lineTo(holeX + holeHalf, holeY + holeHalf);
  cameraHole.lineTo(holeX - holeHalf, holeY + holeHalf);
  cameraHole.closePath();
  bottomPlateShape.holes.push(cameraHole);

  const bottomPlateExtSettings = {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 16
  };

  const bottomPlateGeom = new THREE.ExtrudeGeometry(bottomPlateShape, bottomPlateExtSettings);
  bottomPlateGeom.center();
  
  const bottomPlate = new THREE.Mesh(bottomPlateGeom, greenLatticeMat);
  // Lay it flat horizontally (rotate X) and place it at the bottom
  bottomPlate.rotation.x = Math.PI / 2;
  bottomPlate.position.set(0, -railHeight / 2, 0);
  cubesatGroup.add(bottomPlate);

  // 2c. TINY CAMERA MODULE POINTING DOWNWARDS
  const cameraGroup = new THREE.Group();
  cameraGroup.position.set(holeX, -railHeight / 2, holeY); // Align with extruded hole Y->Z

  // Camera main body box (placed slightly inside the cubesat)
  const camBodyGeom = new THREE.BoxGeometry(0.8, 0.6, 0.8);
  const camBodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1f2937, roughness: 0.5 });
  const camBody = new THREE.Mesh(camBodyGeom, camBodyMat);
  camBody.position.y = 0.3;
  cameraGroup.add(camBody);

  // Brass/gold lens ring pointing downwards
  const lensRingGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.25, 12);
  const brassCameraMat = new THREE.MeshPhysicalMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
  const lensRing = new THREE.Mesh(lensRingGeom, brassCameraMat);
  lensRing.position.y = -0.05;
  cameraGroup.add(lensRing);

  // Dark glass lens element
  const lensGlassGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12);
  const lensGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x020617, roughness: 0.05, transmission: 0.3, thickness: 0.1 });
  const lensGlass = new THREE.Mesh(lensGlassGeom, lensGlassMat);
  lensGlass.position.y = -0.15;
  cameraGroup.add(lensGlass);

  cubesatGroup.add(cameraGroup);

  // 3. 4 CLOSED GREEN LATTICE SIDE PANELS (PEER THROUGH INTERIOR)
  const panelWidth = size - 0.3;
  const panelHeight = railHeight - 0.5;

  const panelOffsets = [
    { pos: [0, 0, -halfS - 0.02], rot: [0, Math.PI, 0] },
    { pos: [-halfS - 0.02, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [halfS + 0.02, 0, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [0, 0, halfS + 0.02], rot: [0, 0, 0] }
  ];

  panelOffsets.forEach(({ pos, rot }) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.set(...pos);
    faceGroup.rotation.set(...rot);

    // Green diagonal truss lattice panel (pass exactly 3 parameters to avoid parameter mismatch)
    const latticePanel = createLatticePanel(panelWidth, 0.15, greenLatticeMat);
    faceGroup.add(latticePanel);

    // Silver corner screws on panels
    const screwGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    const offset = halfS - 0.45;
    const screwPos = [
      [-offset, panelHeight / 2 - 0.4, 0.1],
      [offset, panelHeight / 2 - 0.4, 0.1],
      [-offset, -panelHeight / 2 + 0.4, 0.1],
      [offset, -panelHeight / 2 + 0.4, 0.1]
    ];
    screwPos.forEach(([sx, sy, sz]) => {
      const screw = new THREE.Mesh(screwGeom, screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, sz);
      faceGroup.add(screw);
    });

    cubesatGroup.add(faceGroup);
  });

  // 4. INNER GREY COMPARTMENT (TOP 30% OF HEIGHT)
  const compHeight = 2.4;
  const compGeom = new THREE.BoxGeometry(size - 0.6, compHeight, size - 0.6);
  const compartment = new THREE.Mesh(compGeom, greyMetalMat);
  compartment.position.set(0, 2.7, 0);
  cubesatGroup.add(compartment);

  // 5. INNER ELECTRONICS STACK (FILLING THE OTHER 70% SPACE DENSELY)
  const stackGroup = new THREE.Group();
  const layerSpacing = 1.15;
  const startY = -3.1;

  // PCB layers green base material
  const pcbMat = new THREE.MeshPhysicalMaterial({
    color: 0x15803d, // Dark PCB green
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.3
  });

  // Brass support rods for PCBs
  const brassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8a020,
    metalness: 0.8,
    roughness: 0.15,
    clearcoat: 0.5
  });

  const redBatteryMat = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 0.4
  });

  const rodGeom = new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8);
  const rodOffset = 2.8;
  const rodCoords = [
    [-rodOffset, -1.0, -rodOffset],
    [rodOffset, -1.0, -rodOffset],
    [-rodOffset, -1.0, rodOffset],
    [rodOffset, -1.0, rodOffset]
  ];
  rodCoords.forEach(([rx, ry, rz]) => {
    // If it's a valid coordinate array
    if (typeof rx === 'number' && typeof rz === 'number') {
      const rod = new THREE.Mesh(rodGeom, brassMat);
      rod.position.set(rx, ry, rz);
      stackGroup.add(rod);
    }
  });

  const pcbBoardGeom = new THREE.BoxGeometry(6.4, 0.08, 6.4);

  // --- PCB LAYER 1: BATTERIES & POWER ---
  const pcb1 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb1.position.y = startY;
  stackGroup.add(pcb1);

  // Red battery cylinders (Lithium cells) lying down
  const batGeom = new THREE.CylinderGeometry(0.48, 0.48, 2.2, 16);
  const batCapMat = new THREE.MeshPhysicalMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.15 });

  const bat1Group = new THREE.Group();
  bat1Group.add(new THREE.Mesh(batGeom, redBatteryMat));
  const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.08, 16), batCapMat);
  cap1.position.y = 1.1;
  bat1Group.add(cap1);
  bat1Group.rotation.z = Math.PI / 2;
  bat1Group.position.set(-1.0, startY + 0.35, -1.2);
  stackGroup.add(bat1Group);

  const bat2Group = bat1Group.clone();
  bat2Group.position.set(1.0, startY + 0.35, -1.2);
  stackGroup.add(bat2Group);

  // Another set of red batteries
  const bat3Group = bat1Group.clone();
  bat3Group.position.set(-1.0, startY + 0.35, 1.2);
  stackGroup.add(bat3Group);

  const bat4Group = bat1Group.clone();
  bat4Group.position.set(1.0, startY + 0.35, 1.2);
  stackGroup.add(bat4Group);

  // --- PCB LAYER 2: OBC (ESP32 CPU & MEMS SENSORS) ---
  const pcb2 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb2.position.y = startY + layerSpacing;
  stackGroup.add(pcb2);

  // ESP32 module details
  const espGroup = new THREE.Group();
  espGroup.position.set(-0.8, startY + layerSpacing + 0.08, -0.6);
  const espBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 2.2), new THREE.MeshPhysicalMaterial({ color: 0x1f2937, roughness: 0.5 }));
  espGroup.add(espBase);
  const espShield = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.4), new THREE.MeshPhysicalMaterial({ color: 0xe5e7eb, metalness: 0.85, roughness: 0.2 }));
  espShield.position.set(0, 0.05, -0.2);
  espGroup.add(espShield);
  const led1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.0 }));
  led1.position.set(0.5, 0.05, 0.7);
  espGroup.add(led1);
  stackGroup.add(espGroup);

  // SCD40 CO2 sensor block
  const scdBlock = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), new THREE.MeshPhysicalMaterial({ color: 0x27272a, roughness: 0.6 }));
  scdBlock.position.set(1.5, startY + layerSpacing + 0.29, 1.5);
  stackGroup.add(scdBlock);

  // --- PCB LAYER 3: COMMUNICATIONS LAYER (RF TRANSCEIVER & NESTED CIRCUITS) ---
  const pcb3 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb3.position.y = startY + layerSpacing * 2;
  stackGroup.add(pcb3);

  // Ceramic GPS antenna patch
  const gpsPatch = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 1.3), new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.7 }));
  gpsPatch.position.set(-1.6, startY + layerSpacing * 2 + 0.15, 1.5);
  stackGroup.add(gpsPatch);

  // Metal RF shield can
  const rfShield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 2.2), greyMetalMat);
  rfShield.position.set(1.2, startY + layerSpacing * 2 + 0.14, -0.8);
  stackGroup.add(rfShield);

  // Coil antenna inductor detail
  const coilGeom = new THREE.TorusGeometry(0.24, 0.06, 8, 24);
  const coil = new THREE.Mesh(coilGeom, brassMat);
  coil.rotation.y = Math.PI / 2;
  coil.position.set(-1.4, startY + layerSpacing * 2 + 0.2, -1.0);
  stackGroup.add(coil);

  // --- PCB LAYER 4: PAYLOAD LAYER ---
  const pcb4 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb4.position.y = startY + layerSpacing * 3;
  stackGroup.add(pcb4);

  // Sensor microchips and header pins
  const chip1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.9), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  chip1.position.set(-1.2, startY + layerSpacing * 3 + 0.1, 1.0);
  stackGroup.add(chip1);

  const chip2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  chip2.position.set(1.4, startY + layerSpacing * 3 + 0.1, -1.4);
  stackGroup.add(chip2);

  // Header pins connector block
  const header = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.8), new THREE.MeshStandardMaterial({ color: 0x18181b }));
  header.position.set(0, startY + layerSpacing * 3 + 0.2, 1.6);
  stackGroup.add(header);

  cubesatGroup.add(stackGroup);
  
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
    scene.background = new THREE.Color(0x111827); // Matching dashboard background color

    const width = mountRef.current.clientWidth || 380;
    const height = mountRef.current.clientHeight || 280;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 20.0);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.50);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
    mainLight.position.set(8, 15, 18);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xcce8ff, 0.8);
    fillLight.position.set(-12, 5, 10);
    scene.add(fillLight);

    const rightFill = new THREE.DirectionalLight(0xfff5e0, 0.6);
    rightFill.position.set(12, 5, 10);
    scene.add(rightFill);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 20, 5);
    scene.add(topLight);

    const cyanRimLight = new THREE.PointLight(0x00d4ff, 2.0, 30);
    cyanRimLight.position.set(-8, -3, 14);
    scene.add(cyanRimLight);

    const warmLight = new THREE.PointLight(0xffbb55, 1.2, 20);
    warmLight.position.set(8, -4, 12);
    scene.add(warmLight);

    // --- CUBESAT GROUP ---
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
        e.preventDefault();
        camera.position.z += e.deltaY * 0.012;
        camera.position.z = Math.max(6.0, Math.min(30.0, camera.position.z));
      } else {
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

        // Pinch to zoom
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
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Aplicar rotación inercial + offsets de arrastre
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
        if (obj.isMesh || obj.isLine || obj.isPoints) {
          if (obj.geometry && typeof obj.geometry.dispose === 'function') {
            obj.geometry.dispose();
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => {
                if (m && typeof m.dispose === 'function') m.dispose();
              });
            } else if (typeof obj.material.dispose === 'function') {
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
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={() => rotateSat('up')} title="Orbitar Arriba">
            <i className="fa-solid fa-arrow-up"></i>
          </button>
          <button className="visor-3d-btn" onClick={() => rotateSat('down')} title="Orbitar Abajo">
            <i className="fa-solid fa-arrow-down"></i>
          </button>
        </div>
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={() => rotateSat('left')} title="Orbitar Izquierda">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <button className="visor-3d-btn" onClick={() => rotateSat('right')} title="Orbitar Derecha">
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
        <div className="visor-3d-btn-group-row">
          <button className="visor-3d-btn" onClick={() => zoomSat('in')} title="Zoom In">
            <i className="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <button className="visor-3d-btn" onClick={() => zoomSat('out')} title="Zoom Out">
            <i className="fa-solid fa-magnifying-glass-minus"></i>
          </button>
        </div>
        <button className="visor-3d-btn" onClick={resetSat} title="Restablecer Vista" style={{ width: '100%' }}>
          <i className="fa-solid fa-house"></i> <span style={{ fontSize: '9px', marginLeft: '4px' }}>Home</span>
        </button>
      </div>
    </div>
  );
};

export default CubesatVisor3D;
