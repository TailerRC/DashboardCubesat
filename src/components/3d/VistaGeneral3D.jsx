import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './VistaGeneral3D.css';

const VistaGeneral3D = ({ cabeceo = 0, balanceo = 0, giro = 0 }) => {
  const mountRef = useRef(null);
  
  const cubesatGroupRef = useRef(null);
  const earthGroupRef = useRef(null);
  const rotRef = useRef({ cabeceo, balanceo, giro });

  useEffect(() => {
    rotRef.current = { cabeceo, balanceo, giro };
  }, [cabeceo, balanceo, giro]);

  useEffect(() => {
    if (mountRef.current) {
       mountRef.current.innerHTML = '';
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 350;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2.5, 17);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.domElement.className = 'three-canvas';
    mountRef.current.appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight1.position.set(5, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4fc3f7, 0.6);
    dirLight2.position.set(-10, -5, -5);
    scene.add(dirLight2);

    // Root group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ─── 1. CUBESAT CON ESTRUCTURA INTERNA VISIBLE (Izquierda: x = -4.5) ───
    const cubesatGroup = new THREE.Group();
    cubesatGroup.position.set(-4.5, 0, 0);
    rootGroup.add(cubesatGroup);
    cubesatGroupRef.current = cubesatGroup;

    // Chasis Exterior Transparente (Estructura de Vidrio/Plástico)
    const chassisGeom = new THREE.BoxGeometry(3.6, 5.0, 3.6);
    const chassisMat = new THREE.MeshStandardMaterial({ 
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      metalness: 0.9,
      side: THREE.DoubleSide
    });
    const chassisMesh = new THREE.Mesh(chassisGeom, chassisMat);
    cubesatGroup.add(chassisMesh);

    // Líneas de Borde Neón para el Chasis
    const edgesGeom = new THREE.EdgesGeometry(chassisGeom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 });
    const outline = new THREE.LineSegments(edgesGeom, lineMat);
    cubesatGroup.add(outline);

    // --- COMPONENTES INTERNOS GRAFICADOS ---
    const internalGroup = new THREE.Group();
    cubesatGroup.add(internalGroup);

    // 1. Placa Madre / PCB Principal (Verde con Microchips)
    const pcbGeom = new THREE.BoxGeometry(2.8, 0.1, 2.8);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.5 });
    
    const pcb1 = new THREE.Mesh(pcbGeom, pcbMat);
    pcb1.position.set(0, 1.2, 0);
    internalGroup.add(pcb1);

    const pcb2 = new THREE.Mesh(pcbGeom, pcbMat);
    pcb2.position.set(0, -1.2, 0);
    internalGroup.add(pcb2);

    // Microchips sobre la placa (Cubos de color cobre/oro/negro)
    const chipGeom = new THREE.BoxGeometry(0.6, 0.2, 0.6);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    
    const chip1 = new THREE.Mesh(chipGeom, chipMat);
    chip1.position.set(0.5, 1.3, 0.5);
    internalGroup.add(chip1);

    const chip2 = new THREE.Mesh(chipGeom, chipMat);
    chip2.position.set(-0.6, 1.3, -0.6);
    chip2.scale.set(1.2, 0.8, 1.2);
    internalGroup.add(chip2);

    // 2. Batería LiPo (Bloque Plateado con Cables Simulado)
    const batGeom = new THREE.BoxGeometry(2.2, 1.2, 2.2);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const batMesh = new THREE.Mesh(batGeom, batMat);
    batMesh.position.set(0, 0, 0);
    internalGroup.add(batMesh);

    // 3. Sensor IMU MPU6050 (Pequeña placa azul en el centro)
    const imuGeom = new THREE.BoxGeometry(0.8, 0.08, 0.8);
    const imuMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
    const imuMesh = new THREE.Mesh(imuGeom, imuMat);
    imuMesh.position.set(0, -1.1, 0);
    internalGroup.add(imuMesh);

    // Paneles solares externos (en las caras del chasis)
    const panelGeom = new THREE.BoxGeometry(3.4, 0.05, 4.8);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.95, roughness: 0.1 });
    
    // Panel solar izquierdo
    const solarLeft = new THREE.Mesh(panelGeom, panelMat);
    solarLeft.position.set(-1.82, 0, 0);
    solarLeft.rotation.z = Math.PI / 2;
    cubesatGroup.add(solarLeft);

    // Panel solar derecho
    const solarRight = new THREE.Mesh(panelGeom, panelMat);
    solarRight.position.set(1.82, 0, 0);
    solarRight.rotation.z = Math.PI / 2;
    cubesatGroup.add(solarRight);

    // Antena extensible (Cilindro metálico)
    const antGeom = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95 });
    const antenna = new THREE.Mesh(antGeom, antMat);
    antenna.position.set(0, 3.6, 0);
    cubesatGroup.add(antenna);

    // Soporte de cuadrícula bajo el cubesat
    const gridHelper = new THREE.GridHelper(12, 12, 0x1e293b, 0x0f172a);
    gridHelper.position.set(-4.5, -4.0, 0);
    rootGroup.add(gridHelper);


    // ─── 2. PLANETA TIERRA HOLOGRÁFICO CON FOCO EN PERÚ (Derecha: x = 4.5) ───
    const earthGroup = new THREE.Group();
    earthGroup.position.set(4.5, 0, 0);
    rootGroup.add(earthGroup);
    earthGroupRef.current = earthGroup;

    // Globo Esfera Base
    const sphereRadius = 3.0;
    const sphereGeom = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x0c1524,
      transparent: true,
      opacity: 0.9,
      roughness: 0.8,
      metalness: 0.1
    });
    const baseSphere = new THREE.Mesh(sphereGeom, sphereMat);
    earthGroup.add(baseSphere);

    // Cuadrícula paralelos/meridianos
    const gridSphereGeom = new THREE.SphereGeometry(sphereRadius + 0.02, 16, 16);
    const gridSphereEdges = new THREE.EdgesGeometry(gridSphereGeom);
    const gridSphereMat = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.35
    });
    const gridLines = new THREE.LineSegments(gridSphereEdges, gridSphereMat);
    earthGroup.add(gridLines);

    // Puntos de Continentes (Holograma de matriz de puntos)
    const landmasses = [
      // América del Sur (Perú, Colombia, Brasil, Argentina, etc.)
      [-12, -77], [-15, -47], [-34, -58], [4, -74], [-3, -60], [-23, -43], [-20, -65], [-10, -55], [-5, -70], [-25, -57],
      // América del Norte
      [37, -120], [40, -74], [45, -100], [55, -115], [30, -90], [19, -99], [64, -150], [60, -95], [25, -80],
      // Europa / Asia
      [48, 2], [55, 37], [35, 139], [22, 114], [1, 103], [30, 104], [40, 116], [50, 80], [60, 100], [28, 77], [34, 45],
      // África
      [30, 31], [-26, 28], [9, 38], [0, 9], [12, -15], [-18, 47],
      // Oceanía
      [-25, 133], [-33, 151], [-37, 144]
    ];

    const landGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const landMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });

    landmasses.forEach(([lt, ln]) => {
      const th = (90 - lt) * (Math.PI / 180);
      const ph = (180 + ln) * (Math.PI / 180);
      const lx = sphereRadius * Math.sin(th) * Math.cos(ph);
      const ly = sphereRadius * Math.cos(th);
      const lz = sphereRadius * Math.sin(th) * Math.sin(ph);

      const dot = new THREE.Mesh(landGeom, landMat);
      dot.position.set(lx, ly, lz);
      earthGroup.add(dot);
    });

    // Marcador de Perú, Lima (Pin Rojo parpadeante con anillo de órbita)
    const peruLat = -12.0464;
    const peruLon = -77.0428;
    const pinR = sphereRadius + 0.05;
    
    const pTheta = (90 - peruLat) * (Math.PI / 180);
    const pPhi = (180 + peruLon) * (Math.PI / 180);
    
    const pinX = pinR * Math.sin(pTheta) * Math.cos(pPhi);
    const pinY = pinR * Math.cos(pTheta);
    const pinZ = pinR * Math.sin(pTheta) * Math.sin(pPhi);

    const pinGeom = new THREE.SphereGeometry(0.16, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const pinMesh = new THREE.Mesh(pinGeom, pinMat);
    pinMesh.position.set(pinX, pinY, pinZ);
    earthGroup.add(pinMesh);

    // Anillo de órbita satelital alrededor de la Tierra
    const orbitRadius = 4.2;
    const orbitGeom = new THREE.RingGeometry(orbitRadius - 0.015, orbitRadius + 0.015, 64);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x00e676, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const orbitLine = new THREE.Mesh(orbitGeom, orbitMat);
    orbitLine.rotation.x = Math.PI / 2.1;
    earthGroup.add(orbitLine);

    // Cubesat miniatura orbitando la Tierra
    const orbitSatGeom = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    const orbitSatMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const orbitSat = new THREE.Mesh(orbitSatGeom, orbitSatMat);
    
    const orbitGroup = new THREE.Group();
    orbitSat.position.set(orbitRadius, 0, 0);
    orbitGroup.add(orbitSat);
    orbitGroup.rotation.x = Math.PI / 2.1;
    earthGroup.add(orbitGroup);

    // Soporte de cuadrícula bajo la Tierra
    const gridHelper2 = new THREE.GridHelper(12, 12, 0x1e293b, 0x0f172a);
    gridHelper2.position.set(4.5, -4.0, 0);
    rootGroup.add(gridHelper2);


    // ─── 3. ARRASTRE DE MOUSE PERSONALIZADO (Izquierda = Cubesat | Derecha = Tierra) ───
    let isDragging = false;
    let targetObject = null; // 'cubesat' | 'earth'
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      isDragging = true;
      const rect = renderer.domElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      // Si hace click en la mitad izquierda, rota el Cubesat, de lo contrario la Tierra
      if (clickX < rect.width / 2) {
        targetObject = 'cubesat';
      } else {
        targetObject = 'earth';
      }
    };

    const handleMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const deltaMove = {
        x: currentX - previousMousePosition.x,
        y: currentY - previousMousePosition.y
      };

      if (isDragging && targetObject) {
        if (targetObject === 'cubesat' && cubesatGroup) {
          cubesatGroup.rotation.y += deltaMove.x * 0.008;
          cubesatGroup.rotation.x += deltaMove.y * 0.008;
        } else if (targetObject === 'earth' && earthGroup) {
          earthGroup.rotation.y += deltaMove.x * 0.008;
          earthGroup.rotation.x += deltaMove.y * 0.008;
        }
      }

      previousMousePosition = {
        x: currentX,
        y: currentY
      };
    };

    const handleMouseUp = () => {
      isDragging = false;
      targetObject = null;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);


    // ─── 4. BUCLE DE ANIMACIÓN Y RENDERIZADO ───
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotación lenta de la Tierra
      if (earthGroup && !isDragging) {
        earthGroup.rotation.y += 0.0015;
      }

      // Órbita constante del mini cubesat
      if (orbitGroup) {
        orbitGroup.rotation.y += 0.012;
      }

      // Rotación del Cubesat de actitud (AUTO/MANUAL)
      // En la Vista General, se alinea con la telemetría IMU real
      if (cubesatGroup && !isDragging) {
        const toRad = Math.PI / 180;
        const { cabeceo: c, balanceo: b, giro: g } = rotRef.current;
        cubesatGroup.rotation.x = c * toRad;
        cubesatGroup.rotation.y = g * toRad;
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

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      if (mountRef.current && mountRef.current.contains(domElement)) {
        mountRef.current.removeChild(domElement);
      }

      chassisGeom.dispose();
      chassisMat.dispose();
      edgesGeom.dispose();
      lineMat.dispose();
      pcbGeom.dispose();
      pcbMat.dispose();
      chipGeom.dispose();
      chipMat.dispose();
      batGeom.dispose();
      batMat.dispose();
      imuGeom.dispose();
      imuMat.dispose();
      panelGeom.dispose();
      panelMat.dispose();
      antGeom.dispose();
      antMat.dispose();
      gridHelper.dispose();
      gridHelper2.dispose();
      sphereGeom.dispose();
      sphereMat.dispose();
      gridSphereGeom.dispose();
      gridSphereEdges.dispose();
      gridSphereMat.dispose();
      landGeom.dispose();
      landMat.dispose();
      pinGeom.dispose();
      pinMat.dispose();
      orbitGeom.dispose();
      orbitMat.dispose();
      orbitSatGeom.dispose();
      orbitSatMat.dispose();
      orbitSatEdges.dispose();
      orbitSatEdgeMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="vista-general-3d-container" ref={mountRef}>
      <div className="three-overlay-left">
        <i className="fa-solid fa-microchip" style={{ marginRight: '5px' }}></i>
        CUBESAT INTERNAL ESTRUCTURA (INTERACTIVO)
      </div>
      <div className="three-overlay-right">
        <i className="fa-solid fa-earth-americas" style={{ marginRight: '5px' }}></i>
        ÓRBITA SOBRE LIMA, PERÚ
      </div>
    </div>
  );
};

export default VistaGeneral3D;
