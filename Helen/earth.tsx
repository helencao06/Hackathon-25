import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './index.css';

// Iridium Constellation Parameters
const EARTH_RADIUS_KM = 6371;
const IRIDIUM_ALTITUDE_KM = 780;
const ORBITAL_PERIOD_MIN = 100.5;
const NUM_PLANES = 6;
const SATS_PER_PLANE = 11;
const INCLINATION_DEG = 86.4;
const RAAN_SPACING_DEG = 30;
const MAX_CROSSLINK_DISTANCE = 4000;
const COVERAGE_RADIUS_KM = 2700;

function calculateSatellitePosition(
  planeIndex: number,
  satIndex: number,
  timeMinutes: number
): { x: number; y: number; z: number } {
  const meanMotion = (2 * Math.PI) / ORBITAL_PERIOD_MIN;
  const phaseOffset = (2 * Math.PI * satIndex) / SATS_PER_PLANE;
  const raan = (RAAN_SPACING_DEG * planeIndex * Math.PI) / 180;
  const inclination = (INCLINATION_DEG * Math.PI) / 180;

  const meanAnomaly = meanMotion * timeMinutes + phaseOffset;

  const xOrbital = Math.cos(meanAnomaly);
  const yOrbital = Math.sin(meanAnomaly);

  const xInclined = xOrbital;
  const yInclined = yOrbital * Math.cos(inclination);
  const zInclined = yOrbital * Math.sin(inclination);

  const x = xInclined * Math.cos(raan) - yInclined * Math.sin(raan);
  const y = xInclined * Math.sin(raan) + yInclined * Math.cos(raan);
  const z = zInclined;

  const orbitalRadius = EARTH_RADIUS_KM + IRIDIUM_ALTITUDE_KM;
  return {
    x: x * orbitalRadius,
    y: y * orbitalRadius,
    z: z * orbitalRadius,
  };
}

function calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showRelayLinks, setShowRelayLinks] = React.useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    currentMount.appendChild(renderer.domElement);

    // Earth
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'),
      bumpMap: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'),
      bumpScale: 0.05,
      specularMap: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'),
      specular: new THREE.Color(0x333333),
      shininess: 5
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Lighting
    scene.add(new THREE.AmbientLight(0x404040));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Satellites and coverage
    const satellites: THREE.Mesh[] = [];
    const coverages: THREE.Mesh[] = [];
    const crossLinks: THREE.Line[] = [];

    const satelliteGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const satelliteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const coverageMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const linkMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3
    });

    // Create objects
    for (let i = 0; i < NUM_PLANES * SATS_PER_PLANE; i++) {
      // Satellite
      const sat = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      scene.add(sat);
      satellites.push(sat);

      // Coverage area
      const coverage = new THREE.Mesh(
        new THREE.CircleGeometry(COVERAGE_RADIUS_KM / EARTH_RADIUS_KM, 32),
        coverageMaterial
      );
      scene.add(coverage);
      coverages.push(coverage);
    }

    // Create crosslinks
    for (let i = 0; i < satellites.length; i++) {
      for (let j = i + 1; j < satellites.length; j++) {
        const link = new THREE.Line(new THREE.BufferGeometry(), linkMaterial);
        scene.add(link);
        crossLinks.push(link);
      }
    }

    // Camera and controls
    camera.position.z = 3;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Animation
    function animate() {
      const now = new Date();
      const tMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
      
      const positions: { x: number; y: number; z: number }[] = [];
      
      // Update satellites and coverage areas
      for (let plane = 0; plane < NUM_PLANES; plane++) {
        for (let sat = 0; sat < SATS_PER_PLANE; sat++) {
          const satIdx = plane * SATS_PER_PLANE + sat;
          const pos = calculateSatellitePosition(plane, sat, tMinutes);
          positions.push(pos);
          
          // Update satellite
          const normalizedPos = {
            x: pos.x / EARTH_RADIUS_KM,
            y: pos.y / EARTH_RADIUS_KM,
            z: pos.z / EARTH_RADIUS_KM
          };
          satellites[satIdx].position.set(normalizedPos.x, normalizedPos.y, normalizedPos.z);
          
          // Update coverage area
          const magnitude = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
          const subSatPoint = {
            x: pos.x / magnitude,
            y: pos.y / magnitude,
            z: pos.z / magnitude
          };
          
          coverages[satIdx].position.set(subSatPoint.x, subSatPoint.y, subSatPoint.z);
          const normal = new THREE.Vector3(subSatPoint.x, subSatPoint.y, subSatPoint.z);
          const rotation = new THREE.Matrix4();
          rotation.lookAt(new THREE.Vector3(0, 0, 0), normal, new THREE.Vector3(0, 1, 0));
          coverages[satIdx].setRotationFromMatrix(rotation);
        }
      }

      // Update crosslinks
      if (showRelayLinks) {
        let linkIdx = 0;
        for (let i = 0; i < positions.length; i++) {
          const planeI = Math.floor(i / SATS_PER_PLANE);
          for (let j = i + 1; j < positions.length; j++) {
            const planeJ = Math.floor(j / SATS_PER_PLANE);
            const distance = calculateDistance(positions[i], positions[j]);
            
            const isIntraPlane = planeI === planeJ;
            const isAdjacentPlane = Math.abs(planeI - planeJ) === 1 || 
                                  Math.abs(planeI - planeJ) === NUM_PLANES - 1;
            
            if ((isIntraPlane || isAdjacentPlane) && distance <= MAX_CROSSLINK_DISTANCE) {
              crossLinks[linkIdx].geometry.setFromPoints([
                new THREE.Vector3(
                  positions[i].x / EARTH_RADIUS_KM,
                  positions[i].y / EARTH_RADIUS_KM,
                  positions[i].z / EARTH_RADIUS_KM
                ),
                new THREE.Vector3(
                  positions[j].x / EARTH_RADIUS_KM,
                  positions[j].y / EARTH_RADIUS_KM,
                  positions[j].z / EARTH_RADIUS_KM
                )
              ]);
              crossLinks[linkIdx].visible = true;
            } else {
              crossLinks[linkIdx].visible = false;
            }
            linkIdx++;
          }
        }
      } else {
        crossLinks.forEach(link => link.visible = false);
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    // Handle window resize
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount.removeChild(renderer.domElement);
      scene.clear();
    };
  }, [showRelayLinks]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <button
        onClick={() => setShowRelayLinks(!showRelayLinks)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#00ff00',
          color: '#000',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          opacity: 0.8
        }}
      >
        {showRelayLinks ? 'Hide Relay Links' : 'Show Relay Links'}
      </button>
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
