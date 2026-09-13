import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function TwoFiveDView() {
  const mount = useRef(null);

  useEffect(() => {
    const root = mount.current;
    if (!root) return;

    let dead = false;
    let frameTimer = 0;
    let scene;
    let camera;
    let renderer;
    let points;
    let grid;
    let animationFrame = 0;

    const sceneRoot = new THREE.Group();

    const rebuild = data => {
      if (!data?.projection_25d?.range_grid) return;
      const gridData = data.projection_25d.range_grid;
      const rings = Number(data.projection_25d.rings || gridData.length || 16);
      const bins = Number(data.projection_25d.azimuth_bins || gridData[0]?.length || 72);
      const values = [];

      for (let r = 0; r < rings; r += 1) {
        for (let b = 0; b < bins; b += 1) {
          const value = Number(gridData[r]?.[b]);
          if (Number.isFinite(value)) values.push({ r, b, value });
        }
      }
      if (!values.length) return;

      const minRange = Math.min(...values.map(v => v.value));
      const maxRange = Math.max(...values.map(v => v.value));
      const span = Math.max(0.001, maxRange - minRange);
      const positions = new Float32Array(values.length * 3);
      const colors = new Float32Array(values.length * 3);

      values.forEach((cell, i) => {
        const azimuth = (cell.b / bins) * Math.PI * 2;
        const range = cell.value;
        const elevation = ((cell.r + 0.5) / rings) * 180 - 90;
        const elevationRad = THREE.MathUtils.degToRad(elevation);
        const horizontal = range * Math.cos(elevationRad);
        const x = Math.sin(azimuth) * horizontal;
        const z = Math.cos(azimuth) * horizontal;
        const y = range * Math.sin(elevationRad);
        const k = i * 3;
        positions[k] = x;
        positions[k + 1] = y;
        positions[k + 2] = z;

        const t = (cell.value - minRange) / span;
        colors[k] = 0.20 + 0.65 * t;
        colors[k + 1] = 0.85 - 0.55 * t;
        colors[k + 2] = 1.0 - 0.65 * t;
      });

      if (points) {
        points.geometry.dispose();
        points.material.dispose();
        sceneRoot.remove(points);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.075,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
      });
      points = new THREE.Points(geometry, material);
      sceneRoot.add(points);
    };

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a);
    camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    camera.position.set(0, 6.5, 8.5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x05080a, 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.pointerEvents = 'none';
    root.appendChild(renderer.domElement);

    const axes = new THREE.AxesHelper(2.5);
    sceneRoot.add(axes);

    grid = new THREE.GridHelper(12, 24, 0x31515c, 0x172a31);
    grid.position.y = -0.02;
    sceneRoot.add(grid);
    scene.add(sceneRoot);

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

    const load = () => {
      fetch(`${API}/api/frame`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!dead) rebuild(data);
        })
        .catch(() => {});
    };

    const loop = () => {
      if (dead) return;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(loop);
    };

    const poll = () => {
      if (dead) return;
      load();
      frameTimer = window.setTimeout(poll, 250);
    };

    load();
    loop();
    poll();

    return () => {
      dead = true;
      cancelAnimationFrame(animationFrame);
      clearTimeout(frameTimer);
      ro.disconnect();
      if (points) {
        points.geometry.dispose();
        points.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mount} className="two-five-gpu-space" aria-label="Realtime 2.5D LiDAR space" />;
}
