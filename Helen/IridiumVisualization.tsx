import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const EARTH_RADIUS_KM = 6371;
const IRIDIUM_ALTITUDE_KM = 780;
const ORBITAL_PERIOD_MIN = 100.4; // Approximate period
const NUM_PLANES = 6;
const SATS_PER_PLANE = 11;
const INCLINATION_DEG = 86.4;
const COVERAGE_RADIUS = 2700; // km (for seamless Iridium coverage)
const INTER_SATELLITE_DISTANCE = 4000; // km (maximum distance for inter-satellite links)

function calculateSatellitePosition(
  planeIndex: number,
  satIndex: number,
  timeMinutes: number
): { x: number; y: number; z: number } {
  const meanMotion = (2 * Math.PI) / ORBITAL_PERIOD_MIN; // radians per minute
  const phaseOffset = (2 * Math.PI * satIndex) / SATS_PER_PLANE;
  const raan = (2 * Math.PI * planeIndex) / NUM_PLANES;
  const inclination = (INCLINATION_DEG * Math.PI) / 180;

  const meanAnomaly = meanMotion * timeMinutes + phaseOffset;

  // Position in orbital plane
  const xOrbital = Math.cos(meanAnomaly);
  const yOrbital = Math.sin(meanAnomaly);
  const zOrbital = 0;

  // Rotate by inclination
  const xInclined = xOrbital;
  const yInclined = yOrbital * Math.cos(inclination);
  const zInclined = yOrbital * Math.sin(inclination);

  // Rotate by RAAN
  const x = xInclined * Math.cos(raan) - yInclined * Math.sin(raan);
  const y = xInclined * Math.sin(raan) + yInclined * Math.cos(raan);
  const z = zInclined;

  // Scale to orbital radius
  const orbitalRadius = EARTH_RADIUS_KM + IRIDIUM_ALTITUDE_KM;
  return {
    x: x * orbitalRadius,
    y: y * orbitalRadius,
    z: z * orbitalRadius,
  };
}

// Add new function to calculate distance between satellites
function calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

interface IridiumVisualizationProps {
  altitude: number;
  inclination: number;
  isRelayMode: boolean;
}

const IridiumVisualization: React.FC<IridiumVisualizationProps> = ({ altitude, inclination, isRelayMode }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Load Earth texture
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    const earthBumpMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
    const earthSpecularMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');

    // Add Earth
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: earthBumpMap,
      bumpScale: 0.05,
      specularMap: earthSpecularMap,
      specular: new THREE.Color(0x333333),
      shininess: 5
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Satellite and coverage geometry/material
    const satelliteGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const satelliteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const coverageMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });

    // Create satellite and coverage meshes
    const satellites: THREE.Mesh[] = [];
    const coverages: THREE.Mesh[] = [];
    const interSatelliteLinks: THREE.Line[] = [];
    
    // Create line material for inter-satellite links
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3
    });

    for (let i = 0; i < NUM_PLANES * SATS_PER_PLANE; i++) {
      const sat = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      scene.add(sat);
      satellites.push(sat);
      
      const cov = new THREE.Mesh(new THREE.CircleGeometry(COVERAGE_RADIUS / EARTH_RADIUS_KM, 64), coverageMaterial);
      scene.add(cov);
      coverages.push(cov);
    }

    // Create inter-satellite links
    for (let i = 0; i < satellites.length; i++) {
      for (let j = i + 1; j < satellites.length; j++) {
        const lineGeometry = new THREE.BufferGeometry();
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        interSatelliteLinks.push(line);
      }
    }

    // Camera position
    camera.position.z = 3;

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Animation
    const animate = () => {
      // Calculate time in minutes since epoch
      const now = new Date();
      const tMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
      
      // Update satellite positions
      const positions: { x: number; y: number; z: number }[] = [];
      for (let plane = 0; plane < NUM_PLANES; plane++) {
        for (let sat = 0; sat < SATS_PER_PLANE; sat++) {
          const satIdx = plane * SATS_PER_PLANE + sat;
          const pos = calculateSatellitePosition(plane, sat, tMinutes);
          positions.push(pos);
          
          // Normalize to Earth radii for rendering
          satellites[satIdx].position.set(pos.x / EARTH_RADIUS_KM, pos.y / EARTH_RADIUS_KM, pos.z / EARTH_RADIUS_KM);
          
          // Calculate sub-satellite point (unit sphere)
          const mag = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
          const subX = pos.x / mag;
          const subY = pos.y / mag;
          const subZ = pos.z / mag;
          coverages[satIdx].position.set(subX, subY, subZ);
          coverages[satIdx].lookAt(0, 0, 0);
        }
      }

      // Update inter-satellite links
      let linkIndex = 0;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const distance = calculateDistance(positions[i], positions[j]);
          if (distance <= INTER_SATELLITE_DISTANCE) {
            const line = interSatelliteLinks[linkIndex];
            const points = [
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
            ];
            line.geometry.setFromPoints(points);
            line.visible = true;
          } else {
            interSatelliteLinks[linkIndex].visible = false;
          }
          linkIndex++;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      scene.clear();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div 
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000
        }}
      >
        {currentTime}
      </div>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default IridiumVisualization; 
