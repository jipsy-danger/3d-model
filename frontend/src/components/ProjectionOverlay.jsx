import React, { useEffect } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const FACES = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];

export default function ProjectionOverlay() {
  useEffect(() => {
    let dead = false, timer = 0, frame = null, camera = null;
    const oneHost = document.createElement('div'), twoHost = document.createElement('div');
    const hidden = [];
    const styleHost = el => { el.style.position='absolute'; el.style.inset='0'; el.style.pointerEvents='none'; el.style.zIndex='20'; };
    styleHost(oneHost); styleHost(twoHost);
    const setHidden = (root) => root?.querySelectorAll('.one-d-cloud-dot,.one-d-sync-indicator,.one-d-space-axis-label,.one-d-viewport-hint,.two-d-cloud-point,.two-d-sync-indicator,.two-d-space-axis-label,.two-d-viewport-hint').forEach(el => { if (!hidden.some(x => x===el)) { hidden.push(el); el.style.display='none'; } });
    const restore = () => { hidden.splice(0).forEach(el => { el.style.display=''; }); oneHost.remove(); twoHost.remove(); };
    const mount = () => {
      const one=document.querySelector('.one-d-space'), two=document.querySelector('.two-d-space');
      if(!one || !two) return false;
      if(!oneHost.parentNode) one.appendChild(oneHost);
      if(!twoHost.parentNode) two.appendChild(twoHost);
      setHidden(one); setHidden(two); return true;
    };
    const fetchFrame=()=>fetch(`${API}/api/frame`).then(r=>r.ok?r.json():null).then(d=>{if(!dead)frame=d;}).catch(()=>{});
    const ws=new WebSocket(API.replace(/^http/,'ws')+'/ws/view');
    ws.onmessage=e=>{try{camera=JSON.parse(e.data);render();}catch{}};
    const project=v=>{
      if(!camera?.position||!camera?.right||!camera?.up||!camera?.forward)return null;
      const p=[Number(v[0])-camera.position[0],Number(v[1])-camera.position[1],Number(v[2])-camera.position[2]];
      const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
      const depth=dot(p,camera.forward); if(depth<=.001)return null;
      const fov=(Number(camera.fov)||48)*Math.PI/180, aspect=Math.max(.1,Number(camera.aspect)||1), t=Math.tan(fov/2);
      return {x:dot(p,camera.right)/(depth*t*aspect),y:dot(p,camera.up)/(depth*t),z:depth};
    };
    const svg=(w,h)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('width','100%');s.setAttribute('height','100%');s.setAttribute('viewBox',`0 0 ${w} ${h}`);s.style.overflow='visible';return s;};
    const render=()=>{
      if(!mount()||!frame?.input?.vertices||!camera)return;
      const syncOn=document.querySelector('.sync-button')?.classList.contains('sync-active');
      if(!syncOn){restore();return;}
      const one=document.querySelector('.one-d-space'), two=document.querySelector('.two-d-space'), verts=frame.input.vertices;
      oneHost.innerHTML=''; twoHost.innerHTML='';
      const w=one.clientWidth,h=one.clientHeight,s1=svg(w,h), axis=document.querySelector('.one-d-controls .axis-option.selected')?.textContent?.toLowerCase().startsWith('y')?'y':'x';
      const vals=verts.map(project).filter(Boolean).map(p=>axis==='x'?p.x:p.y), px=v=>w/2+v*w/2;
      if(vals.length){
        const lo=Math.min(...vals),hi=Math.max(...vals),r=document.createElementNS('http://www.w3.org/2000/svg','rect');
        if(axis==='x'){r.setAttribute('x',px(lo));r.setAttribute('y',h/2-8);r.setAttribute('width',Math.max(1,px(hi)-px(lo)));r.setAttribute('height',16);} else {r.setAttribute('x',w/2-8);r.setAttribute('y',h/2-hi*h/2);r.setAttribute('width',16);r.setAttribute('height',Math.max(1,(hi-lo)*h/2));}
        r.setAttribute('fill','#788f98');r.setAttribute('stroke','#9bf5ff');r.setAttribute('stroke-width','1.5');r.setAttribute('rx','2');s1.appendChild(r);
        vals.forEach(v=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',axis==='x'?px(v):w/2);c.setAttribute('cy',axis==='x'?h/2:h/2-v*h/2);c.setAttribute('r','2.2');c.setAttribute('fill','#9bf5ff');s1.appendChild(c);});
      }
      const cp=frame.centroid?project(frame.centroid):null;
      if(cp){const d=document.createElementNS('http://www.w3.org/2000/svg','circle');d.setAttribute('cx',w/2+cp.x*w/2);d.setAttribute('cy',h/2-cp.y*h/2);d.setAttribute('r','5');d.setAttribute('fill','#76ff91');s1.appendChild(d);}
      oneHost.appendChild(s1);
      const tw=two.clientWidth,th=two.clientHeight,pts=verts.map(project),s2=svg(tw,th),xy=p=>[tw/2+p.x*tw/2,th/2-p.y*th/2];
      FACES.forEach((face,fi)=>{const pp=face.map(i=>pts[i]).filter(Boolean);if(pp.length!==4)return;const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',pp.map(xy).map(a=>a.join(',')).join(' '));poly.setAttribute('fill','#788f98');poly.setAttribute('fill-opacity',String(.10+fi*.012));poly.setAttribute('stroke','#9bf5ff');poly.setAttribute('stroke-width','1');s2.appendChild(poly);});
      EDGES.forEach(([a,b])=>{if(!pts[a]||!pts[b])return;const l=document.createElementNS('http://www.w3.org/2000/svg','line'),A=xy(pts[a]),B=xy(pts[b]);l.setAttribute('x1',A[0]);l.setAttribute('y1',A[1]);l.setAttribute('x2',B[0]);l.setAttribute('y2',B[1]);l.setAttribute('stroke','#9bf5ff');l.setAttribute('stroke-width','1.4');s2.appendChild(l);});
      pts.filter(Boolean).forEach(p=>{const d=document.createElementNS('http://www.w3.org/2000/svg','circle'),q=xy(p);d.setAttribute('cx',q[0]);d.setAttribute('cy',q[1]);d.setAttribute('r','2');d.setAttribute('fill','#9bf5ff');s2.appendChild(d);});
      if(cp){const d=document.createElementNS('http://www.w3.org/2000/svg','circle');d.setAttribute('cx',tw/2+cp.x*tw/2);d.setAttribute('cy',th/2-cp.y*th/2);d.setAttribute('r','5');d.setAttribute('fill','#76ff91');s2.appendChild(d);}
      twoHost.appendChild(s2);
    };
    const poll=()=>{if(dead)return;if(mount())render();timer=window.setTimeout(poll,500);};
    fetchFrame();poll();
    const onClick=()=>window.setTimeout(render,0),onResize=()=>render();
    document.addEventListener('click',onClick);window.addEventListener('resize',onResize);
    return()=>{dead=true;clearTimeout(timer);ws.close();document.removeEventListener('click',onClick);window.removeEventListener('resize',onResize);restore();};
  },[]);
  return null;
}
