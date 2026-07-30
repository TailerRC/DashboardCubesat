import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './CubeSatModel.css';

// ── Función auxiliar para construir el modelo 3D como un Cubo Simple (Analítico) de 1m por lado ──
function createSimpleCube() {
  const cubesatGroup = new THREE.Group();

  // Material de cristal semi-transparente oscuro
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x0d121f,
    transparent: true,
    opacity: 0.7,
    roughness: 0.15,
    metalness: 0.85,
    side: THREE.DoubleSide
  });

  // Material de líneas cian brillante
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    linewidth: 2
  });

  // Cubo perfecto de 3.6 x 3.6 x 3.6 (proporción exacta de 1m por lado)
  const size = 3.6;
  const geom = new THREE.BoxGeometry(size, size, size);
  
  // Mallas del cubo y de los bordes cian
  const cubeMesh = new THREE.Mesh(geom, faceMat);
  cubesatGroup.add(cubeMesh);

  const edges = new THREE.EdgesGeometry(geom);
  const outline = new THREE.LineSegments(edges, lineMat);
  cubesatGroup.add(outline);

  // Ejes cartesianos de referencia integrados (X: rojo, Y: verde, Z: azul)
  const axisLength = 2.4;
  const axisRadius = 0.035;

  // Eje X (Rojo)
  const xGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const xMat = new THREE.MeshBasicMaterial({ color: 0xef5350 });
  const xAxis = new THREE.Mesh(xGeo, xMat);
  xAxis.rotation.z = Math.PI / 2;
  xAxis.position.x = axisLength / 2 + size / 2;
  cubesatGroup.add(xAxis);

  // Eje Y (Verde)
  const yGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const yMat = new THREE.MeshBasicMaterial({ color: 0x66bb6a });
  const yAxis = new THREE.Mesh(yGeo, yMat);
  yAxis.position.y = axisLength / 2 + size / 2;
  cubesatGroup.add(yAxis);

  // Eje Z (Azul)
  const zGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const zMat = new THREE.MeshBasicMaterial({ color: 0x42a5f5 });
  const zAxis = new THREE.Mesh(zGeo, zMat);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = axisLength / 2 + size / 2;
  cubesatGroup.add(zAxis);

  return cubesatGroup;
}

const CubeSatModel = ({ cabeceo = 0, balanceo = 0, giro = 0 }) => {
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

    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(7.5, 6.5, 9.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    renderer.domElement.className = 'three-canvas';
    mountRef.current.appendChild(renderer.domElement);

    // --- ILUMINACIÓN ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 15, 12);
    scene.add(mainLight);

    const cyanRimLight = new THREE.PointLight(0x00e5ff, 1.8, 40);
    cyanRimLight.position.set(-10, 8, -10);
    scene.add(cyanRimLight);

    // --- CUBESAT GROUP ---
    const cubesatGroup = createSimpleCube();
    scene.add(cubesatGroup);
    cubesatGroupRef.current = cubesatGroup;

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
      camera.position.z += e.deltaY * 0.008;
      camera.position.z = Math.max(4.0, Math.min(25.0, camera.position.z));
    };

    const handleDoubleClick = () => {
      manualOffset = { x: 0, y: 0 };
      camera.position.set(7.5, 6.5, 9.5);
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
        const hasTelemetry = c !== 0 || b !== 0 || g !== 0;
        if (hasTelemetry) {
          // Datos reales del MPU6050: orientar el cubo según ángulos de Euler
          cubesatGroup.rotation.x = c * toRad;
          cubesatGroup.rotation.y = g * toRad;
          cubesatGroup.rotation.z = b * toRad;
        } else {
          // Sin conexión MQTT: rotación demo suave
          cubesatGroup.rotation.x += 0.004;
          cubesatGroup.rotation.y += 0.006;
          cubesatGroup.rotation.z += 0.002;
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
      renderer.dispose();
    };
  }, []);

  return (
    <div className="cubesat-container" ref={mountRef}>
    </div>
  );
};

export default CubeSatModel;
