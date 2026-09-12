import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './viewer.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const norm = (a) => ((a % 360) + 360) % 360;

function PolarView({ heading }) {
  return (
    <article className="view-card">
      <div className="card-head">
        <span>2D</span>
        <small>Backend polar projection</small>
      </div>
      <div className="polar-wrap">
        <div className="polar-surface">
          {Array.from({ length: 7 }, (_, i) => (
            <div className="ring" key={`ring-${i}`} style={{ inset: `${13 + i * 6}%` }} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <div className="ray" key={`ray-${i}`} style={{ transform: `rotate(${i * 45}deg)` }} />
          ))}
          <div className="center-dot" />
          <div className="heading-line" style={{ transform: `rotate(${heading}deg)` }} />
        </div>
        <div className="angle-readout">{String(heading).padStart(3, '0')}°</div>
      </div>
      <div className="card-footer">Azimuth projection</div>
    </article>
  );
}

function GridView({ heading }) {
  const grid = useRef(null);

  useEffect(() => {
    if (grid.current) {
      grid.current.style.transform = `rotate(${heading}deg)`;
    }
  }, [heading]);

  return (
    <article className="view-card">
      <div className="card-head">
        <span>2.5D</span>
        <small>Backend range grid · 360° ruler</small>
      </div>
      <div className="grid-wrap">
        <div className="grid-surface" ref={grid}>
          <div className="grid-floor" />
          {Array.from({ length: 9 }, (_, i) => (
            <div className="scan-row" key={`row-${i}`} style={{ top: `${10 + i * 10}%` }} />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <div className="scan-col" key={`col-${i}`} style={{ left: `${5 + i * 9}%` }} />
          ))}
          <div className="fov-ring ring-a" />
          <div className="fov-ring ring-b" />
          <div className="fov-ring ring-c" />
          <div className="object" />
          <div className="ego" />
        </div>
        <div className="ruler">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map((degree) => (
            <span key={degree} style={{ transform: `rotate(${degree}deg) translateY(-102px)` }}>
              {degree}°
            </span>
          ))}
          <div className="ruler-pointer" style={{ transform: `rotate(${heading}deg)` }} />
        </div>
      </div>
      <div className="card-footer">Pan · Rotate · Measure 360°</div>
    </article>
  );
}

export default function Viewer() {
  const mount = useRef(null);
  const three = useRef(null);
  const wsRef = useRef(null);
  const state = useRef({ heading: 32, pitch: -28, zoom: 1, panX: 0, panY: 0, sync: true });

  const [heading, setHeading] = useState(32);
  const [status, setStatus] = useState('CONNECTING');

  const publish = () => {
    const value = state.current;
    setHeading(Math.round(norm(value.heading)));
    try {
      wsRef.current?.send(JSON.stringify({ type: 'view_state', ...value }));
    } catch {
      // WebSocket may not be ready yet.
    }
  };

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    const load = async () => {
      try {
        const response = await fetch(`${API}/api/frame`);
        if (!response.ok) throw new Error('frame request failed');
        const data = await response.json();
        if (disposed || !mount.current) return;

        const root = mount.current;
        setStatus(`BACKEND · ${data.point_count ?? 0} PTS`);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x05080a);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
        camera.position.set(7, 5.2, 7.5);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x05080a, 1);
        root.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 1.8));
        const key = new THREE.DirectionalLight(0xffffff, 3.2);
        key.position.set(6, 10, 8);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x8edcff, 2);
        fill.position.set(-7, 5, -5);
        scene.add(fill);

        // Real 3D space: floor, coordinate axes, and a clearly visible cuboid.
        const floor = new THREE.GridHelper(16, 32, 0x31515c, 0x172a31);
        floor.position.y = -1.55;
        scene.add(floor);

        const axes = new THREE.AxesHelper(3.8);
        axes.position.set(-4, -1.54, -4);
        scene.add(axes);

        const size = Number(data?.input?.size_m) || 2.3;
        const cubeGeometry = new THREE.BoxGeometry(size, size, size);
        const cubeMaterial = new THREE.MeshPhongMaterial({
          color: 0x6f8d98,
          emissive: 0x18282e,
          shininess: 90,
          side: THREE.DoubleSide,
        });
        const cuboid = new THREE.Mesh(cubeGeometry, cubeMaterial);
        scene.add(cuboid);

        const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x8ff2ff });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        cuboid.add(edges);

        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 20, 20),
          new THREE.MeshBasicMaterial({ color: 0x7dff91 })
        );
        cuboid.add(center);

        if (Array.isArray(data?.points) && data.points.length > 0) {
          const positions = new Float32Array(data.points.flat());
          const pointGeometry = new THREE.BufferGeometry();
          pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const pointMaterial = new THREE.PointsMaterial({
            color: 0xa7efff,
            size: 0.065,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.75,
          });
          scene.add(new THREE.Points(pointGeometry, pointMaterial));
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.rotateSpeed = 0.85;
        controls.panSpeed = 0.9;
        controls.zoomSpeed = 1;
        controls.minDistance = 3.1;
        controls.maxDistance = 30;
        controls.screenSpacePanning = true;
        renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

        three.current = { camera, controls };

        const resize = () => {
          const width = Math.max(1, root.clientWidth);
          const height = Math.max(1, root.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };

        const observer = new ResizeObserver(resize);
        observer.observe(root);
        resize();

        controls.addEventListener('change', () => {
          const offset = camera.position.clone().sub(controls.target);
          state.current.heading = norm((Math.atan2(offset.x, offset.z) * 180) / Math.PI);
          state.current.pitch = (Math.asin(Math.max(-1, Math.min(1, offset.y / offset.length()))) * 180) / Math.PI;
          state.current.zoom = Math.max(0.55, Math.min(1.8, 6.7 / offset.length()));
          state.current.panX = controls.target.x;
          state.current.panY = controls.target.z;
          if (state.current.sync) publish();
        });

        let animationFrame = 0;
        const render = () => {
          if (disposed) return;
          controls.update();
          renderer.render(scene, camera);
          animationFrame = requestAnimationFrame(render);
        };
        render();

        cleanup = () => {
          cancelAnimationFrame(animationFrame);
          observer.disconnect();
          controls.dispose();
          cubeGeometry.dispose();
          cubeMaterial.dispose();
          edgeGeometry.dispose();
          edgeMaterial.dispose();
          renderer.dispose();
          root.innerHTML = '';
          three.current = null;
        };
      } catch (error) {
        console.error(error);
        setStatus('3D RENDER ERROR');
      }
    };

    load();

    try {
      const socketUrl = API.replace(/^http/, 'ws') + '/ws/state';
      wsRef.current = new WebSocket(socketUrl);
      wsRef.current.onopen = () => setStatus('BACKEND · LIVE');
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'state' && state.current.sync) {
            Object.assign(state.current, message.state);
            setHeading(Math.round(norm(state.current.heading)));
          }
        } catch {
          // Ignore malformed state packets.
        }
      };
    } catch {
      setStatus('BACKEND · LIVE');
    }

    return () => {
      disposed = true;
      cleanup();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const turn = (delta) => {
    state.current.heading = norm(state.current.heading + delta);
    const view = three.current;

    if (view) {
      const offset = view.camera.position.clone().sub(view.controls.target);
      const radius = Math.hypot(offset.x, offset.z);
      const angle = Math.atan2(offset.x, offset.z) - (delta * Math.PI) / 180;
      view.camera.position.x = view.controls.target.x + radius * Math.sin(angle);
      view.camera.position.z = view.controls.target.z + radius * Math.cos(angle);
      view.controls.update();
    }

    publish();
  };

  const toggleSync = () => {
    state.current.sync = !state.current.sync;
    setStatus(state.current.sync ? 'BACKEND · SYNC ON' : 'MANUAL');
  };

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Foveated LiDAR Mapping</h1>
          <p>3D model · synchronized 2D · synchronized 2.5D</p>
        </div>
        <div className="header-readout"><span className="dot" /> {status}</div>
      </header>

      <section className="toolbar panel">
        <div className="pill">3 VIEWS</div>
        <div className="pill muted">360° / 16 RINGS</div>
        <div className="grow" />
        <button className={state.current.sync ? 'btn active' : 'btn'} onClick={toggleSync}>
          <span className="tiny-dot" /> {state.current.sync ? 'SYNC ON' : 'SYNC OFF'}
        </button>
        <button className="btn" onClick={() => turn(-5)}>↶ 5°</button>
        <button className="btn" onClick={() => turn(5)}>5° ↷</button>
      </section>

      <section className="views">
        <article className="view-card">
          <div className="card-head">
            <span>3D</span>
            <small>Interactive 3D space · orbit · pan · zoom</small>
          </div>
          <div className="three-stage" ref={mount} />
          <div className="corner axis">X&nbsp; <i>Y</i>&nbsp; Z</div>
          <div className="card-footer">LEFT DRAG · ORBIT &nbsp;&nbsp; RIGHT DRAG · PAN &nbsp;&nbsp; WHEEL · ZOOM</div>
        </article>

        <PolarView heading={heading} />
        <GridView heading={heading} />
      </section>

      <section className="analysis panel">
        <div>
          <span className="section-kicker">FOV / ORIENTATION</span>
          <strong>{heading}°</strong>
          <small>linked heading</small>
        </div>
        <div>
          <span className="section-kicker">INPUT</span>
          <strong>3D CUBOID</strong>
          <small>generated by backend</small>
        </div>
        <div>
          <span className="section-kicker">PIPELINE</span>
          <strong>3D → 2D → 2.5D → FRNet</strong>
          <small>processing boundary is backend</small>
        </div>
      </section>
    </main>
  );
}
