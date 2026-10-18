// SIREN 3D — the siren beacon as a real 3D object (three.js, MIT, self-hosted
// at /media/three.module.min.js). A rotating lamp sweeps a beam around a glass
// dome; the dome glows in the level's colour and spins faster as the level
// rises. Loaded only on capable screens, only when visible, never for
// reduced-motion visitors; the flat illustration stays as the fallback.
const LV = { 5: 0x4fb3ff, 4: 0x4ade80, 3: 0xffd23f, 2: 0xff8a2b, 1: 0xff3b3b };
export async function mount(host) {
  const THREE = await import(new URL('./three.module.min.js', import.meta.url).href);
  const level = Math.min(5, Math.max(1, +host.dataset.level || 4));
  const color = new THREE.Color(LV[level]);
  const size = host.clientWidth || 140;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(size, size);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.set(0, 1.5, 7.6); cam.lookAt(0, 0.45, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);

  // Base: two stacked dark metal discs.
  const metal = new THREE.MeshStandardMaterial({ color: 0x4a515e, metalness: 0.75, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.32, 48), metal); base.position.y = -0.55; scene.add(base);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.22, 48), metal); collar.position.y = -0.28; scene.add(collar);

  // Glass dome in the level's colour, glowing from inside.
  const glass = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.78, roughness: 0.15, metalness: 0, clearcoat: 1 });
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.98, 1.4, 48, 1, false), glass); dome.position.y = 0.53; scene.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.92, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass); cap.position.y = 1.23; scene.add(cap);

  // The lamp: a bright core and a beam (a cone) that rotates with it.
  const rotor = new THREE.Group(); rotor.position.y = 0.55; scene.add(rotor);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); rotor.add(core);
  const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.6, 32, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2; beam.position.x = 1.3; rotor.add(beam);
  const beam2 = beam.clone(); beam2.rotation.z = -Math.PI / 2; beam2.position.x = -1.3; rotor.add(beam2);
  const lamp = new THREE.PointLight(color, 6, 6); rotor.add(lamp);

  // A soft halo behind the dome, so it glows against the black page.
  const g = document.createElement('canvas'); g.width = g.height = 128;
  const gx = g.getContext('2d'); const grd = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.25)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(g), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(4.2, 4.2, 1); halo.position.set(0, 0.6, -0.8); scene.add(halo);

  host.textContent = '';
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const speed = 0.9 + (5 - level) * 0.55; // radians per second
  let last = performance.now(), visible = true, raf = 0;
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); });
  io.observe(host);
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    rotor.rotation.y += dt * speed;
    const pulse = Math.max(0, Math.cos(rotor.rotation.y * 2));
    glass.emissiveIntensity = 0.5 + 0.4 * pulse;
    halo.material.opacity = 0.35 + 0.45 * pulse;
    scene.rotation.y = Math.sin(now / 2600) * 0.25;
    renderer.render(scene, cam);
    if (visible) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
// Auto-mount every [data-siren3d] once it scrolls near view.
const ok = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) && !!window.WebGLRenderingContext;
if (ok()) {
  const hosts = document.querySelectorAll('[data-siren3d]');
  const io = new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { o.unobserve(e.target); mount(e.target).catch(() => {}); } }), { rootMargin: '200px' });
  hosts.forEach((h) => io.observe(h));
}
