import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './viewer.css';
import './viewer-v2.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const norm = (a) => ((a % 360) + 360) % 360;
const degToRad = (d) => (d * Math.PI) / 180;

function OneDView({ heading }) {
  const mount = useRef(null);
  const dataRef = useRef(null);
  const viewRef = useRef({ center: 0, scale: 70 });
  const dragRef = useRef(null);
  const [mode] = useState('points');
  const [axis, setAxis] = useState('x');
  const [, redraw] = useState(0);

  useEffect(() => {
    let dead = false;
    fetch(`${API}/api/frame`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!dead && d?.points?.length) {
          dataRef.current = d;
          redraw((v) => v + 1);
        }
      })
      .catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    const root = mount.current;
    if (!root) return undefined;
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      dragRef.current = { x: e.clientX, center: viewRef.current.center };
      root.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!dragRef.current) return;
      const width = Math.max(1, root.clientWidth);
      viewRef.current.center = dragRef.current.center - (e.clientX - dragRef.current.x) / width * (10 / viewRef.current.scale * 70);
      redraw((v) => v + 1);
    };
    const onPointerUp = () => { dragRef.current = null; };
    const onWheel = (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      viewRef.current.scale = Math.min(500, Math.max(20, viewRef.current.scale * factor));
      redraw((v) => v + 1);
    };
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => { viewRef.current.center = 0; redraw((v) => v + 1); }, [axis]);

  const points = dataRef.current?.points || [];
  const projected = points.map((p) => {
    const x = Number(p[0] || 0), y = Number(p[1] || 0), z = Number(p[2] || 0);
    if (axis === 'y') return y;
    const a = degToRad(norm(heading));
    return x * Math.cos(a) + z * Math.sin(a);
  });
  const min = projected.length ? Math.min(...projected) : -3;
  const max = projected.length ? Math.max(...projected) : 3;
  const span = Math.max(0.001, max - min);
  const scale = viewRef.current.scale;
  const center = viewRef.current.center;
  const toPercent = (value) => 50 + (value - center) * scale;
  const tickStep = axis === 'y' ? 0.5 : 1;
  const ticks = [];
  const start = Math.floor((center - 50 / scale) / tickStep) * tickStep;
  const end = center + 50 / scale;
  for (let v = start; v <= end + tickStep; v += tickStep) ticks.push(Number(v.toFixed(3)));

  const axisLabel = axis.toUpperCase();
  const projectionLabel = axis === 'x' ? `X′ = X cos(${Math.round(heading)}°) + Z sin(${Math.round(heading)}°)` : 'Y′ = Y';

  return <article className="view-card one-d-card">
    <div className="card-head"><span>1D</span><small>ONE-DIMENSIONAL SPATIAL PROJECTION · {axisLabel}-AXIS</small><span className="angle-readout">{String(Math.round(heading)).padStart(3, '0')}°</span></div>
    <div className="one-d-space one-d-interactive" ref={mount}>
      <div className="one-d-space-grid"/>
      <div className={`one-d-axis-line axis-${axis}`}/>
      <div className={`one-d-ticks axis-${axis}`}>
        {ticks.map((v) => <span key={v} style={axis === 'x' ? { left: `${toPercent(v)}%` } : { top: `${100 - toPercent(v)}%` }}>{v}</span>)}
      </div>
      {projected.map((v, i) => axis === 'x'
        ? <i key={i} className="one-d-cloud-dot" style={{ left: `${toPercent(v)}%`, top: '50%' }}/>
        : <i key={i} className="one-d-cloud-dot" style={{ left: '50%', top: `${100 - toPercent(v)}%` }}/>
      )}
      <span className="one-d-sync-indicator">● 3D SYNC · {Math.round(heading)}°</span>
      <span className="one-d-space-axis-label">1D SPACE · {axisLabel} · PAN + ZOOM · {projectionLabel}</span>
      {!points.length && <span className="one-d-viewport-hint">LOADING BACKEND POINTS…</span>}
      <span className="one-d-viewport-hint" style={{ bottom: 27 }}>{span.toFixed(2)} m SOURCE SPAN</span>
    </div>
    <div className="one-d-controls">
      <span className="one-d-input-label">INPUT · BACKEND POINT CLOUD</span>
      <span className="grow"/>
      <span className="one-d-axis-toggle-label">AXIS</span>
      <button className={axis === 'x' ? 'selected axis-option' : 'axis-option'} type="button" onClick={() => setAxis('x')}>X-AXIS</button>
      <button className={axis === 'y' ? 'selected axis-option' : 'axis-option'} type="button" onClick={() => setAxis('y')}>Y-AXIS</button>
    </div>
  </article>;
}

function makeDegreeSprite(text) {
  const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 84;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 220, 84); ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#b9e9f2'; ctx.fillText(text, 110, 42);
  const texture = new THREE.CanvasTexture(canvas); texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })); sprite.scale.set(1.05, .4, 1); return sprite;
}

function add3DRuler(scene, floorY) {
  const radius = 3.28; const group = new THREE.Group(); const pts = [];
  for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(-Math.sin(a) * radius, floorY + .015, Math.cos(a) * radius)); }
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices.flat().map(Number)), 3));
  geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4]);
  geometry.computeVertexNormals();
  return geometry;
}

function ThreeView({ onHeading, resetRef, rotateRef }) {
  const mount = useRef(null); const headingCallback = useRef(onHeading); headingCallback.current = onHeading;
  useEffect(() => {
    const root = mount.current; if (!root) return undefined; let dead = false;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05080a);
    const camera = new THREE.PerspectiveCamera(48, 1, .05, 200); const defaultPosition = new THREE.Vector3(0, 5.5, -7.5); const defaultTarget = new THREE.Vector3(0, 0, 0); camera.position.copy(defaultPosition);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x05080a, 1); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none'; root.appendChild(renderer.domElement);
    const floorY = -1.15; const floor = new THREE.GridHelper(18, 36, 0x31515c, 0x172a31); floor.position.y = floorY; scene.add(floor); const axes = new THREE.AxesHelper(3.5); axes.position.set(-4, floorY, -4); scene.add(axes);
    const base = new THREE.Mesh(new THREE.CircleGeometry(2.8, 64), new THREE.MeshBasicMaterial({ color: 0x0c171b, transparent: true, opacity: .75, side: THREE.DoubleSide })); base.rotation.x = -Math.PI / 2; base.position.y = floorY + .002; scene.add(base); add3DRuler(scene, floorY);
    const solidMaterial = new THREE.MeshBasicMaterial({ color: 0x788f98, side: THREE.DoubleSide }); const wireMaterial = new THREE.LineBasicMaterial({ color: 0x9bf5ff }); const centroidMaterial = new THREE.MeshBasicMaterial({ color: 0x76ff91, depthTest: false, depthWrite: false }); const axisMaterial = new THREE.LineBasicMaterial({ color: 0x76ff91, transparent: true, opacity: .8, depthTest: false, depthWrite: false });
    let solid = null, wire = null, centroid = null, xAxis = null;
    const renderRaw = (raw, centroidPoint) => { const geometry = buildRawCube(raw); if (!geometry) return; solid = new THREE.Mesh(geometry, solidMaterial); scene.add(solid); wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wireMaterial); wire.scale.setScalar(1.001); scene.add(wire); const p = Array.isArray(centroidPoint) ? centroidPoint.map(Number) : [0,0,0]; xAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-100,p[1]||0,p[2]||0),new THREE.Vector3(100,p[1]||0,p[2]||0)]), axisMaterial); xAxis.renderOrder = 999; scene.add(xAxis); centroid = new THREE.Mesh(new THREE.SphereGeometry(.17,24,24), centroidMaterial); centroid.position.set(p[0]||0,p[1]||0,p[2]||0); centroid.renderOrder = 1000; scene.add(centroid); };
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(defaultTarget); controls.enableDamping = true; controls.dampingFactor = .075; controls.enableRotate = true; controls.enablePan = true; controls.enableZoom = true; controls.rotateSpeed = .9; controls.panSpeed = 1; controls.zoomSpeed = 1; controls.minDistance = 3; controls.maxDistance = 35; controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI-.12; controls.screenSpacePanning = true; controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    const changed = () => { const o = camera.position.clone().sub(controls.target); const h = Math.hypot(o.x,o.z); if (h > .0001) headingCallback.current(norm(Math.atan2(o.x,o.z)*180/Math.PI)); }; controls.addEventListener('change', changed); controls.update(); controls.saveState(); changed();
    const reset3D = () => { controls.reset(); controls.update(); changed(); }; const rotate3D = (amount) => { const o = camera.position.clone().sub(controls.target), a = degToRad(amount); const x = o.x*Math.cos(a)+o.z*Math.sin(a), z = -o.x*Math.sin(a)+o.z*Math.cos(a); camera.position.set(controls.target.x+x,camera.position.y,controls.target.z+z); controls.update(); changed(); }; if (resetRef) resetRef.current=reset3D; if (rotateRef) rotateRef.current=rotate3D;
    const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}; const ro=new ResizeObserver(resize); ro.observe(root); resize();
    fetch(`${API}/api/frame`).then(r=>r.ok?r.json():null).then(d=>{if(!dead&&d?.input?.vertices)renderRaw(d.input,d.centroid);}).catch(()=>{});
    let af=0; const loop=()=>{if(dead)return;controls.update();renderer.render(scene,camera);af=requestAnimationFrame(loop);}; loop();
    return ()=>{dead=true;cancelAnimationFrame(af);ro.disconnect();controls.removeEventListener('change',changed);controls.dispose();renderer.domElement.remove();if(solid)solid.geometry.dispose();if(wire){wire.geometry.dispose();wire.material.dispose();}if(centroid)centroid.geometry.dispose();if(xAxis)xAxis.geometry.dispose();base.geometry.dispose();base.material.dispose();solidMaterial.dispose();wireMaterial.dispose();centroidMaterial.dispose();axisMaterial.dispose();renderer.dispose();if(resetRef&&resetRef.current===reset3D)resetRef.current=null;if(rotateRef&&rotateRef.current===rotate3D)rotateRef.current=null;};
  }, []);
  return <article className="view-card three-card"><div className="card-head"><span>3D</span><small>Backend raw cuboid · centroid · X-axis · orbit · pan · zoom</small></div><div className="three-stage" ref={mount}/><div className="three-tools"><span>LEFT DRAG · ORBIT</span><span>RIGHT DRAG · PAN</span><span>MIDDLE / WHEEL · ZOOM</span><button type="button" onClick={()=>resetRef.current?.()}>RESET · 180°</button></div></article>;
}

function TwoDView({ heading }) {
  const [shape,setShape]=useState('points'); const rulerDegrees=Array.from({length:36},(_,i)=>i*10); const majorDegrees=Array.from({length:12},(_,i)=>i*30);
  return <article className="view-card two-d-card"><div className="card-head"><span>2D</span><small>X/Y plane · rectangle · square · circle · 360°</small><span className="angle-readout">{String(Math.round(heading)).padStart(3,'0')}°</span></div><div className="two-d-space"><div className="two-d-grid-lines"/><div className="two-d-azimuth-ruler"><div className="two-d-ruler-ring">{rulerDegrees.map(d=>{const a=degToRad(d),x=50+Math.sin(a)*50,y=50-Math.cos(a)*50;return <span key={d} className={`two-d-ruler-tick ${d%30===0?'major':''}`} style={{left:`${x}%`,top:`${y}%`,transform:`translate(-50%,-50%) rotate(${d}deg)`}}/>;})}{majorDegrees.map(d=>{const a=degToRad(d),x=50+Math.sin(a)*56,y=50-Math.cos(a)*56;return <span key={d} className="two-d-ruler-label" style={{left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)'}}>{d}°</span>;})}<span className="two-d-ruler-label two-d-ruler-360">360°</span></div></div><div className="two-d-center"/>{shape==='points'&&Array.from({length:60},(_,i)=><i key={i} className="two-d-cloud-point" style={{left:`${50+Math.sin(i*.57)*34}%`,top:`${50+Math.cos(i*.43)*25}%`}}/>)}{shape==='rect'&&<div className="shape-rect"/>}{shape==='square'&&<div className="shape-square"/>}{shape==='circle'&&<div className="shape-circle"/>}<div className="two-d-heading" style={{transform:`translate(-50%,-100%) rotate(${heading}deg)`}}/><span className="two-d-x-label">X</span><span className="two-d-y-label">Y</span></div><div className="two-d-controls"><button className={shape==='points'?'selected':''} onClick={()=>setShape('points')}>✦ POINTS</button><button className={shape==='rect'?'selected':''} onClick={()=>setShape('rect')}>RECT</button><button className={shape==='square'?'selected':''} onClick={()=>setShape('square')}>SQUARE</button><button className={shape==='circle'?'selected':''} onClick={()=>setShape('circle')}>CIRCLE</button><span className="grow"/><span className="auto-toggle"><b/> GRID</span></div></article>;
}

function TwoFiveDView({ heading }) {
  const grid=useRef(null); useEffect(()=>{if(grid.current)grid.current.style.transform=`rotate(${heading}deg)`;},[heading]);
  return <article className="view-card two-five-card"><div className="card-head"><span>2.5D</span><small>Reserved · backend range grid · 360° ruler</small></div><div className="grid-wrap"><div className="grid-surface" ref={grid}><div className="grid-floor"/>{Array.from({length:9},(_,i)=><div className="scan-row" key={i} style={{top:`${10+i*10}%`}}/>)}{Array.from({length:11},(_,i)=><div className="scan-col" key={i} style={{left:`${5+i*9}%`}}/>)}<div className="fov-ring ring-a"/><div className="fov-ring ring-b"/><div className="fov-ring ring-c"/><div className="object"/><div className="ego"/></div><div className="ruler">{[0,30,60,90,120,150,180,210,240,270,300,330,360].map(d=><span key={d} style={{'--pos':`${d/3.6}`}}>{d}°</span>)}<div className="ruler-pointer" style={{'--pointer':`${heading/3.6}%`}}/></div></div><div className="two-five-controls"><span>PAN · ROTATE · MEASURE</span><span className="grow"/><span>2.5D NEXT STAGE</span></div></article>;
}

export default function ViewerV2(){
  const [threeHeading,setThreeHeading]=useState(180);
  const [heading,setHeading]=useState(180);
  const [sync,setSync]=useState(true);
  const socket=useRef(null);
  const threeResetRef=useRef(null);
  const threeRotateRef=useRef(null);

  const publish=(h)=>{
    if(!sync||socket.current?.readyState!==WebSocket.OPEN)return;
    socket.current.send(JSON.stringify({type:'view_state',heading:norm(h)}));
  };

  useEffect(()=>{
    const url=API.replace(/^http/,'ws')+'/ws/view';
    const ws=new WebSocket(url);
    socket.current=ws;
    ws.onmessage=e=>{
      try{
        const m=JSON.parse(e.data);
        if(sync && typeof m.heading==='number') setHeading(norm(m.heading));
      }catch{}
    };
    return()=>{ws.close();socket.current=null;};
  },[sync]);

  const handleThreeHeading=(v)=>{
    const h=norm(v);
    setThreeHeading(h);
    if(sync){
      setHeading(h);
      publish(h);
    }
  };

  const toggleSync=()=>{
    setSync((enabled)=>{
      const next=!enabled;
      if(next){
        setHeading(threeHeading);
        window.setTimeout(()=>{
          if(socket.current?.readyState===WebSocket.OPEN) socket.current.send(JSON.stringify({type:'view_state',heading:norm(threeHeading)}));
        },0);
      }
      return next;
    });
  };

  const rotateBy=(v)=>{if(threeRotateRef.current)threeRotateRef.current(v);else handleThreeHeading(threeHeading+v);};
  const resetAll=()=>{if(threeResetRef.current)threeResetRef.current();else handleThreeHeading(180);};

  return <main className="app-shell"><header className="hero"><div><h1>Foveated LiDAR Mapping</h1><p>3D model · 1D profile · 2D projection · 2.5D range map</p></div><div className="hero-meta"><b>● 3D RESET · 180° DEFAULT</b><small>0° TOP · 90° RIGHT · 180° BOTTOM · 270° LEFT</small></div></header><section className="toolbar"><span className="badge">4 SPACES</span><span className="badge">3D → 1D → 2D → 2.5D</span><span className="grow"/><button className={`sync-button ${sync?'sync-active':'sync-off'}`} type="button" onClick={toggleSync}>• SYNC {sync?'ON':'OFF'}</button><button type="button" onClick={()=>rotateBy(-5)}>↶ 5°</button><button type="button" onClick={()=>rotateBy(5)}>5° ↷</button><button type="button" onClick={resetAll}>RESET · 180°</button></section><section className="view-grid"><ThreeView onHeading={handleThreeHeading} resetRef={threeResetRef} rotateRef={threeRotateRef}/><OneDView heading={heading}/><TwoDView heading={heading}/><TwoFiveDView heading={heading}/></section><section className="analysis panel"><div><span className="section-kicker">FOV / ORIENTATION</span><strong>{Math.round(threeHeading)}°</strong><small>{sync?'linked heading':'3D heading · sync paused'}</small></div><div><span className="section-kicker">INPUT</span><strong>RAW CUBOID</strong><small>backend/data/raw/cube.json</small></div><div><span className="section-kicker">CENTROID</span><strong>BACKEND COMPUTED</strong><small>geometric center of raw vertices · Y = 0</small></div></section></main>;
}
