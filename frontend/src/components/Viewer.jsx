import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import './viewer.css';

const API=import.meta.env.VITE_BACKEND_URL||'http://localhost:8000';
const norm=a=>(a%360+360)%360;

export default function Viewer(){
 const mount=useRef(null),s=useRef({heading:32,pitch:-28,zoom:1,panX:0,panY:0,sync:true});
 const [heading,setHeading]=useState(32),[status,setStatus]=useState('CONNECTING');
 const three=useRef(null); const polar=useRef(null); const grid=useRef(null); const wsRef=useRef(null);
 const publish=()=>{const x=s.current;setHeading(Math.round(norm(x.heading)));try{wsRef.current?.send(JSON.stringify({type:'view_state',...x}))}catch{}};

 useEffect(()=>{
  let disposed=false,cleanupThree=()=>{};
  fetch(`${API}/api/frame`).then(r=>r.json()).then(data=>{
   if(disposed)return;
   const root=mount.current;if(!root)return;
   setStatus(`BACKEND · ${data.point_count} PTS`);
   try{
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x05080a);
    const cam=new THREE.PerspectiveCamera(45,1,.05,200);cam.position.set(7,5.2,7.5);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setClearColor(0x05080a,1);root.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,1.7));
    const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(6,10,8);scene.add(key);
    const fill=new THREE.DirectionalLight(0x8edcff,2.2);fill.position.set(-7,4,-5);scene.add(fill);

    // A real spatial reference plane: the object sits inside a 3D coordinate space.
    const floor=new THREE.GridHelper(16,32,0x31515c,0x172a31);floor.position.y=-1.55;scene.add(floor);
    const axes=new THREE.AxesHelper(3.8);axes.position.set(-4,-1.54,-4);scene.add(axes);

    // Main input: clearly visible solid cuboid at the origin.
    const size=Number(data?.input?.size_m)||2.3;
    const cubeGeo=new THREE.BoxGeometry(size,size,size);
    const cubeMat=new THREE.MeshPhongMaterial({color:0x7d9aa5,emissive:0x15242a,shininess:80,side:THREE.DoubleSide});
    const cuboid=new THREE.Mesh(cubeGeo,cubeMat);cuboid.position.set(0,0,0);scene.add(cuboid);
    const edgeGeo=new THREE.EdgesGeometry(cubeGeo);
    const edgeMat=new THREE.LineBasicMaterial({color:0x8ff2ff,linewidth:2,transparent:true,opacity:1});
    const edges=new THREE.LineSegments(edgeGeo,edgeMat);cuboid.add(edges);
    const center=new THREE.Mesh(new THREE.SphereGeometry(.075,20,20),new THREE.MeshBasicMaterial({color:0x7dff91}));cuboid.add(center);

    // Backend point returns, rendered slightly larger so the LiDAR geometry is visible.
    if(Array.isArray(data?.points)&&data.points.length){
      const pos=new Float32Array(data.points.flat());const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
      const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xa7efff,size:.065,sizeAttenuation:true,transparent:true,opacity:.75}));scene.add(pts);
    }

    const controls=new OrbitControls(cam,renderer.domElement);
    controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.07;
    controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;
    controls.rotateSpeed=.85;controls.panSpeed=.9;controls.zoomSpeed=1;
    controls.minDistance=3.1;controls.maxDistance=30;controls.screenSpacePanning=true;
    renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
    three.current={cam,controls};

    const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(root);resize();
    controls.addEventListener('change',()=>{
      const o=cam.position.clone().sub(controls.target);s.current.heading=norm(Math.atan2(o.x,o.z)*180/Math.PI);s.current.pitch=Math.asin(Math.max(-1,Math.min(1,o.y/o.length())))*180/Math.PI;s.current.zoom=Math.max(.55,Math.min(1.8,6.7/o.length()));s.current.panX=controls.target.x;s.current.panY=controls.target.z;
      if(s.current.sync)publish();
    });
    const loop=()=>{if(disposed)return;renderer.render(scene,cam);requestAnimationFrame(loop)};loop();
    cleanupThree=()=>{observer.disconnect();controls.dispose();cubeGeo.dispose();cubeMat.dispose();edgeGeo.dispose();edgeMat.dispose();renderer.dispose();root.innerHTML='';};
   }catch(err){setStatus('3D RENDER ERROR');console.error(err)}
  }).catch(()=>setStatus('BACKEND OFFLINE'));
  wsRef.current=new WebSocket(API.replace(/^http/,'ws')+'/ws/state');wsRef.current.onopen=()=>setStatus('BACKEND · LIVE');wsRef.current.onmessage=e=>{const p=JSON.parse(e.data);if(p.type==='state'&&s.current.sync){Object.assign(s.current,p.state);setHeading(Math.round(norm(s.current.heading)))}};
  return()=>{disposed=true;cleanupThree();wsRef.current?.close();wsRef.current=null};
 },[]);

 useEffect(()=>{const move=()=>{if(!s.current.sync)return;const g=grid.current,p=polar.current;if(g)g.style.transform=`translate(${s.current.panX*8}px,${-s.current.panY*8}px) rotate(${s.current.heading}deg) scale(${s.current.zoom})`;if(p)p.style.transform=`rotate(${s.current.heading}deg) scale(${s.current.zoom})`};const id=setInterval(move,16);return()=>clearInterval(id)},[]);
 const turn=d=>{s.current.heading=norm(s.current.heading+d);const v=three.current;if(v){const r=v.cam.position.clone().sub(v.controls.target),rad=Math.atan2(r.x,r.z)-d*Math.PI/180,rr=Math.hypot(r.x,r.z);v.cam.position.x=v.controls.target.x+rr*Math.sin(rad);v.cam.position.z=v.controls.target.z+rr*Math.cos(rad);v.controls.update()}publish()};
 return <main className="page">
  <header className="topbar"><div><h1>Foveated LiDAR Mapping</h1><p>3D model · synchronized 2D · synchronized 2.5D</p></div><div className="header-readout"><span className="dot"/> {status}</div></header>
  <section className="toolbar panel"><div className="pill">3 VIEWS</div><div className="pill muted">360° / 16 RINGS</div><div className="grow"/><button className={s.current.sync?'btn active':'btn'} onClick={()=>{s.current.sync=!s.current.sync;setStatus(s.current.sync?'BACKEND · SYNC ON':'MANUAL')}}><span className="tiny-dot"/>{s.current.sync?'SYNC ON':'SYNC OFF'}</button><button className="btn" onClick={()=>turn(-5)}>↶ 5°</button><button className="btn" onClick={()=>turn(5)}>5° ↷</button></section>
  <section className="views">
   <article className="view-card"><div className="card-head"><span>3D</span><small>Interactive 3D space · orbit · pan · zoom</small></div><div className="three-stage" ref={mount}/><div className="corner axis">X&nbsp; <i>Y</i>&nbsp; Z</div><div className="card-footer">LEFT DRAG · ORBIT &nbsp;&nbsp; RIGHT DRAG · PAN &nbsp;&nbsp; WHEEL · ZOOM</div></article>
   <article className="view-card"><div className="card-head"><span>2D</span><small>Backend polar projection</small></div><div className="polar-wrap"><div className="polar-surface" ref={polar}>{Array.from({length:7},(_,i)=><div className="ring" key={i} style={{inset:`${13+i*6}%`}/>)}{Array.from({length:8},(_,i)=><div className="ray" key={i} style={{transform:`rotate(${i*45}deg)`}/>)}<div className="center-dot"/><div className="heading-line"/></div><div className="angle-readout">{heading.toString().padStart(3,'0')}°</div></div><div className="card-footer">Azimuth projection</div></article>
   <article className="view-card"><div className="card-head"><span>2.5D</span><small>Backend range grid · 360° ruler</small></div><div className="grid-wrap"><div className="grid-surface" ref={grid}><div className="grid-floor"/>{Array.from({length:9},(_,i)=><div className="scan-row" key={i} style={{top:`${10+i*10}%`}/>)}{Array.from({length:11},(_,i)=><div className="scan-col" key={i} style={{left:`${5+i*9}%`}/>)}<div className="fov-ring ring-a"/><div className="fov-ring ring-b"/><div className="fov-ring ring-c"/><div className="object"/><div className="ego"/></div><div className="ruler">{[0,30,60,90,120,150,180,210,240,270,300,330,360].map(d=><span key={d} style={{transform:`rotate(${d}deg) translateY(-102px)`}}>{d}°</span>)}<div className="ruler-pointer" style={{transform:`rotate(${heading}deg)`}}/></div></div><div className="card-footer">Pan · Rotate · Measure 360°</div></article>
  </section>
  <section className="analysis panel"><div><span className="section-kicker">FOV / ORIENTATION</span><strong>{heading}°</strong><small>linked heading</small></div><div><span className="section-kicker">INPUT</span><strong>3D CUBOID</strong><small>generated by backend</small></div><div><span className="section-kicker">PIPELINE</span><strong>3D → 2D → 2.5D → FRNet</strong><small>processing boundary is backend</small></div></section>
 </main>
}
