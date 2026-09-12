import React, { useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function degreeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b9e9f2';
  ctx.fillText(text, 90, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
}

function addRuler(scene) {
  const radius = 3.28;
  const group = new THREE.Group();
  const ringPoints = [];
  for (let i = 0; i <= 128; i += 1) {
    const a = (i / 128) * Math.PI * 2;
    ringPoints.push(new THREE.Vector3(-Math.sin(a) * radius, -1.485, Math.cos(a) * radius));
  }
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPoints),
    new THREE.LineBasicMaterial({ color: 0x477b88, transparent: true, opacity: 0.72 })
  ));

  for (let d = 0; d <= 360; d += 10) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const inner = radius - (major ? 0.26 : 0.15);
    const outer = radius + 0.13;
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-Math.sin(a) * inner, -1.48, Math.cos(a) * inner),
        new THREE.Vector3(-Math.sin(a) * outer, -1.48, Math.cos(a) * outer)
      ]),
      new THREE.LineBasicMaterial({ color: major ? 0x8fe9f5 : 0x456b75, transparent: true, opacity: major ? 0.9 : 0.6 })
    ));
    if (major) {
      const label = degreeLabel(`${d}°`);
      const r = radius + 0.58;
      label.position.set(-Math.sin(a) * r, -1.43, Math.cos(a) * r);
      if (d === 360) {
        label.position.x -= 0.3;
        label.position.z += 0.3;
      }
      label.scale.set(0.9, 0.34, 1);
      group.add(label);
    }
  }
  scene.add(group);
}

function buildRawCube(raw) {
  const vertices = raw?.vertices;
  if (!Array.isArray(vertices) || vertices.length !== 8) return null;

  const positions = new Float32Array(vertices.flat().map(Number));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    1, 5, 6, 1, 6, 2,
    0, 3, 7, 0, 7, 4
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

export default function SolidWireframe3D() {
  useEffect(() => {
    let dead = false;
    const timer = setInterval(() => {
      const root = document.querySelector('.three-stage');
      if (!root || root.dataset.solidWireframe === '1') return;
      root.dataset.solidWireframe = '1';
      clearInterval(timer);

      const oldCanvas = root.querySelector('canvas');
      if (oldCanvas) oldCanvas.style.display = 'none';
      root.style.position = 'relative';

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05080a);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 200);
      camera.position.set(0, 5.5, -7.5);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x05080a, 1);
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
      root.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xdff7ff, 0x162027, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 4);
      key.position.set(6, 10, 8);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x73dfff, 2.5);
      fill.position.set(-7, 5, -5);
      scene.add(fill);

      const floor = new THREE.GridHelper(18, 36, 0x31515c, 0x172a31);
      floor.position.y = -1.55;
      scene.add(floor);

      const baseGeometry = new THREE.CircleGeometry(2.8, 64);
      const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x0c171b, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.rotation.x = -Math.PI / 2;
      base.position.y = -1.54;
      scene.add(base);
      addRuler(scene);

      const cubeGroup = new THREE.Group();
      cubeGroup.position.y = -0.4;
      scene.add(cubeGroup);

      const solidMaterial = new THREE.MeshStandardMaterial({
        color: 0x7896a0,
        metalness: 0.12,
        roughness: 0.38,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide
      });
      const wireMaterial = new THREE.LineBasicMaterial({ color: 0x9bf5ff, transparent: true, opacity: 1 });
      const centroidMaterial = new THREE.MeshBasicMaterial({ color: 0x76ff91 });

      const renderRaw = (raw) => {
        const geometry = buildRawCube(raw);
        if (!geometry) return;
        while (cubeGroup.children.length) {
          const child = cubeGroup.children.pop();
          if (child.geometry) child.geometry.dispose();
          cubeGroup.remove(child);
        }

        const solid = new THREE.Mesh(geometry, solidMaterial);
        cubeGroup.add(solid);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wireMaterial);
        wire.scale.setScalar(1.002);
        cubeGroup.add(wire);

        const origin = Array.isArray(raw.origin) ? raw.origin.map(Number) : [0, 0, 0];
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), centroidMaterial);
        center.position.set(origin[0] || 0, origin[1] || 0, origin[2] || 0);
        cubeGroup.add(center);
      };

      const fallbackRaw = {
        origin: [0, 0, 0],
        vertices: [
          [-1.15, -1.15, -1.15], [1.15, -1.15, -1.15],
          [1.15, 1.15, -1.15], [-1.15, 1.15, -1.15],
          [-1.15, -1.15, 1.15], [1.15, -1.15, 1.15],
          [1.15, 1.15, 1.15], [-1.15, 1.15, 1.15]
        ]
      };
      renderRaw(fallbackRaw);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, -0.35, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.rotateSpeed = 0.9;
      controls.panSpeed = 1;
      controls.zoomSpeed = 1;
      controls.minDistance = 3;
      controls.maxDistance = 35;
      controls.minPolarAngle = 0.12;
      controls.maxPolarAngle = Math.PI - 0.12;
      controls.screenSpacePanning = true;
      controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

      const resize = () => {
        const w = Math.max(1, root.clientWidth);
        const h = Math.max(1, root.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(root);
      resize();
      controls.update();
      controls.saveState();

      const resetButton = root.parentElement?.querySelector('.three-tools button');
      const reset = () => { controls.reset(); controls.update(); };
      resetButton?.addEventListener('click', reset);

      fetch(`${API}/api/frame`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (dead || !d?.input) return;
          renderRaw(d.input);
        })
        .catch(() => {});

      let af = 0;
      const loop = () => {
        if (dead) return;
        controls.update();
        renderer.render(scene, camera);
        af = requestAnimationFrame(loop);
      };
      loop();

      return () => {};
    }, 30);

    return () => {
      dead = true;
      clearInterval(timer);
    };
  }, []);

  return null;
}
