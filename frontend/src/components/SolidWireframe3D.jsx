import React, { useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

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

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05080a);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 200);
      camera.position.set(0, 5.5, -7.5);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x05080a, 1);
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
      root.style.position = 'relative';
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

      const base = new THREE.Mesh(
        new THREE.CircleGeometry(2.8, 64),
        new THREE.MeshBasicMaterial({ color: 0x0c171b, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
      );
      base.rotation.x = -Math.PI / 2;
      base.position.y = -1.54;
      scene.add(base);

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

      const build = (size = 2.3) => {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const solid = new THREE.Mesh(geometry, solidMaterial);
        cubeGroup.add(solid);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wireMaterial);
        wire.scale.setScalar(1.002);
        cubeGroup.add(wire);
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), centroidMaterial);
        cubeGroup.add(center);
        return { geometry, solid, wire, center };
      };

      let cube = build(2.3);

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

      fetch(`${API}/api/frame`).then(r => r.ok ? r.json() : null).then(d => {
        if (dead || !d) return;
        const size = Number(d?.input?.size_m || 2.3);
        if (!Number.isFinite(size) || size <= 0) return;
        cube.geometry.dispose();
        cube.solid.geometry = new THREE.BoxGeometry(size, size, size);
        cube.wire.geometry.dispose();
        cube.wire.geometry = new THREE.EdgesGeometry(cube.solid.geometry);
      }).catch(() => {});

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
