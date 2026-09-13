import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function TwoFiveDView() {
  const mount = useRef(null);

  useEffect(() => {
    const root = mount.current;
    const host = document.querySelector('.two-five-card .grid-wrap');
    if (!root || !host) return;
    host.appendChild(root);

    let dead = false;
    let frameTimer = 0;
    let animationFrame = 0;
    let points = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a);
    const sceneRoot = new THREE.Group();
    scene.add(sceneRoot);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    camera.position.set(0, 6.5, 8.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x05080a, 1);
    Object.assign(renderer.domElement.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      display: 'block', pointerEvents: 'none', zIndex: '4'
    });
    root.appendChild(renderer.domElement);

    const axes = new THREE.AxesHelper(2.5);
    sceneRoot.add(axes);
    const ground = new THREE.GridHelper(12, 24, 0x31515c, 0x172a31);
    ground.position.y = -0.02;
    sceneRoot.add(ground);

    const rebuild = data => {
      const projection = data?.projection_25d;
      const gridData = projection?.range_grid;
      if (!Array.isArray(gridData)) return;

      const rings = Number(projection.rings || gridData.length || 16);
      const bins = Number(projection.azimuth_bins || gridData[0]?.length || 72);
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
        const elevation = ((cell.r + 0.5) / rings) * 180 - 90;
        const elevationRad = THREE.MathUtils.degToRad(elevation);
        const horizontal = cell.value * Math.cos(elevationRad);
        const k = i * 3;
        positions[k] = Math.sin(azimuth) * horizontal;
        positions[k + 1] = cell.value * Math.sin(elevationRad);
        positions[k + 2] = Math.cos(azimuth) * horizontal;

        const t = (cell.value - minRange) / span;
        colors[k] = 0.20 + 0.65 * t;
        colors[k + 1] = 0.85 - 0.55 * t;
        colors[k + 2] = 1.0 - 0.65 * t;
      });

      if (points) {
        sceneRoot.remove(points);
        points.geometry.dispose();
        points.material.dispose();
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.075, vertexColors: true, transparent: true,
        opacity: 0.95, sizeAttenuation: true
      });
      points = new THREE.Points(geometry, material);
      sceneRoot.add(points);
    };

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const load = () => fetch(`${API}/api/frame`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!dead) rebuild(data); })
      .catch(() => {});
    const poll = () => {
      if (dead) return;
      load();
      frameTimer = window.setTimeout(poll, 250);
    };
    const loop = () => {
      if (dead) return;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(loop);
    };

    load();
    poll();
    loop();

    return () => {
      dead = true;
      clearTimeout(frameTimer);
      cancelAnimationFrame(animationFrame);
      ro.disconnect();
      if (points) {
        points.geometry.dispose();
        points.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
      root.remove();
    };
  }, []);

  return <div ref={mount} className="two-five-gpu-space" aria-label="Realtime 2.5D LiDAR space" />;
}
