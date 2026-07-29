import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './CubeSatModel.css';

const CubeSatModel = ({ cabeceo = 0, balanceo = 0, giro = 0, modo = 'AUTO', onAutoUpdate }) => {
  const mountRef = useRef(null);

  const cubeRef = useRef(null);
  const modoRef = useRef(modo);
  const rotRef = useRef({ cabeceo, balanceo, giro });
  const callbackRef = useRef(onAutoUpdate);

  useEffect(() => {
    modoRef.current = modo;
    rotRef.current = { cabeceo, balanceo, giro };
    callbackRef.current = onAutoUpdate;
  }, [modo, cabeceo, balanceo, giro, onAutoUpdate]);

  useEffect(() => {
    // 0. Limpieza brutal: asegurar que el contenedor esté vacío antes de inicializar
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);

    // Asignamos una clase específica al canvas generado por Three.js para asegurarnos
    renderer.domElement.className = 'three-canvas';
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 20, 10);
    scene.add(directionalLight);

    const geometry = new THREE.BoxGeometry(10, 11.35, 10);
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
      new THREE.MeshStandardMaterial({ color: 0x1a472a }),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    ];

    const cube = new THREE.Mesh(geometry, materials);

    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x39ff14, linewidth: 2 });
    const cubeEdges = new THREE.LineSegments(edgesGeo, edgesMat);
    cube.add(cubeEdges);

    const axesHelper = new THREE.AxesHelper(15);
    cube.add(axesHelper);

    scene.add(cube);
    cubeRef.current = cube;

    const gridHelper = new THREE.GridHelper(40, 40, 0x333333, 0x222222);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    let animationFrameId;

    // Normalizador de -180 a 180 para que el UI no se rompa con números infinitos
    const normalizeAngle = (radians) => {
      let deg = (radians * 180) / Math.PI;
      deg = deg % 360;
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;
      return deg;
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const toRad = Math.PI / 180;
      const { cabeceo: c, balanceo: b, giro: g } = rotRef.current;

      if (modoRef.current === 'AUTO') {
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;
        cube.rotation.z += 0.005;

        // Feedback al React UI (Limitar frecuencia si es necesario, pero requestAFrame corre bien)
        if (callbackRef.current) {
          const normC = normalizeAngle(cube.rotation.x);
          const normG = normalizeAngle(cube.rotation.y);
          const normB = normalizeAngle(cube.rotation.z);
          callbackRef.current(normC, normB, normG);
        }
      } else {
        cube.rotation.x = c * toRad;
        cube.rotation.y = g * toRad;
        cube.rotation.z = b * toRad;
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
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      materials.forEach(m => m.dispose());
      edgesGeo.dispose();
      edgesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="cubesat-container" ref={mountRef}>
    </div>
  );
};

export default CubeSatModel;
