import React, { useEffect } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const FACES = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];

export default function ProjectionOverlay() {
  useEffect(() => {
    let dead = false;
    let timer = 0;
    let frame = null;
    let camera = null;
    let oneSvg = null;
    let twoSvg = null;
    const hidden = [];

    const hideDiagnostics = root => {
      root?.querySelectorAll('.one-d-cloud-dot,.one-d-sync-indicator,.one-d-space-axis-label,.one-d-viewport-hint,.two-d-cloud-point,.two-d-sync-indicator,.two-d-space-axis-label,.two-d-viewport-hint').forEach(el => {
        if (!hidden.includes(el)) {
          hidden.push(el);
          el.style.display = 'none';
        }
      });
    };

    const restoreDiagnostics = () => {
      hidden.splice(0).forEach(el => { el.style.display = ''; });
    };

    const removeSvg = () => {
      oneSvg?.remove();
      twoSvg?.remove();
      oneSvg = null;
      twoSvg = null;
    };

    const makeSvg = (root, old) => {
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      const svg = old || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.display = 'block';
      svg.style.overflow = 'hidden';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '999';
      return svg;
    };

    const ensureMounted = () => {
      const one = document.querySelector('.one-d-space');
      const two = document.querySelector('.two-d-space');
      if (!one || !two) return null;
      hideDiagnostics(one);
      hideDiagnostics(two);
      if (!oneSvg || oneSvg.parentNode !== one) {
        oneSvg?.remove();
        oneSvg = makeSvg(one, null);
        one.appendChild(oneSvg);
      }
      if (!twoSvg || twoSvg.parentNode !== two) {
        twoSvg?.remove();
        twoSvg = makeSvg(two, null);
        two.appendChild(twoSvg);
      }
      return { one, two };
    };

    const syncEnabled = () => {
      const button = document.querySelector('.sync-button');
      if (!button) return true;
      const text = (button.textContent || '').toUpperCase();
      return button.classList.contains('sync-active') || text.includes('SYNC ON');
    };

    const clearSvg = svg => { while (svg.firstChild) svg.removeChild(svg.firstChild); };

    const project = vertex => {
      if (!camera?.position || !camera?.right || !camera?.up || !camera?.forward) return null;
      const p = [
        Number(vertex[0]) - Number(camera.position[0]),
        Number(vertex[1]) - Number(camera.position[1]),
        Number(vertex[2]) - Number(camera.position[2]),
      ];
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const depth = dot(p, camera.forward);
      if (!(depth > 0.001)) return null;
      const fov = (Number(camera.fov) || 48) * Math.PI / 180;
      const aspect = Math.max(0.1, Number(camera.aspect) || 1);
      const tanHalf = Math.tan(fov / 2);
      return {
        x: dot(p, camera.right) / (depth * tanHalf * aspect),
        y: dot(p, camera.up) / (depth * tanHalf),
      };
    };

    const line = (svg, x1, y1, x2, y2, stroke, width, opacity = 1, dash = null) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', x1); el.setAttribute('y1', y1);
      el.setAttribute('x2', x2); el.setAttribute('y2', y2);
      el.setAttribute('stroke', stroke);
      el.setAttribute('stroke-width', width);
      el.setAttribute('stroke-opacity', opacity);
      if (dash) el.setAttribute('stroke-dasharray', dash);
      svg.appendChild(el);
    };

    const circle = (svg, cx, cy, r, fill) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('r', r); el.setAttribute('fill', fill);
      svg.appendChild(el);
    };

    const render = () => {
      const mounted = ensureMounted();
      if (!mounted || !frame?.input?.vertices || !camera) return;
      if (!syncEnabled()) {
        removeSvg();
        restoreDiagnostics();
        return;
      }

      const { one, two } = mounted;
      oneSvg = makeSvg(one, oneSvg);
      twoSvg = makeSvg(two, twoSvg);
      clearSvg(oneSvg);
      clearSvg(twoSvg);

      const vertices = frame.input.vertices;
      const points = vertices.map(project);
      const axisButton = document.querySelector('.one-d-controls .axis-option.selected');
      const axis = ((axisButton?.textContent || 'X-AXIS').trim().toUpperCase().startsWith('Y')) ? 'y' : 'x';
      const centroid = Array.isArray(frame.centroid) ? project(frame.centroid) : null;

      const ow = one.clientWidth, oh = one.clientHeight;
      const oneX = v => ow / 2 + v * ow / 2;
      const oneY = v => oh / 2 - v * oh / 2;
      const values = points.filter(Boolean).map(p => axis === 'x' ? p.x : p.y);
      if (values.length) {
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        const a = axis === 'x' ? oneX(lo) : ow / 2 - 11;
        const b = axis === 'x' ? oneX(hi) : oh / 2 - hi * oh / 2;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        if (axis === 'x') {
          rect.setAttribute('x', a); rect.setAttribute('y', oh / 2 - 11);
          rect.setAttribute('width', Math.max(2, b - a)); rect.setAttribute('height', 22);
        } else {
          rect.setAttribute('x', ow / 2 - 11); rect.setAttribute('y', b);
          rect.setAttribute('width', 22); rect.setAttribute('height', Math.max(2, (hi - lo) * oh / 2));
        }
        rect.setAttribute('fill', '#788f98');
        rect.setAttribute('fill-opacity', '.92');
        rect.setAttribute('stroke', '#9bf5ff');
        rect.setAttribute('stroke-width', '1.5');
        rect.setAttribute('rx', '2');
        oneSvg.appendChild(rect);
        values.forEach(v => circle(oneSvg, axis === 'x' ? oneX(v) : ow / 2, axis === 'x' ? oh / 2 : oneY(v), 2.2, '#9bf5ff'));
      }

      if (centroid) {
        const cx = axis === 'x' ? oneX(centroid.x) : ow / 2;
        const cy = axis === 'x' ? oh / 2 : oneY(centroid.y);
        if (axis === 'x') line(oneSvg, cx, 0, cx, oh, '#76ff91', 1.5, .72, '4 4');
        else line(oneSvg, 0, cy, ow, cy, '#76ff91', 1.5, .72, '4 4');
        circle(oneSvg, cx, cy, 5, '#76ff91');
      }

      const tw = two.clientWidth, th = two.clientHeight;
      const xy = p => [tw / 2 + p.x * tw / 2, th / 2 - p.y * th / 2];
      FACES.forEach((face, fi) => {
        const pp = face.map(i => points[i]);
        if (pp.some(p => !p)) return;
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', pp.map(xy).map(p => p.join(',')).join(' '));
        poly.setAttribute('fill', '#788f98');
        poly.setAttribute('fill-opacity', String(.22 + fi * .015));
        poly.setAttribute('stroke', '#9bf5ff');
        poly.setAttribute('stroke-width', '1.2');
        twoSvg.appendChild(poly);
      });
      EDGES.forEach(([a, b]) => {
        if (!points[a] || !points[b]) return;
        const A = xy(points[a]), B = xy(points[b]);
        line(twoSvg, A[0], A[1], B[0], B[1], '#9bf5ff', 1.5);
      });
      points.filter(Boolean).forEach(p => { const q = xy(p); circle(twoSvg, q[0], q[1], 2.2, '#9bf5ff'); });
      if (centroid) {
        const q = xy(centroid);
        line(twoSvg, q[0], 0, q[0], th, '#76ff91', 1.2, .68, '4 4');
        line(twoSvg, 0, q[1], tw, q[1], '#76ff91', 1.2, .68, '4 4');
        circle(twoSvg, q[0], q[1], 5, '#76ff91');
      }
    };

    const loadFrame = () => fetch(`${API}/api/frame`).then(r => r.ok ? r.json() : null).then(d => { if (!dead && d) { frame = d; render(); } }).catch(() => {});
    const loadState = () => fetch(`${API}/api/state`).then(r => r.ok ? r.json() : null).then(d => { if (!dead && d) { camera = d; render(); } }).catch(() => {});

    const wsUrl = API.replace(/^http/, 'ws') + '/ws/view';
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = e => { try { camera = JSON.parse(e.data); render(); } catch {} };
    } catch {}

    const poll = () => {
      if (dead) return;
      if (!camera) loadState();
      ensureMounted();
      render();
      timer = window.setTimeout(poll, 250);
    };

    loadFrame();
    loadState();
    poll();

    const observer = new MutationObserver(render);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    const onClick = () => window.setTimeout(render, 0);
    const onResize = () => render();
    document.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    return () => {
      dead = true;
      clearTimeout(timer);
      ws?.close();
      observer.disconnect();
      document.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      removeSvg();
      restoreDiagnostics();
    };
  }, []);

  return null;
}
