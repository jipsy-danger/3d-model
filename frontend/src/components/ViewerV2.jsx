import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './viewer.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const norm = (a) => ((a % 360) + 360) % 360;

function OneDView({ heading }) {
  return <article className="view-card one-d-card">
    <div className="card-head"><span>1D</span><small>X-axis projection · 3D linked</small></div>
    <div className="one-d-space">
      <div className="one-d-axis" />
      <div className="one-d-dot" style={{ left: `${50 + Math.sin(heading * Math.PI / 180) * 32}%` }} />
      <span className="one-d-label x-label">X</span>
    </div>
    <div className="card-footer">X AXIS · POINT + LINE ONLY</div>
  </article>;
}

function TwoDView({ heading }) {
  return <article className="view-card two-d-card">
    <div className="card-head"><span>2D</span><small>X/Y plane · 3D heading linked</small></div>
    <div className="two-d-space">
      <div className="two-d-axis-x" /><div className="two-d-axis-y" />
      <div className="two-d-grid-lines" />
      <div className="two-d-circle" />
      <div className="two-d-square" />
      <div className="two-d-rect" />
      <div className="two-d-point" />
      <div className="two-d-heading" style={{ transform: `translate(-50%, -100%) rotate(${heading}deg)` }} />
      <span className="two-d-x-label">X</span><span className="two-d-y-label">Y</span>
    </div>
    <div className="card-footer">X/Y PLANE · RECTANGLE · SQUARE · CIRCLE</div>
  </article>;
}

function TwoFiveDView({ heading }) {
  const grid = useRef(null);
  useEffect(() => { if (grid.current) grid.current.style.transform = `rotate(${heading}deg)`; }, [heading]);
  return <article className="view-card two-five-card">
    <div className="card-head"><span>2.5D</span><small>Backend range grid · 360° ruler</small></div>
    <div className="grid-wrap"><div className="grid-surface" ref={grid}>
      <div className="grid-floor" />
      {Array.from({ length: 9 }, (_, i) => <div className="scan-row" key={`r${i}`} style={{ top: `${10 + i * 10}%` }} />)}
      {Array.from({ length: 11 }, (_, i) => <div className="scan-col" key={`c${i}`} style={{ left: `${5 + i * 9}%` }} />)}
      <div className="fov-ring ring-a" /><div className="fov-ring ring-b" /><div className="fov-ring ring-c" />
      <div className="object" /><div className="ego" />
    </div><div className="ruler">{[0,30,60,90,120,150,180,210,240,270,300,330,360].map((d) => <span key={d} style={{ '--pos': `${d / 3.6}` }}>{d}°</span>)}<div className="ruler-pointer" style={{ '--pointer': `${heading / 3.6}%` }} /></div></div>
    <div className="card-footer">Pan · Rotate · Measure 360°</div>
  </article>;
}

function makeDegreeSprite(text) {
  const canvas = document.createElement('canvas'); canvas.width = 220; canvas.height = 84;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,220,84); ctx.font='bold 32px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#b9e9f2'; ctx.fillText(text,110,42);
  const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate=true; texture.minFilter=THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false })); sprite.scale.set(1.05,.4,1); return sprite;
}
function add3DRuler(scene) {
  const radius=3.28, group=new THREE.Group();
  const pts=[]; for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;pts.push(new THREE.Vector3(-Math.sin(a)*radius,-1.485,Math.cos(a)*radius));}
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x477b88,transparent:true,opacity:.72})));
  for(let d=0;d<=360;d+=10){const a=d*Math.PI/180,major=d%30===0,inner=radius-(major?.26:.15),outer=radius+.13;const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-Math.sin(a)*inner,-1.48,Math.cos(a)*inner),new THREE.Vector3(-Math.sin(a)*outer,-1.48,Math.cos(a)*outer)]);group.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:major?0x8fe9f5:0x456b75,transparent:true,opacity:major?.9:.6})));if(major){const s=makeDegreeSprite(`${d}°`);const r=radius+.58;s.position.set(-Math.sin(a)*r,-1.43,Math.cos(a)*r);if(d===360){s.position.x-=.3;s.position.z+=.3;}group.add(s);}}
  scene.add(group);
}

function ThreeView({ onHeading }) {
  const mount=useRef(null); const viewer=useRef(null);
  useEffect(()=>{const root=mount.current;if(!root)return;let dead=false;
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x05080a);
    const camera=new THREE.PerspectiveCamera(48,1,.05,200);camera.position.set(0,5.5,7.5);
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x05080a,1);root.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xdff7ff,0x162027,2.2));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(6,10,8);scene.add(key);
    const fill=new THREE.DirectionalLight(0x73dfff,2.5);fill.position.set(-7,5,-5);scene.add(fill);
    const floor=new THREE.GridHelper(18,36,0x31515c,0x172a31);floor.position.y=-1.55;scene.add(floor);const axes=new THREE.AxesHelper(3.5);axes.position.set(-4,-1.54,-4);scene.add(axes);
    const geo=new THREE.BoxGeometry(2.3,2.3,2.3),mat=new THREE.MeshStandardMaterial({color:0x7896a0,metalness:.15,roughness:.35,emissive:0x13272e,emissiveIntensity:.7});const cube=new THREE.Mesh(geo,mat);cube.position.set(0,-.4,0);scene.add(cube);cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x9bf5ff})));cube.add(new THREE.Mesh(new THREE.SphereGeometry(.1,20,20),new THREE.MeshBasicMaterial({color:0x76ff91})));
    const base=new THREE.Mesh(new THREE.CircleGeometry(2.8,64),new THREE.MeshBasicMaterial({color:0x0c171b,transparent:true,opacity:.75,side:THREE.DoubleSide}));base.rotation.x=-Math.PI/2;base.position.y=-1.54;scene.add(base);add3DRuler(scene);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,-.35,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=true;controls.enableZoom=true;controls.rotateSpeed=.9;controls.panSpeed=1;controls.zoomSpeed=1;controls.minDistance=3;controls.maxDistance=35;controls.screenSpacePanning=true;
    const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(root);resize();viewer.current={camera,controls};
    const changed=()=>{const o=camera.position.clone().sub(controls.target);onHeading(norm(Math.atan2(o.x,o.z)*180/Math.PI));};controls.addEventListener('change',changed);
    const loop=()=>{if(dead)return;controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)};loop();
    fetch(`${API}/api/frame`).then(r=>r.ok?r.json():null).then(d=>{if(dead||!d?.points?.length)return;const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(d.points.flat()),3));scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xa7efff,size:.065,sizeAttenuation:true,transparent:true,opacity:.8})));}).catch(()=>{});
    return()=>{dead=true;ro.disconnect();controls.dispose();renderer.dispose();root.innerHTML='';};
  },[onHeading]);
  return <article className="view-card"><div className="card-head"><span>3D</span><small>Interactive 3D space · orbit · pan · zoom</small></div><div className="three-stage" ref={mount}/><div className="card-footer">Left drag · orbit · Right drag · pan · Wheel · zoom</div></article>;
}

export default function ViewerV2(){
  const [heading,setHeading]=useState(180); const [sync,setSync]=useState(true); const socket=useRef(null);
  useEffect(()=>{try{socket.current=new WebSocket(API.replace(/^http/,'ws')+'/ws/view');socket.current.onmessage=e=>{try{const m=JSON.parse(e.data);if(sync&&m.type==='view_state')setHeading(norm(m.heading??180));}catch{}}}catch{}return()=>{try{socket.current?.close()}catch{}}},[sync]);
  const publish=h=>{setHeading(h);if(sync){try{socket.current?.send(JSON.stringify({type:'view_state',heading:h,pitch:35,zoom:1,panX:0,panY:0,sync:true}))}catch{}}};
  return <main className="page"><header className="topbar"><div><h1>Foveated LiDAR Mapping</h1><p>3D model · synchronized 1D · synchronized 2D · 2.5D</p></div><div className="header-readout"><span className="dot"/>VIEW PIPELINE READY</div></header>
    <section className="toolbar panel"><span className="pill">4 SPACES</span><span className="pill muted">3D → 1D → 2D → 2.5D</span><span className="grow"/><button className={`btn ${sync?'active':''}`} onClick={()=>setSync(v=>!v)}>● SYNC {sync?'ON':'OFF'}</button><button className="btn" onClick={()=>publish(norm(heading-5))}>↶ 5°</button><button className="btn" onClick={()=>publish(norm(heading+5))}>5° ↷</button></section>
    <section className="views"><ThreeView onHeading={publish}/><OneDView heading={heading}/><TwoDView heading={heading}/><TwoFiveDView heading={heading}/></section>
    <section className="analysis panel"><div><span className="section-kicker">FOV / ORIENTATION</span><strong>{heading}°</strong><small>3D linked heading</small></div><div><span className="section-kicker">PROJECTION</span><strong>3D → 1D → 2D</strong><small>dimensional reduction stages</small></div><div><span className="section-kicker">NEXT STAGE</span><strong>2.5D</strong><small>reserved for next implementation</small></div></section></main>;
}
