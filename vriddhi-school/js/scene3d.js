/* =========================================================
   Vriddhi School — hero 3D toy box (three.js)
   Alphabet blocks, a clay bunny, a beach ball, a stacking-ring
   toy, a star and a crayon float in the hero. Tap one to make
   it jump. Falls back to the SVG illustration if WebGL fails.
   ========================================================= */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.querySelector('[data-stage]');
if (stage) init().catch((err) => console.warn('3D scene skipped:', err));

async function init() {
  const canvas = stage.querySelector('canvas');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 15);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xbfe6ff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(4, 7, 8);
  scene.add(key);

  // wait (briefly) for the rounded font so block letters use it
  try {
    await Promise.race([
      document.fonts.load('700 160px Fredoka'),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) { /* ignore */ }

  const clay = (color, rough = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });

  /* ----- helpers ----- */
  function letterTexture(ch, bg, fg) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(18, 18, 220, 220);
    g.fillStyle = bg; g.fillRect(30, 30, 196, 196);
    g.fillStyle = fg;
    g.font = '700 160px Fredoka, Nunito, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 128, 142);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function block(chars, bg, fg) {
    const geo = new RoundedBoxGeometry(1.7, 1.7, 1.7, 5, 0.24);
    const mats = chars.map((ch) => new THREE.MeshStandardMaterial({ map: letterTexture(ch, bg, fg), roughness: 0.5 }));
    return new THREE.Mesh(geo, mats);
  }
  function ball() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const cols = ['#FF7A6B', '#FFFFFF', '#FFC93C', '#FFFFFF', '#5AB9EA', '#FFFFFF'];
    cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * (512 / 6), 0, 512 / 6 + 1, 256); });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), clay(0xffffff, 0.4));
    cap.position.y = 0.95; cap.scale.y = 0.4; m.add(cap);
    return m;
  }
  function rings() {
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.36, 40), clay(0xd9a472, 0.6));
    base.position.y = -1.3; grp.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 20), clay(0xe8bc8c, 0.6));
    pole.position.y = -0.1; grp.add(pole);
    const cols = [0xff7a6b, 0xffc93c, 0x7fd8a6, 0x5ab9ea, 0xa78bfa];
    let y = -0.93;
    cols.forEach((col, i) => {
      const R = 0.95 - i * 0.13, r = 0.3 - i * 0.02;
      const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 20, 48), clay(col, 0.45));
      t.rotation.x = Math.PI / 2; t.position.y = y; grp.add(t);
      y += r * 2 - 0.02;
    });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), clay(0xff7a6b, 0.45));
    knob.position.y = y + 0.12; grp.add(knob);
    return grp;
  }
  function star() {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 === 0 ? 1 : 0.5;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 6 });
    geo.center();
    return new THREE.Mesh(geo, clay(0xffc93c, 0.4));
  }
  function crayon() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2, 24), clay(0x5ab9ea, 0.5));
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.248, 0.248, 1.2, 24), clay(0xffffff, 0.7));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 24), clay(0x5ab9ea, 0.5));
    tip.position.y = 1.25;
    const end = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay(0x5ab9ea, 0.5));
    end.position.y = -1;
    grp.add(body, wrap, tip, end);
    return grp;
  }
  function bunny() {
    const grp = new THREE.Group();
    const fur = clay(0xfff6ee, 0.62);
    const pink = clay(0xff9db0, 0.5);
    const dark = clay(0x2b2d42, 0.3);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), fur);
    body.scale.set(1, 0.95, 0.9); grp.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), clay(0xffffff, 0.7));
    belly.position.set(0, -0.12, 0.5); belly.scale.set(1, 1.05, 0.55); grp.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.88, 40, 28), fur);
    head.position.y = 1.3; grp.add(head);
    const ears = new THREE.Group(); ears.position.y = 1.9; grp.add(ears);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.95, 8, 18), fur);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.7, 6, 14), pink);
      inner.position.z = 0.13;
      ear.add(outer, inner);
      ear.position.set(s * 0.36, 0.55, 0);
      ear.rotation.z = -s * 0.16;
      ears.add(ear);
    });
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), dark);
      eye.position.set(s * 0.3, 1.38, 0.78); eye.scale.set(1, 1.2, 0.6); grp.add(eye);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), clay(0xffffff, 0.2));
      glint.position.set(s * 0.3 + 0.03, 1.43, 0.84); grp.add(glint);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff9db0, roughness: 0.6, transparent: true, opacity: 0.7 }));
      cheek.position.set(s * 0.5, 1.14, 0.66); cheek.scale.set(1, 0.6, 0.35); grp.add(cheek);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), fur);
      foot.position.set(s * 0.45, -0.85, 0.35); foot.scale.set(1, 0.6, 1.3); grp.add(foot);
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), fur);
      arm.position.set(s * 0.8, 0.15, 0.45); arm.scale.set(0.8, 1.2, 0.8); grp.add(arm);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), pink);
    nose.position.set(0, 1.2, 0.86); grp.add(nose);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), clay(0xffffff, 0.8));
    tail.position.set(0, -0.35, -0.85); grp.add(tail);
    grp.userData.ears = ears;
    return grp;
  }

  /* ----- build the toy box ----- */
  const toys = new THREE.Group();
  scene.add(toys);
  const items = [];
  function add(obj, pos, scale, opts = {}) {
    obj.position.copy(pos);
    obj.userData = Object.assign(obj.userData || {}, {
      base: pos.clone(),
      scale,
      phase: Math.random() * Math.PI * 2,
      amp: opts.amp ?? 0.18,
      spin: opts.spin ?? new THREE.Vector3(0.12, 0.25, 0.05),
      jump: 0,
      jumpV: 0,
      twirl: 0,
      kind: opts.kind || 'toy',
    });
    obj.rotation.set(opts.rx || 0, opts.ry || 0, opts.rz || 0);
    obj.scale.setScalar(reduce ? scale : 0.0001);
    toys.add(obj);
    items.push(obj);
  }

  add(bunny(), new THREE.Vector3(0.1, -1.3, 0.6), 1.25, { amp: 0.12, spin: new THREE.Vector3(0, 0, 0), kind: 'bunny', ry: -0.25 });
  add(block(['A', 'B', 'C', 'A', 'B', 'C'], '#FF7A6B', '#FFFFFF'), new THREE.Vector3(-2.6, 1.9, -0.8), 1, { rx: 0.4, ry: 0.6 });
  add(block(['1', '2', '3', '1', '2', '3'], '#5AB9EA', '#FFFFFF'), new THREE.Vector3(3.1, 0.6, -1.2), 0.85, { rx: -0.3, ry: -0.5 });
  add(block(['V', 'R', 'I', 'D', 'H', 'I'], '#FFC93C', '#2B2D42'), new THREE.Vector3(-0.2, 3.1, -2.6), 0.75, { rx: 0.2, ry: 0.3 });
  add(ball(), new THREE.Vector3(3.0, -2.4, 0.9), 0.9, { spin: new THREE.Vector3(0.3, 0.5, 0) });
  add(rings(), new THREE.Vector3(-3.1, -1.7, -0.4), 0.8, { amp: 0.1, spin: new THREE.Vector3(0, 0.3, 0), rx: 0.15 });
  if (!small) {
    add(star(), new THREE.Vector3(2.3, 3.0, -1.2), 0.62, { spin: new THREE.Vector3(0.1, 0.6, 0.1) });
    add(crayon(), new THREE.Vector3(-3.9, 0.4, 0.6), 0.85, { rz: -0.9, rx: 0.3, spin: new THREE.Vector3(0.05, 0.2, 0.1) });
  }

  /* ----- sizing ----- */
  let fitScale = 1;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    fitScale = Math.min(1, halfW / 4.9);
    toys.scale.setScalar(fitScale);
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  /* ----- pointer: parallax + tap to jump ----- */
  const mouse = new THREE.Vector2(0, 0);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function rootOf(o) { while (o.parent && o.parent !== toys) o = o.parent; return o; }
  function pick(e) {
    const b = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(items, true)[0];
    return hit ? rootOf(hit.object) : null;
  }
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
  canvas.addEventListener('pointermove', (e) => { stage.classList.toggle('is-hot', !!pick(e)); });
  canvas.addEventListener('pointerdown', (e) => {
    const t = pick(e);
    if (!t) return;
    t.userData.jumpV = 0.16;
    t.userData.twirl = Math.PI * 2;
  });

  /* ----- run only while visible ----- */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(stage);

  const clock = new THREE.Clock();
  let introStart = null;
  const easeOutBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (introStart === null && document.documentElement.classList.contains('ready')) introStart = t;

    items.forEach((o, i) => {
      const u = o.userData;
      // entrance: each toy pops in, one after another
      if (!reduce && introStart !== null) {
        const k = THREE.MathUtils.clamp((t - introStart - 0.25 - i * 0.11) / 1.0, 0, 1);
        o.scale.setScalar(Math.max(0.0001, u.scale * easeOutBack(k)));
      }
      if (reduce) return;
      // gentle float + slow spin
      u.jump += u.jumpV; u.jumpV -= 0.011;
      if (u.jump < 0) { u.jump = 0; u.jumpV = Math.abs(u.jumpV) > 0.03 ? -u.jumpV * 0.35 : 0; }
      o.position.y = u.base.y + Math.sin(t * 0.9 + u.phase) * u.amp + u.jump * 2.2;
      const tw = u.twirl * 0.08; u.twirl -= tw;
      o.rotation.x += u.spin.x * dt;
      o.rotation.y += u.spin.y * dt + tw;
      o.rotation.z += u.spin.z * dt;
      if (u.kind === 'bunny') {
        o.rotation.z = Math.sin(t * 1.2) * 0.06;
        u.acc = (u.acc || 0) + tw;
        o.rotation.y = -0.25 + Math.sin(t * 0.6) * 0.18 + u.acc;
        if (u.ears) u.ears.rotation.z = Math.sin(t * 2.4) * 0.07;
      }
    });

    // camera drifts toward the pointer; toys rise softly as the page scrolls
    camera.position.x += (mouse.x * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    const sy = Math.min(scrollY, innerHeight * 1.2);
    toys.position.y += (sy * 0.0035 - toys.position.y) * 0.08;
    toys.rotation.y += (sy * 0.0006 - toys.rotation.y) * 0.08;

    renderer.render(scene, camera);
  }

  renderer.render(scene, camera);
  stage.classList.add('is-3d');
  frame();
}
