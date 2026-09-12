import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './viewer.css';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function Viewer() {
  const mountRef = useRef(null);
  const stateRef = useRef({ heading: 32, pitch: -28, zoom: 1, panX: 0, panY: 0, syncing: true });
  const viewsRef = useRef({ three: null, two: null, grid: null });
  const [syncing, setSyncing] = useState(true);
  const [heading, setHeading] = useState(32);

  useEffect(() => {
    const root = mountRef.current;
    if (!root) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050709');

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 1000);
    camera.position.set(5.2, 4.1, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(root.clientWidth, root.clientHeight, false);
    root.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.HemisphereLight(0x92a9b5, 0x101216, 2.1);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xbfd9ff, 2.7);
    key.position.set(4, 7, 5);
    scene.add(key);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 2.3, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x91a6b1, roughness: 0.38, metalness: 0.24 })
    );
    group.add(cube);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cube.geometry),
      new THREE.LineBasicMaterial({ color: 0x1de0ff, transparent: true, opacity: 0.82 })
    );
    group.add(edges);

    const axes = new THREE.AxesHelper(2.0);
    axes.material.transparent = true;
    axes.material.opacity = 0.3;
    group.add(axes);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.1, 0);

    const resize = () => {
      renderer.setSize(root.clientWidth, root.clientHeight, false);
      camera.aspect = root.clientWidth / Math.max(root.clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    const onControl = () => {
      const s = stateRef.current;
      const offset = camera.position.clone().sub(controls.target);
      const az = Math.atan2(offset.x, offset.z) * 180 / Math.PI;
      s.heading = (az + 360) % 360;
      s.pitch = clamp(Math.asin(clamp(offset.y / offset.length(), -1, 1)) * 180 / Math.PI, -89, 89);
      s.zoom = clamp(6.7 / offset.length(), 0.55, 1.8);
      s.panX = controls.target.x;
      s.panY = controls.target.z;
      setHeading(Math.round(s.heading));
    };
    controls.addEventListener('change', onControl);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    viewsRef.current.three = { camera, controls };

    return () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      ro.disconnect();
      renderer.dispose();
      root.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!stateRef.current.syncing) return;
      const grid = document.querySelector('.grid-surface');
      const two = document.querySelector('.polar-surface');
      if (grid) grid.style.transform = `translate(${stateRef.current.panX * 8}px, ${stateRef.current.panY * -8}px) rotate(${stateRef.current.heading}deg) scale(${stateRef.current.zoom})`;
      if (two) two.style.transform = `rotate(${stateRef.current.heading}deg) scale(${stateRef.current.zoom})`;
      requestAnimationFrame(sync);
    };
    const id = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleSync = () => {
    stateRef.current.syncing = !stateRef.current.syncing;
    setSyncing(stateRef.current.syncing);
  };

  const turn = (delta) => {
    const s = stateRef.current;
    s.heading = (s.heading + delta + 360) % 360;
    setHeading(Math.round(s.heading));
    const v = viewsRef.current.three;
    if (v) {
      const r = v.camera.position.clone().sub(v.controls.target);
      const rad = Math.atan2(r.x, r.z) - delta * Math.PI / 180;
      const rr = Math.sqrt(r.x*r.x + r.z*r.z);
      v.camera.position.x = v.controls.target.x + rr * Math.sin(rad);
      v.camera.position.z = v.controls.target.z + rr * Math.cos(rad);
      v.controls.update();
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Foveated LiDAR Mapping</h1>
          <p>3D model synchronization · Front-end reference view</p>
        </div>
        <div className="header-readout"><span className="dot" /> SCENARIO 01 <b>·</b> LIVE</div>
      </header>

      <section className="toolbar panel">
        <div className="pill">3 VIEWS</div>
        <div className="pill muted">360° / 16 RINGS</div>
        <div className="grow" />
        <button className={syncing ? 'btn active' : 'btn'} onClick={toggleSync}><span className="tiny-dot" /> {syncing ? 'SYNC ON' : 'SYNC OFF'}</button>
        <button className="btn" onClick={() => turn(-5)}>↶ 5°</button>
        <button className="btn" onClick={() => turn(5)}>5° ↷</button>
      </section>

      <section className="views">
        <article className="view-card">
          <div className="card-head"><span>3D</span><small>Perspective</small></div>
          <div className="three-stage" ref={mountRef} />
          <div className="corner axis">X&nbsp; <i>Y</i>&nbsp; Z</div>
          <div className="card-footer">Orbit · Pan · Zoom</div>
        </article>

        <article className="view-card">
          <div className="card-head"><span>2D</span><small>Top / polar projection</small></div>
          <div className="polar-wrap">
            <div className="polar-surface">
              {Array.from({length: 7}).map((_,i)=><div className="ring" key={i} style={{inset: `${13+i*6}%`}} />)}
              {Array.from({length: 8}).map((_,i)=><div className="ray" key={i} style={{transform:`rotate(${i*45}deg)`}} />)}
              <div className="center-dot" />
              <div className="heading-line" />
            </div>
            <div className="angle-readout">{heading.toString().padStart(3,'0')}°</div>
          </div>
          <div className="card-footer">Azimuth projection</div>
        </article>

        <article className="view-card">
          <div className="card-head"><span>2.5D</span><small>LiDAR grid / degrees</small></div>
          <div className="grid-wrap">
            <div className="grid-surface">
              <div className="grid-floor" />
              {Array.from({length: 9}).map((_,i)=><div className="scan-row" key={i} style={{top:`${10+i*10}%`}} />)}
              {Array.from({length: 11}).map((_,i)=><div className="scan-col" key={i} style={{left:`${5+i*9}%`}} />)}
              <div className="fov-ring ring-a"/><div className="fov-ring ring-b"/><div className="fov-ring ring-c"/>
              <div className="object" /><div className="ego" />
            </div>
            <div className="ruler">
              {[0,30,60,90,120,150,180,210,240,270,300,330,360].map(d=><span key={d} style={{transform:`rotate(${d}deg) translateY(-102px)`}}>{d}°</span>)}
              <div className="ruler-pointer" style={{transform:`rotate(${heading}deg)`}} />
            </div>
          </div>
          <div className="card-footer">Pan · Rotate · Measure 360°</div>
        </article>
      </section>

      <section className="analysis panel">
        <div><span className="section-kicker">FOV / ORIENTATION</span><strong>{heading}°</strong><small>linked heading</small></div>
        <div><span className="section-kicker">MODEL</span><strong>01 CUBE</strong><small>synthetic input</small></div>
        <div><span className="section-kicker">LINK</span><strong>{syncing ? '3-WAY SYNC' : 'MANUAL'}</strong><small>interaction state</small></div>
      </section>
    </main>
  );
}
