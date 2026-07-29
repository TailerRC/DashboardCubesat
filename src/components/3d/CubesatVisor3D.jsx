import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

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
    scene.background = new THREE.Color(0x111318);

    const width = mountRef.current.clientWidth || 380;
    const height = mountRef.current.clientHeight || 280;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 9.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Luces para resaltar la estructura
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 12, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00e5ff, 0.55);
    dirLight2.position.set(-8, -4, -6);
    scene.add(dirLight2);

    // Cubesat Group
    const cubesatGroup = new THREE.Group();
    scene.add(cubesatGroup);
    cubesatGroupRef.current = cubesatGroup;

    // 1. Chasis exterior transparente
    const chassisGeom = new THREE.BoxGeometry(3.2, 4.6, 3.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      metalness: 0.9,
      side: THREE.DoubleSide
    });
    const chassisMesh = new THREE.Mesh(chassisGeom, chassisMat);
    cubesatGroup.add(chassisMesh);

    // Marcos metálicos / bordes (Outlines)
    const edgesGeom = new THREE.EdgesGeometry(chassisGeom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 });
    const outline = new THREE.LineSegments(edgesGeom, lineMat);
    cubesatGroup.add(outline);

    // 2. Paneles solares en caras exteriores
    const solarGeom = new THREE.BoxGeometry(2.8, 0.04, 4.0);
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95, roughness: 0.1 });
    
    const panelL = new THREE.Mesh(solarGeom, solarMat);
    panelL.position.set(-1.62, 0, 0);
    panelL.rotation.z = Math.PI / 2;
    cubesatGroup.add(panelL);

    const panelR = new THREE.Mesh(solarGeom, solarMat);
    panelR.position.set(1.62, 0, 0);
    panelR.rotation.z = Math.PI / 2;
    cubesatGroup.add(panelR);

    // --- COMPONENTES INTERNOS ---

    // A. Placa Base PCB Verde (OBC / Comunicaciones)
    const pcbGeom = new THREE.BoxGeometry(2.6, 0.08, 2.6);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 });
    const pcb = new THREE.Mesh(pcbGeom, pcbMat);
    pcb.position.set(0, 0.5, 0);
    cubesatGroup.add(pcb);

    // B. Microcontrolador principal ESP32 (Glow azul en el centro de la PCB)
    const espGeom = new THREE.BoxGeometry(0.7, 0.15, 0.7);
    const espMat = new THREE.MeshStandardMaterial({ 
      color: 0x1f2937,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.6
    });
    const espMesh = new THREE.Mesh(espGeom, espMat);
    espMesh.position.set(0, 0.6, 0);
    cubesatGroup.add(espMesh);

    // C. 7 Sensores detallados colocados en la placa
    // 1. MPU6050 (Acelerómetro/Giroscopio - Chip azul)
    const mpuGeom = new THREE.BoxGeometry(0.3, 0.1, 0.3);
    const mpuMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
    const mpu = new THREE.Mesh(mpuGeom, mpuMat);
    mpu.position.set(-0.7, 0.58, -0.7);
    cubesatGroup.add(mpu);

    // 2. BME280 (Temp/Presión - Chip plateado)
    const bmeGeom = new THREE.BoxGeometry(0.2, 0.08, 0.2);
    const bmeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const bme = new THREE.Mesh(bmeGeom, bmeMat);
    bme.position.set(0.7, 0.58, -0.7);
    cubesatGroup.add(bme);

    // 3. SCD-41 (CO2 - Bloque negro)
    const scdGeom = new THREE.BoxGeometry(0.4, 0.3, 0.4);
    const scdMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const scd = new THREE.Mesh(scdGeom, scdMat);
    scd.position.set(-0.7, 0.65, 0.7);
    cubesatGroup.add(scd);

    // 4. INA219 (Sensor corriente - Chip rojo)
    const inaGeom = new THREE.BoxGeometry(0.25, 0.1, 0.25);
    const inaMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const ina = new THREE.Mesh(inaGeom, inaMat);
    ina.position.set(0.7, 0.58, 0.7);
    cubesatGroup.add(ina);

    // 5. GUVA-S12SD (Sensor UV - Chip morado en la cara superior del chasis)
    const uvGeom = new THREE.BoxGeometry(0.25, 0.06, 0.25);
    const uvMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed });
    const uv = new THREE.Mesh(uvGeom, uvMat);
    uv.position.set(0, 2.31, 0.8);
    cubesatGroup.add(uv);

    // 6. u-blox NEO-7M (GPS Shield metal con antena blanca)
    const gpsGroup = new THREE.Group();
    gpsGroup.position.set(0.6, 0.62, 0);
    // Shield
    const gpsShield = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 }));
    gpsGroup.add(gpsShield);
    // Antena patch (Cerámica blanca)
    const gpsAnt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    gpsAnt.position.set(0, 0.1, 0);
    gpsGroup.add(gpsAnt);
    cubesatGroup.add(gpsGroup);

    // 7. NRF24L01 (Transceptor RF - Mini placa verde con antena de cobre)
    const rfGroup = new THREE.Group();
    rfGroup.position.set(-0.6, 0.65, 0);
    const rfPcb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: 0x047857 }));
    rfGroup.add(rfPcb);
    // Antena cobre enrollada
    const rfAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9 }));
    rfAnt.position.set(0, 0.1, 0.2);
    rfAnt.rotation.x = Math.PI / 2;
    rfGroup.add(rfAnt);
    cubesatGroup.add(rfGroup);

    // D. Compartimento del Paracaídas (Bote cilíndrico plateado con paracaídas naranja adentro)
    const paraCanisterGeom = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 16);
    const paraCanisterMat = new THREE.MeshStandardMaterial({ 
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6 // semi-transparente para ver el interior
    });
    const paraCanister = new THREE.Mesh(paraCanisterGeom, paraCanisterMat);
    paraCanister.position.set(0, -1.2, 0);
    cubesatGroup.add(paraCanister);

    // Tela del paracaídas plegada (Esfera naranja interna)
    const parachuteGeom = new THREE.SphereGeometry(0.68, 16, 16);
    const parachuteMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.9 });
    const parachute = new THREE.Mesh(parachuteGeom, parachuteMat);
    parachute.position.set(0, -1.2, 0);
    cubesatGroup.add(parachute);

    // Batería EPS (Bloque de alimentación)
    const batteryGeom = new THREE.BoxGeometry(2.0, 0.6, 2.0);
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const battery = new THREE.Mesh(batteryGeom, batteryMat);
    battery.position.set(0, -0.2, 0);
    cubesatGroup.add(battery);

    // Antena exterior de comunicación
    const mainAntenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 })
    );
    mainAntenna.position.set(0, 3.2, 0);
    cubesatGroup.add(mainAntenna);

    // Cuadrícula / Piso inercial
    const grid = new THREE.GridHelper(15, 15, 0x1f2937, 0x111827);
    grid.position.y = -3.2;
    scene.add(grid);

    // --- INTERACTIVIDAD CON MOUSE DRAG ---
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = () => {
      isDragging = true;
    };

    const handleMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const deltaMove = {
        x: currentX - previousMousePosition.x,
        y: currentY - previousMousePosition.y
      };

      if (isDragging && cubesatGroup) {
        cubesatGroup.rotation.y += deltaMove.x * 0.007;
        cubesatGroup.rotation.x += deltaMove.y * 0.007;
      }

      previousMousePosition = { x: currentX, y: currentY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.005;
      camera.position.z = Math.max(3.5, Math.min(20.0, camera.position.z));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);

    // --- BUCLE DE ANIMACIÓN ---
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

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
      domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleMouseUp);

      if (mountRef.current && mountRef.current.contains(domElement)) {
        mountRef.current.removeChild(domElement);
      }

      chassisGeom.dispose();
      chassisMat.dispose();
      edgesGeom.dispose();
      lineMat.dispose();
      solarGeom.dispose();
      solarMat.dispose();
      pcbGeom.dispose();
      pcbMat.dispose();
      espGeom.dispose();
      espMat.dispose();
      mpuGeom.dispose();
      mpuMat.dispose();
      bmeGeom.dispose();
      bmeMat.dispose();
      scdGeom.dispose();
      scdMat.dispose();
      inaGeom.dispose();
      inaMat.dispose();
      uvGeom.dispose();
      uvMat.dispose();
      gpsShield.geometry.dispose();
      gpsShield.material.dispose();
      gpsAnt.geometry.dispose();
      gpsAnt.material.dispose();
      rfPcb.geometry.dispose();
      rfPcb.material.dispose();
      rfAnt.geometry.dispose();
      rfAnt.material.dispose();
      paraCanisterGeom.dispose();
      paraCanisterMat.dispose();
      parachuteGeom.dispose();
      parachuteMat.dispose();
      batteryGeom.dispose();
      batteryMat.dispose();
      mainAntenna.geometry.dispose();
      mainAntenna.material.dispose();
      grid.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="cubesat-visor-3d" ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
  );
};

export default CubesatVisor3D;
