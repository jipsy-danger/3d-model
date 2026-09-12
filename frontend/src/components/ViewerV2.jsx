import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './viewer.css';
import './viewer-v2.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const norm = (a) => ((a % 360) + 360) % 360;
const degToRad = (d) => (d * Math.PI) / 180;

function OneDView({ heading }) {
  const [mode, setMode] = useState('points');
  const points = Array.from({ length: 45 }, (_, i) => ({ x: 5 + i * 2.05, y: 50 - Math.abs(Math.sin(i * 0.7)) * 7 - (i % 9 === 0 ? (i % 17) * 1.2 : 0) }));
  return <article className="view-card one-d-card"><div className="card-head"><span>1D</span><small>X-axis projection · point + line · 3D linked</small><span className="angle-readout">{String(Math.round(heading)).padStart(3, '0')}°</span></div><div className="one-d-space"><div className="one-d-plot-grid"/><div className="one-d-axis"/><div className="one-d-zero"/>{mode === 'points' && points.map((p, i) => <i key={i} className="one-d-cloud-dot" style={{ left: `${p.x}%`, top: `${p.y}%` }}/>) }{mode === 'line' && <div className="one-d-line-profile"/>}<span className="one-d-label x-label">X (meters)</span><span className="one-d-label y1-label">Intensity / Height</span></div><div className="one-d-controls"><button className={mode === 'points' ? 'selected' : ''} onClick={() => setMode('points')}>✦ POINTS</button><button className={mode === 'line' ? 'selected' : ''} onClick={() => setMode('line')}>⌁ LINE</button><span className="auto-toggle"><b/> AUTO SCALE</span><span className="grow"/><span className="axis-select">X-AXIS</span></div></article>;
}

function TwoDView({ heading }) {
  const [shape, setShape] = useState('points');
  const rulerDegrees = Array.from({ length: 36 }, (_, i) => i * 10);
  const majorDegrees = Array.from({ length: 12 }, (_, i) => i * 30);
  return <article className="view-card two-d-card"><div className="card-head"><span>2D</span><small>X/Y plane · rectangle · square · circle · 360°</small><span className="angle-readout">{String(Math.round(heading)).padStart(3, '0')}°</span></div><div className="two-d-space"><div className="two-d-grid-lines"/><div className="two-d-azimuth-ruler"><div className="two-d-ruler-ring">{rulerDegrees.map((degree) => { const a = degToRad(degree); const x = 50 + Math.sin(a) * 50; const y = 50 - Math.cos(a) * 50; return <span key={`tick-${degree}`} className={`two-d-ruler-tick ${degree % 30 === 0 ? 'major' : ''}`} style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${degree}deg)` }}/>; })}{majorDegrees.map((degree) => { const a = degToRad(degree); const x = 50 + Math.sin(a) * 56; const y = 50 - Math.cos(a) * 56; return <span key={`label-${degree}`} className="two-d-ruler-label" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>{degree}°</span>; })}<span className="two-d-ruler-label two-d-ruler-360">360°</span></div></div><div className="two-d-center"/>{shape === 'points' && Array.from({ length: 60 }, (_, i) => <i key={i} className="two-d-cloud-point" style={{ left: `${50 + Math.sin(i * 0.57) * 34}%`, top: `${50 + Math.cos(i * 0.43) * 25}%` }}/>) }{shape === 'rect' && <div className="shape-rect"/>}{shape === 'square' && <div className="shape-square"/>}{shape === 'circle' && <div className="shape-circle"/>}<div className="two-d-heading" style={{ transform: `translate(-50%, -100%) rotate(${heading}deg)` }}/><span className="two-d-x-label">X</span><span className="two-d-y-label">Y</span></div><div className="two-d-controls"><button className={shape === 'points' ? 'selected' : ''} onClick={() => setShape('points')}>✦ POINTS</button><button className={shape === 'rect' ? 'selected' : ''} onClick={() => setShape('rect')}>RECT</button><button className={shape === 'square' ? 'selected' : ''} onClick={() => setShape('square')}>SQUARE</button><button className={shape === 'circle' ? 'selected' : ''} onClick={() => setShape('circle')}>CIRCLE</button><span className="grow"/><span className="auto-toggle"><b/> GRID</span></div></article>;
}

function TwoFiveDView({ heading }) {
  const grid = useRef(null);
  useEffect(() => { if (grid.current) grid.current.style.transform = `rotate(${heading}deg)`; }, [heading]);
  return <article className="view-card two-five-card"><div className="card-head"><span>2.5D</span><small>Reserved · backend range grid · 360° ruler</small></div><div className="grid-wrap"><div className="grid-surface" ref={grid}><div className="grid-floor"/>{Array.from({ length: 9 }, (_, i) => <div className="scan-row" key={`r${i}`} style={{ top: `${10 + i * 10}%` }}/>) }{Array.from({ length: 11 }, (_, i) => <div className="scan-col" key={`c${i}`} style={{ left: `${5 + i * 9}%` }}/>) }<div className="fov-ring ring-a"/><div className="fov-ring ring-b"/><div className="fov-ring ring-c"/><div className="object"/><div className="ego"/></div><div className="ruler">{[0,30,60,90,120,150,180,210,240,270,300,330,360].map((d) => <span key={d} style={{ '--pos': `${d / 3.6}` }}>{d}°</span>)}<div className="ruler-pointer" style={{ '--pointer': `${heading / 3.6}%` }}/></div></div><div className="two-five-controls"><span>PAN · ROTATE · MEASURE</span><span className="grow"/><span>2.5D NEXT STAGE</span></div></article>;
}

function makeDegreeSprite(text) {
  const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 84;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 220, 84); ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#b9e9f2'; ctx.fillText(text, 110, 42);
  const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate = true; texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })); sprite.scale.set(1.05, .4, 1); return sprite;
}

function add3DRuler(scene, floorY) {
  const radius = 3.28; const group = new THREE.Group(); const pts = [];
  for (let i = 0; i <= 128; i += 1) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(-Math.sin(a) * radius, floorY + .015, Math.cos(a) * radius)); }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x477b88, transparent: true, opacity: .72 })));
  for (let d = 0; d <= 360; d += 10) {
    const a = degToRad(d), major = d % 30 === 0, inner = radius - (major ? .26 : .15), outer = radius + .13;
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-Math.sin(a) * inner, floorY + .02, Math.cos(a) * inner), new THREE.Vector3(-Math.sin(a) * outer, floorY + .02, Math.cos(a) * outer)]), new THREE.LineBasicMaterial({ color: major ? 0x8fe9f5 : 0x456b75, transparent: true, opacity: major ? .9 : .6 })));
    if (major) { const s = makeDegreeSprite(`${d}°`), r = radius + .58; s.position.set(-Math.sin(a) * r, floorY + .07, Math.cos(a) * r); if (d === 360) { s.position.x -= .3; s.position.z += .3; } group.add(s); }
  }
  scene.add(group);
}

function buildRawCube(raw) {
  const vertices = raw?.vertices;
  if (!Array.isArray(vertices) || vertices.length !== 8) return null;
  const positions = new Float32Array(vertices.flat().map(Number));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4]);
  geometry.computeVertexNormals();
  return geometry;
}

function ThreeView({ onHeading, resetRef, rotateRef }) {
  const mount = useRef(null); const headingCallback = useRef(onHeading); headingCallback.current = onHeading;
  useEffect(() => {
    const root = mount.current; if (!root) return undefined; let dead = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05080a);
    const camera = new THREE.PerspectiveCamera(48, 1, .05, 200);
    const defaultPosition = new THREE.Vector3(0, 5.5, -7.5); const defaultTarget = new THREE.Vector3(0, 0, 0); camera.position.copy(defaultPosition);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x05080a, 1); renderer.domElement.style.display = 'block'; renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.touchAction = 'none'; root.appendChild(renderer.domElement);
    const floorY = -1.15;
    const floor = new THREE.GridHelper(18, 36, 0x31515c, 0x172a31); floor.position.y = floorY; scene.add(floor);
    const axes = new THREE.AxesHelper(3.5); axes.position.set(-4, floorY, -4); scene.add(axes);
    const base = new THREE.Mesh(new THREE.CircleGeometry(2.8, 64), new THREE.MeshBasicMaterial({ color: 0x0c171b, transparent: true, opacity: .75, side: THREE.DoubleSide })); base.rotation.x = -Math.PI / 2; base.position.y = floorY + .002; scene.add(base); add3DRuler(scene, floorY);

    const solidMaterial = new THREE.MeshBasicMaterial({ color: 0x788f98, side: THREE.DoubleSide, transparent: false, opacity: 1 });
    const wireMaterial = new THREE.LineBasicMaterial({ color: 0x9bf5ff, transparent: true, opacity: 1 });
    const centroidMaterial = new THREE.MeshBasicMaterial({ color: 0x76ff91, depthTest: false, depthWrite: false });
    const centroidAxisMaterial = new THREE.LineBasicMaterial({ color: 0x76ff91, transparent: true, opacity: .8, depthTest: false, depthWrite: false });
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0x76ff91, transparent: true, opacity: .72, depthTest: false, depthWrite: false });
    let solid = null; let wire = null; let centroid = null; let centroidAxis = null; let xAxis = null;
    const renderRaw = (raw, centroidPoint) => {
      const geometry = buildRawCube(raw); if (!geometry) return;
      if (solid) { scene.remove(solid); solid.geometry.dispose(); }
      if (wire) { scene.remove(wire); wire.geometry.dispose(); }
      if (centroid) { scene.remove(centroid); centroid.geometry.dispose(); }
      if (centroidAxis) { scene.remove(centroidAxis); centroidAxis.geometry.dispose(); }
      if (xAxis) { scene.remove(xAxis); xAxis.geometry.dispose(); }
      solid = new THREE.Mesh(geometry, solidMaterial); solid.position.set(0, 0, 0); scene.add(solid);
      wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wireMaterial); wire.position.set(0, 0, 0); wire.scale.setScalar(1.001); scene.add(wire);
      const point = Array.isArray(centroidPoint) ? centroidPoint.map(Number) : [0,0,0];
      const cx = point[0] || 0, cy = point[1] || 0, cz = point[2] || 0;
      xAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-100, cy, cz),
        new THREE.Vector3(100, cy, cz),
      ]), xAxisMaterial);
      xAxis.renderOrder = 998;
      scene.add(xAxis);
      centroidAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx, -1.2, cz),
        new THREE.Vector3(cx, 1.2, cz),
      ]), centroidAxisMaterial);
      centroidAxis.renderOrder = 999;
      scene.add(centroidAxis);
      centroid = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 24), centroidMaterial); centroid.position.set(cx, cy, cz); centroid.renderOrder = 1000; scene.add(centroid);
    };

    const controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(defaultTarget); controls.enableDamping = true; controls.dampingFactor = .075; controls.enableRotate = true; controls.enablePan = true; controls.enableZoom = true; controls.rotateSpeed = .9; controls.panSpeed = 1; controls.zoomSpeed = 1; controls.minDistance = 3; controls.maxDistance = 35; controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI - .12; controls.screenSpacePanning = true; controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    const onContextMenu = (event) => event.preventDefault(); renderer.domElement.addEventListener('contextmenu', onContextMenu);
    const resize = () => { const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }; const ro = new ResizeObserver(resize); ro.observe(root); resize();
    const changed = () => { const offset = camera.position.clone().sub(controls.target); const horizontal = Math.hypot(offset.x, offset.z); if (horizontal > .0001) headingCallback.current(norm(Math.atan2(offset.x, offset.z) * 180 / Math.PI)); };
    controls.addEventListener('change', changed); controls.update(); controls.saveState(); changed();
    const reset3D = () => { controls.reset(); controls.update(); changed(); };
    const rotate3D = (amount) => { const offset = camera.position.clone().sub(controls.target); const angle = degToRad(amount); const x = offset.x * Math.cos(angle) + offset.z * Math.sin(angle); const z = -offset.x * Math.sin(angle) + offset.z * Math.cos(angle); camera.position.set(controls.target.x + x, camera.position.y, controls.target.z + z); controls.update(); changed(); };
    if (resetRef) resetRef.current = reset3D; if (rotateRef) rotateRef.current = rotate3D;
    let af = 0; const loop = () => { if (dead) return; controls.update(); renderer.render(scene, camera); af = requestAnimationFrame(loop); }; loop();
    fetch(`${API}/api/frame`).then(r => r.ok ? r.json() : null).then(d => { if (dead || !d?.input?.vertices) return; renderRaw(d.input, d.centroid); }).catch(() => {});
    return () => { dead = true; cancelAnimationFrame(af); ro.disconnect(); controls.removeEventListener('change', changed); renderer.domElement.removeEventListener('contextmenu', onContextMenu); controls.dispose(); if (solid) solid.geometry.dispose(); if (wire) wire.geometry.dispose(); if (centroid) centroid.geometry.dispose(); if (centroidAxis) centroidAxis.geometry.dispose(); if (xAxis) xAxis.geometry.dispose(); solidMaterial.dispose(); wireMaterial.dispose(); centroidMaterial.dispose(); centroidAxisMaterial.dispose(); xAxisMaterial.dispose(); base.geometry.dispose(); base.material.dispose(); renderer.dispose(); if (resetRef && resetRef.current === reset3D) resetRef.current = null; if (rotateRef && rotateRef.current === rotate3D) rotateRef.current = null; root.innerHTML = ''; };
  }, []);
  return <article className="view-card three-card"><div className="card-head"><span>3D</span><small>Backend raw cuboid · centroid · Y center · full X-axis · orbit · pan · zoom</small></div><div className="three-stage" ref={mount}/><div className="three-tools"><span>LEFT DRAG · ORBIT</span><span>RIGHT DRAG · PAN</span><span>MIDDLE / WHEEL · ZOOM</span><button type="button" onClick={() => resetRef.current?.()}>RESET · 180°</button></div></article>;
}

export default function ViewerV2() {
  const [heading, setHeading] = useState(180); const [sync, setSync] = useState(true); const socket = useRef(null); const threeResetRef = useRef(null); const threeRotateRef = useRef(null);
  const publish = (nextHeading = heading) => { if (!sync || socket.current?.readyState !== WebSocket.OPEN) return; socket.current.send(JSON.stringify({ type:'view_state', heading:norm(nextHeading) })); };
  useEffect(() => { const wsUrl = API.replace(/^http/, 'ws') + '/ws/view'; const ws = new WebSocket(wsUrl); socket.current = ws; ws.onmessage = (event) => { try { const m = JSON.parse(event.data); if (typeof m.heading === 'number') setHeading(norm(m.heading)); } catch {} }; return () => { ws.close(); socket.current = null; }; }, []);
  const handleHeading = (value) => { const h = norm(value); setHeading(h); if (sync) publish(h); };
  const rotateBy = (amount) => { if (threeRotateRef.current) threeRotateRef.current(amount); else handleHeading(heading + amount); };
  const resetAll = () => { if (threeResetRef.current) threeResetRef.current(); else handleHeading(180); };
  return <main className="app-shell"><header className="hero"><div><h1>Foveated LiDAR Mapping</h1><p>3D model · 1D profile · 2D projection · 2.5D range map</p></div><div className="hero-meta"><b>● 3D RESET · 180° DEFAULT</b><small>0° TOP · 90° RIGHT · 180° BOTTOM · 270° LEFT</small></div></header><section className="toolbar"><span className="badge">4 SPACES</span><span className="badge">3D → 1D → 2D → 2.5D</span><span className="grow"/><button className="sync-button" type="button" onClick={() => setSync(v => !v)}>• SYNC {sync ? 'ON' : 'OFF'}</button><button type="button" onClick={() => rotateBy(-5)}>↶ 5°</button><button type="button" onClick={() => rotateBy(5)}>5° ↷</button><button type="button" onClick={resetAll}>RESET · 180°</button></section><section className="view-grid"><ThreeView onHeading={handleHeading} resetRef={threeResetRef} rotateRef={threeRotateRef}/><OneDView heading={heading}/><TwoDView heading={heading}/><TwoFiveDView heading={heading}/></section><section className="analysis panel"><div><span className="section-kicker">FOV / ORIENTATION</span><strong>{Math.round(heading)}°</strong><small>linked heading</small></div><div><span className="section-kicker">INPUT</span><strong>RAW CUBOID</strong><small>backend/data/raw/cube.json</small></div><div><span className="section-kicker">CENTROID</span><strong>BACKEND COMPUTED</strong><small>geometric center of raw vertices · Y = 0</small></div></section></main>;
}
