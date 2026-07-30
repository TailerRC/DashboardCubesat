import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// ── Función auxiliar para construir el modelo 3D con Puerta Abierta y Componentes Reales ──
function createRealisticCubeSat() {
  const cubesatGroup = new THREE.Group();

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

  // 1. RAÍLES DE ESQUINA CUBESAT 1U
  const railHeight = 4.6;
  const size = 3.6;
  const halfS = size / 2;

  const railGeom = new THREE.BoxGeometry(0.25, railHeight, 0.25);
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

    const footGeom = new THREE.BoxGeometry(0.35, 0.2, 0.35);
    const footTop = new THREE.Mesh(footGeom, darkAluminumMat);
    footTop.position.set(rx, railHeight / 2 + 0.1, rz);
    cubesatGroup.add(footTop);

    const footBottom = new THREE.Mesh(footGeom, darkAluminumMat);
    footBottom.position.set(rx, -railHeight / 2 - 0.1, rz);
    cubesatGroup.add(footBottom);
  });

  // 2. MARCOS SUPERIOR E INFERIOR CNC
  const topBottomFrameGeom = new THREE.BoxGeometry(size + 0.1, 0.15, size + 0.1);
  const topFrame = new THREE.Mesh(topBottomFrameGeom, aluminumMat);
  topFrame.position.set(0, railHeight / 2, 0);
  cubesatGroup.add(topFrame);

  const bottomFrame = new THREE.Mesh(topBottomFrameGeom, aluminumMat);
  bottomFrame.position.set(0, -railHeight / 2, 0);
  cubesatGroup.add(bottomFrame);

  // 3. PANELES SOLARES LATERALES Y TRASERO
  const sidePlateGeom = new THREE.BoxGeometry(size - 0.1, railHeight - 0.3, 0.08);

  const panelOffsets = [
    { pos: [0, 0, -halfS - 0.04], rot: [0, Math.PI, 0] },
    { pos: [-halfS - 0.04, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [halfS + 0.04, 0, 0], rot: [0, Math.PI / 2, 0] }
  ];

  panelOffsets.forEach(({ pos, rot }) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.set(...pos);
    faceGroup.rotation.set(...rot);

    const frame = new THREE.Mesh(sidePlateGeom, aluminumMat);
    faceGroup.add(frame);

    const solarSurfaceGeom = new THREE.BoxGeometry(size - 0.6, railHeight - 0.7, 0.03);
    const solarMesh = new THREE.Mesh(solarSurfaceGeom, solarPanelMat);
    solarMesh.position.z = 0.04;
    faceGroup.add(solarMesh);

    const gridGeo = new THREE.PlaneGeometry(size - 0.7, railHeight - 0.8, 3, 5);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const gridLines = new THREE.LineSegments(new THREE.WireframeGeometry(gridGeo), gridMat);
    gridLines.position.z = 0.06;
    faceGroup.add(gridLines);

    const screwGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
    const screwPos = [
      [-halfS + 0.3, railHeight / 2 - 0.3, 0.05],
      [halfS - 0.3, railHeight / 2 - 0.3, 0.05],
      [-halfS + 0.3, -railHeight / 2 + 0.3, 0.05],
      [halfS - 0.3, -railHeight / 2 + 0.3, 0.05]
    ];
    screwPos.forEach(([sx, sy, sz]) => {
      const screw = new THREE.Mesh(screwGeom, screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, sz);
      faceGroup.add(screw);
    });

    cubesatGroup.add(faceGroup);
  });

  // 4. PUERTA FRONTAL TRANSPARENTE ABIERTA (BISAGRAS EN EL RAÍL IZQUIERDO)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-halfS, 0, halfS + 0.04);
  doorPivot.rotation.y = Math.PI * 0.35; // Abierta a 63 grados

  const doorFrameGeom = new THREE.BoxGeometry(size - 0.1, railHeight - 0.3, 0.06);
  const doorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    metalness: 0.9,
    side: THREE.DoubleSide
  });
  const doorGlass = new THREE.Mesh(doorFrameGeom, doorGlassMat);
  doorGlass.position.set(halfS - 0.05, 0, 0);
  doorPivot.add(doorGlass);

  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorFrameGeom),
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 })
  );
  doorEdges.position.set(halfS - 0.05, 0, 0);
  doorPivot.add(doorEdges);

  const hingeGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 10);
  const hingeTop = new THREE.Mesh(hingeGeom, aluminumMat);
  hingeTop.position.set(0, 1.5, 0);
  doorPivot.add(hingeTop);

  const hingeBottom = new THREE.Mesh(hingeGeom, aluminumMat);
  hingeBottom.position.set(0, -1.5, 0);
  doorPivot.add(hingeBottom);

  cubesatGroup.add(doorPivot);

  // 5. COMPONENTES REALES DENTRO DEL CUBESAT
  const stackGroup = new THREE.Group();
  const layerSpacing = 0.85;
  const startY = -1.3;

  const rodGeom = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 8);
  const rodOffset = 1.3;
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

  const pcbBoardGeom = new THREE.BoxGeometry(2.9, 0.06, 2.9);

  // --- CAPA 1: EPS & BATERÍAS LIPO 18650 ---
  const pcb1 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb1.position.y = startY;
  stackGroup.add(pcb1);

  const batGeom = new THREE.CylinderGeometry(0.26, 0.26, 1.5, 12);
  const batWrapperMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
  const batCapMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9 });

  const bat1Group = new THREE.Group();
  bat1Group.add(new THREE.Mesh(batGeom, batWrapperMat));
  const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 12), batCapMat);
  cap1.position.y = 0.75;
  bat1Group.add(cap1);
  bat1Group.rotation.z = Math.PI / 2;
  bat1Group.position.set(0, startY + 0.2, -0.6);
  stackGroup.add(bat1Group);

  const bat2Group = bat1Group.clone();
  bat2Group.position.set(0, startY + 0.2, 0.6);
  stackGroup.add(bat2Group);

  const inaPcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.06, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xd97706 })
  );
  inaPcb.position.set(-0.9, startY + 0.08, 0);
  stackGroup.add(inaPcb);

  // --- CAPA 2: OBC (ESP32 + MPU6050 + SD SLOT) ---
  const pcb2 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb2.position.y = startY + layerSpacing;
  stackGroup.add(pcb2);

  const espGroup = new THREE.Group();
  espGroup.position.set(0, startY + layerSpacing + 0.08, 0);
  const espBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 1.1), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  espGroup.add(espBase);
  const espShield = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 }));
  espShield.position.set(0, 0.04, -0.1);
  espGroup.add(espShield);
  const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x00e5ff, emissiveIntensity: 1.5 }));
  ledMesh.position.set(0.25, 0.04, 0.35);
  espGroup.add(ledMesh);
  stackGroup.add(espGroup);

  const mpuGroup = new THREE.Group();
  mpuGroup.position.set(-0.9, startY + layerSpacing + 0.06, -0.8);
  const mpuPcb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.55), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
  mpuGroup.add(mpuPcb);
  const mpuChip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.2), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  mpuChip.position.y = 0.04;
  mpuGroup.add(mpuChip);
  stackGroup.add(mpuGroup);

  // --- CAPA 3: COMUNICACIONES (GPS NEO-7M & RF) ---
  const pcb3 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb3.position.y = startY + layerSpacing * 2;
  stackGroup.add(pcb3);

  const gpsGroup = new THREE.Group();
  gpsGroup.position.set(-0.8, startY + layerSpacing * 2 + 0.1, 0.7);
  const gpsShield = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 }));
  gpsGroup.add(gpsShield);
  const ceramicAnt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.45), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }));
  ceramicAnt.position.y = 0.07;
  gpsGroup.add(ceramicAnt);
  stackGroup.add(gpsGroup);

  const rfPcb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 1.0), new THREE.MeshStandardMaterial({ color: 0x047857 }));
  rfPcb.position.set(0.8, startY + layerSpacing * 2 + 0.06, 0);
  stackGroup.add(rfPcb);

  // --- CAPA 4: PAYLOAD SENSORES (BME280, SCD41 CO2, GUVA, PARACAÍDAS) ---
  const pcb4 = new THREE.Mesh(pcbBoardGeom, pcbMat);
  pcb4.position.y = startY + layerSpacing * 3;
  stackGroup.add(pcb4);

  const scdGroup = new THREE.Group();
  scdGroup.position.set(0.8, startY + layerSpacing * 3 + 0.15, 0.7);
  const scdBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.45), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
  scdGroup.add(scdBody);
  const scdMeshFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
  scdMeshFilter.position.y = 0.15;
  scdGroup.add(scdMeshFilter);
  stackGroup.add(scdGroup);

  const bmePcb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), new THREE.MeshStandardMaterial({ color: 0x7c3aed }));
  bmePcb.position.set(-0.8, startY + layerSpacing * 3 + 0.05, 0.8);
  stackGroup.add(bmePcb);

  const paraCanisterGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 14);
  const paraCanisterMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, transparent: true, opacity: 0.5 });
  const paraCanister = new THREE.Mesh(paraCanisterGeom, paraCanisterMat);
  paraCanister.position.set(0, startY + layerSpacing * 3 + 0.55, 0);
  
  const parachuteMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 14), new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.8 }));
  parachuteMesh.position.set(0, startY + layerSpacing * 3 + 0.55, 0);
  
  stackGroup.add(paraCanister);
  stackGroup.add(parachuteMesh);

  cubesatGroup.add(stackGroup);

  // 6. ANTENAS DE COMUNICACIÓN
  const smaBaseGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 10);
  const smaBase = new THREE.Mesh(smaBaseGeom, brassMat);
  smaBase.position.set(-0.9, railHeight / 2 + 0.12, -0.9);
  cubesatGroup.add(smaBase);

  const whipAntennaGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.5, 8);
  const whipAntenna = new THREE.Mesh(whipAntennaGeom, new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 }));
  whipAntenna.position.set(-0.9, railHeight / 2 + 1.35, -0.9);
  cubesatGroup.add(whipAntenna);

  const smaBase2 = new THREE.Mesh(smaBaseGeom, brassMat);
  smaBase2.position.set(0.9, railHeight / 2 + 0.12, 0.9);
  cubesatGroup.add(smaBase2);

  const rubberAntGeom = new THREE.CylinderGeometry(0.1, 0.07, 1.1, 10);
  const rubberAnt = new THREE.Mesh(rubberAntGeom, new THREE.MeshStandardMaterial({ color: 0x111827 }));
  rubberAnt.position.set(0.9, railHeight / 2 + 0.65, 0.9);
  cubesatGroup.add(rubberAnt);

  // 7. CINTA ROJA "REMOVE BEFORE FLIGHT"
  const rbfGroup = new THREE.Group();
  rbfGroup.position.set(halfS + 0.15, -0.4, halfS - 0.2);

  const ringGeom = new THREE.TorusGeometry(0.16, 0.02, 8, 16);
  const ringMesh = new THREE.Mesh(ringGeom, aluminumMat);
  rbfGroup.add(ringMesh);

  const ribbonGeom = new THREE.BoxGeometry(0.04, 1.8, 0.42);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.8 });
  const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
  ribbonMesh.position.set(0, -0.9, 0);
  ribbonMesh.rotation.z = -0.15;
  rbfGroup.add(ribbonMesh);

  const textStripGeom = new THREE.BoxGeometry(0.05, 1.4, 0.28);
  const textStripMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const textStrip = new THREE.Mesh(textStripGeom, textStripMat);
  textStrip.position.set(0, -0.9, 0);
  textStrip.rotation.z = -0.15;
  rbfGroup.add(textStrip);

  cubesatGroup.add(rbfGroup);

  return cubesatGroup;
}

const CubesatVisor3D = ({ cabeceo = 0, balanceo = 0, giro = 0 }) => {
  const mountRef = useRef(null);
  const cubesatGroupRef = useRef(null);
  const rotRef = useRef({ cabeceo, balanceo, giro });

  useEffect(() => {
    rotRef.current = { cabeceo, balanceo, giro };
  }, [cabeceo, balanceo, giro]);

  useEffect(() => {
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    const width = mountRef.current.clientWidth || 380;
    const height = mountRef.current.clientHeight || 280;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 9.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // --- ILUMINACIÓN PROFESIONAL ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
    mainLight.position.set(6, 14, 10);
    scene.add(mainLight);

    const cyanRimLight = new THREE.PointLight(0x00e5ff, 1.8, 40);
    cyanRimLight.position.set(-8, 5, -6);
    scene.add(cyanRimLight);

    const redAccentLight = new THREE.PointLight(0xd32f2f, 0.8, 15);
    redAccentLight.position.set(3, -2, 4);
    scene.add(redAccentLight);

    // --- CUBESAT GROUP ---
    const cubesatGroup = createRealisticCubeSat();
    scene.add(cubesatGroup);
    cubesatGroupRef.current = cubesatGroup;

    // Cuadrícula / Piso inercial
    const grid = new THREE.GridHelper(15, 15, 0x00e5ff, 0x1e293b);
    grid.position.y = -3.2;
    scene.add(grid);

    // --- INTERACTIVIDAD COMPLETA (MOUSE / TOUCH) ---
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
      camera.position.z += e.deltaY * 0.005;
      camera.position.z = Math.max(3.5, Math.min(20.0, camera.position.z));
    };

    const handleDoubleClick = () => {
      manualOffset = { x: 0, y: 0 };
      camera.position.set(0, 2.8, 9.2);
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

    // --- BUCLE DE ANIMACIÓN ---
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (cubesatGroup && !isDragging) {
        const toRad = Math.PI / 180;
        const { cabeceo: c, balanceo: b, giro: g } = rotRef.current;
        cubesatGroup.rotation.x = c * toRad + manualOffset.x;
        cubesatGroup.rotation.y = g * toRad + manualOffset.y;
        cubesatGroup.rotation.z = b * toRad;
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

      if (currentMount && currentMount.contains(domElement)) {
        currentMount.removeChild(domElement);
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
      grid.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="cubesat-visor-3d" ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
  );
};

export default CubesatVisor3D;
