"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OUTFITS } from "@/lib/outfits";

const INK = "#0A0A0A", SKIN = "#F2B88C", SKIN_D = "#DB9C74", HAIR = "#1E1511", HI = "#5E4333";
const { damp } = THREE.MathUtils;
const TAU = Math.PI * 2;

// 3-step toon shading ramp
let GRAD;
const grad = () => GRAD || (GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat); t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })());

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const textTex = (txt, color, font, w = 128, h = 128, stroke) => canvasTex(w, h, (g) => {
  g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  if (stroke) { g.lineWidth = 12; g.lineJoin = "round"; g.strokeStyle = stroke; g.strokeText(txt, w / 2, h / 2); }
  g.fillStyle = color; g.fillText(txt, w / 2, h / 2);
});

const GEO = { sphere: "sphereGeometry", capsule: "capsuleGeometry", box: "boxGeometry", torus: "torusGeometry", cyl: "cylinderGeometry" };

// a toon-shaded part with a black inverted-hull outline
function Part({ kind = "sphere", args, color, position, rotation, scale, ol = 0.06, ...rest }) {
  const G = GEO[kind];
  return (
    <group position={position} rotation={rotation} scale={scale} {...rest}>
      <mesh><G args={args} /><meshToonMaterial color={color} gradientMap={grad()} /></mesh>
      {ol > 0 && <mesh scale={1 + ol}><G args={args} /><meshBasicMaterial color={INK} side={THREE.BackSide} /></mesh>}
    </group>
  );
}
const Flat = ({ kind = "sphere", args, color, position, rotation, scale }) => {
  const G = GEO[kind];
  return <mesh position={position} rotation={rotation} scale={scale}><G args={args} /><meshBasicMaterial color={color} /></mesh>;
};

function Character({ mode, talking, dir, outfit, mouse, userYaw, dragging }) {
  const o = OUTFITS[outfit];
  const tx = useMemo(() => ({
    patch: textTex("</>", "#ffffff", "bold 64px monospace", 128, 64),
    z: textTex("Z", "#F4F1EA", "bold 100px Impact, sans-serif", 128, 128, INK),
    q: textTex("?", "#FF5A1F", "bold 110px Impact, sans-serif", 128, 128, INK),
    sticker: canvasTex(256, 112, (g, w, h) => { g.fillStyle = "#D6FF3F"; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill(); g.stroke(); g.fillStyle = INK; g.font = "bold 62px Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("10/10", w / 2, h / 2 + 4); }),
    star: canvasTex(64, 64, (g) => { g.fillStyle = "#fff"; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 29; const a = (i * Math.PI) / 4 - Math.PI / 2; g.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a)); } g.closePath(); g.fill(); g.stroke(); }),
    flash: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "#fff"); r.addColorStop(0.4, "rgba(255,255,255,.8)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }),
    code: ["</>", "{ }", ";", "()"].map((c, i) => textTex(c, i % 2 ? "#FF5A1F" : "#D6FF3F", "bold 58px monospace", 128, 96, INK)),
  }), []);

  const R = {
    root: useRef(), torso: useRef(), head: useRef(), eyes: useRef(), mouth: useRef(), armR: useRef(), armL: useRef(), legR: useRef(), legL: useRef(),
    shadow: useRef(), laptop: useRef(), phone: useRef(), mug: useRef(), flash: useRef(), sticker: useRef(), q: useRef(),
    zs: useRef([]), codes: useRef([]), sparks: useRef([]), steam: useRef([]),
  };
  const P = useRef({ rootY: 0, rotY: 0, lean: 0, sit: 0, aRx: 0.04, aRz: 0.1, aLx: 0.04, aLz: 0.1, lR: 0, lL: 0, hX: 0, hY: 0, hZ: 0, bob: 0, eyeS: 1 });
  const last = useRef(""); const start = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); const t = state.clock.elapsedTime; const p = P.current;
    if (last.current !== mode) {
      last.current = mode; start.current = t;
      p.rotY = ((p.rotY % TAU) + TAU) % TAU; if (p.rotY > Math.PI) p.rotY -= TAU; // never unwind a full turn
    }
    const mt = t - start.current; const s = Math.sin;
    const T = { rootY: 0, rotY: 0, lean: 0, sit: 0, aRx: 0.04, aRz: 0.1, aLx: 0.04, aLz: 0.1, lR: 0, lL: 0, hX: 0, hY: 0, hZ: 0, bob: s(t * 1.8) * 0.012, eyeS: 1 };
    let k = 8; let followMouse = true; let direct = null;
    switch (mode) {
      case "walk": { const w = s(t * 8); T.rotY = dir * 1.05; T.lR = w * 0.65; T.lL = -w * 0.65; T.aRx = -w * 0.6; T.aLx = w * 0.6; T.bob = Math.abs(Math.cos(t * 8)) * 0.07; k = 16; followMouse = false; break; }
      case "wave": T.rotY = 0.35; T.aRz = 2.6 + s(t * 10) * 0.35; T.aRx = 0; T.hZ = 0.1; break;
      case "dance": T.rotY = s(t * 3) * 0.7; T.aRz = 2.2 + s(t * 8) * 0.5; T.aLz = 2.2 - s(t * 8) * 0.5; T.aRx = T.aLx = -0.2; T.bob = Math.abs(s(t * 6)) * 0.15; T.lR = s(t * 6) * 0.35; T.lL = -s(t * 6) * 0.35; k = 14; break;
      case "held": T.aRz = T.aLz = 2.7; T.lR = s(t * 6) * 0.3; T.lL = -s(t * 6) * 0.3; k = 10; break;
      case "code": T.sit = 1; T.aRx = -0.95 + s(t * 20) * 0.1; T.aLx = -0.95 + s(t * 20 + 2) * 0.1; T.aRz = T.aLz = 0.12; T.hX = 0.22; followMouse = false; break;
      case "phone": T.aRx = T.aLx = -1.2; T.aRz = T.aLz = -0.7; T.hX = 0.3; followMouse = false; break;
      case "coffee": T.aRx = -2.45 + s(t * 1.5) * 0.1; T.aRz = -0.25; T.hX = -0.05; break;
      case "stretch": T.aRz = T.aLz = 2.9 + s(t * 2) * 0.08; T.aRx = T.aLx = 0; T.lean = -0.15 + s(t * 2) * 0.05; break;
      case "jump": { const j = Math.abs(s(t * 4.2)); T.rootY = j * 0.7; T.aRz = T.aLz = 2.5; T.aRx = T.aLx = -0.2; T.lR = T.lL = -0.45 * j; k = 18; followMouse = false; break; }
      case "leap": T.aRz = T.aLz = 2.4; T.aRx = T.aLx = -0.3; T.lR = 0.5; T.lL = -0.3; T.lean = 0.1; followMouse = false; break;
      case "look": T.hY = s(t * 1.8) * 0.8; T.rotY = s(t * 1.8) * 0.35; followMouse = false; break;
      case "sleep": T.sit = 1; T.hX = 0.6; T.hZ = 0.1; T.aRx = T.aLx = -0.4; T.eyeS = 0.08; k = 4; followMouse = false; break;
      case "fit": {
        const u = Math.min(mt / 2.2, 1); const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        direct = e * TAU; // a real 3D turn so the outfit shows from every side
        T.aRz = T.aLz = mt < 2.3 ? 0.9 : 0.35;
        if (mt > 2.3) { T.aRx = -1.25; T.aRz = -0.55; }
        T.hZ = mt > 2.4 ? 0.1 : 0; followMouse = false; break;
      }
      default: break;
    }
    for (const key in T) p[key] = damp(p[key], T[key], k, dt);
    if (direct !== null) p.rotY = direct;

    const mx = followMouse ? mouse.current.x : 0; const my = followMouse ? mouse.current.y : 0;
    if (!dragging.current) { const target = Math.round(userYaw.current / TAU) * TAU; userYaw.current = damp(userYaw.current, target, 1.2, dt); }

    const root = R.root.current; if (!root) return;
    root.position.y = p.rootY + p.bob - p.sit * 0.45;
    root.rotation.set(p.lean, p.rotY + userYaw.current + mx * 0.12, 0);
    R.torso.current.scale.y = 1 + s(t * 2) * 0.012;
    R.armR.current.rotation.set(p.aRx, 0, p.aRz);
    R.armL.current.rotation.set(p.aLx, 0, -p.aLz);
    R.legR.current.rotation.set(p.lR - p.sit * 1.45, 0, -p.sit * 0.12);
    R.legL.current.rotation.set(p.lL - p.sit * 1.45, 0, p.sit * 0.12);
    R.head.current.rotation.set(p.hX + my * 0.22, p.hY + mx * 0.5, p.hZ);

    const blink = t % 4 > 3.86 ? 0.1 : 1;
    R.eyes.current.scale.y = damp(R.eyes.current.scale.y, Math.min(p.eyeS, blink), 30, dt);
    R.mouth.current.scale.y = talking ? 0.55 + 0.45 * Math.abs(s(t * 13)) : mode === "stretch" ? 1.25 + s(t * 2) * 0.2 : 1;
    R.shadow.current.scale.set(1 - p.rootY * 0.35, 1 - p.rootY * 0.35, 1);

    // props
    R.laptop.current.visible = mode === "code";
    const showPhone = mode === "phone" || (mode === "fit" && mt > 2.4);
    R.phone.current.visible = showPhone; R.phone.current.rotation.x = -p.aRx;
    R.mug.current.visible = mode === "coffee"; R.mug.current.rotation.x = -p.aRx;
    R.steam.current.forEach((m, i) => { if (!m) return; const ph = (t * 0.6 + i * 0.33) % 1; m.position.y = 0.1 + ph * 0.35; m.material.opacity = Math.sin(Math.PI * ph) * 0.8; });
    R.zs.current.forEach((m, i) => { if (!m) return; m.visible = mode === "sleep"; const ph = (t * 0.45 + i * 0.33) % 1; m.position.set(0.85 + ph * 0.5 + i * 0.12, 2.6 + ph * 0.9, 0.3); m.material.opacity = Math.sin(Math.PI * ph); m.scale.setScalar(0.35 + i * 0.12); });
    R.codes.current.forEach((m, i) => { if (!m) return; m.visible = mode === "code"; const ph = (t * 0.45 + i * 0.25) % 1; m.position.set(i % 2 ? 1.15 : -1.15, 1.2 + ph * 1.4, 0.4); m.material.opacity = Math.sin(Math.PI * ph); m.scale.set(0.55, 0.41, 1); });
    R.q.current.visible = mode === "look"; R.q.current.position.set(0.95, 3.0 + s(t * 5) * 0.08, 0.3); R.q.current.scale.setScalar(0.55 + s(t * 6) * 0.06);
    R.sparks.current.forEach((m, i) => { if (!m) return; const on = mode === "fit" && mt > 2.8; m.visible = on; if (!on) return; const ph = (t * 0.9 + i * 0.25) % 1; m.material.opacity = Math.sin(Math.PI * ph); m.scale.setScalar(0.25 + 0.3 * Math.sin(Math.PI * ph)); m.material.rotation = ph * 3; });
    const fl = mode === "fit" ? mt - 2.6 : -1; R.flash.current.visible = fl > 0 && fl < 0.5; if (R.flash.current.visible) { R.flash.current.scale.setScalar(0.3 + fl * 4.5); R.flash.current.material.opacity = 1 - fl * 2; }
    const st = mode === "fit" ? mt - 3.0 : -1; R.sticker.current.visible = st > 0; if (st > 0) R.sticker.current.scale.setScalar(Math.min(1, 1 - Math.pow(1 - Math.min(st * 2.5, 1), 3) + Math.sin(st * 14) * 0.04 * Math.max(0, 1 - st)) * 1.0 * 0 + 1.05 * Math.min(1, 1 - Math.pow(1 - Math.min(st * 2.5, 1), 3)));
  });

  const arm = (side, ref) => (
    <group ref={ref} position={[side * 0.5, 1.42, 0]}>
      <Part kind="capsule" args={[0.095, 0.34, 6, 12]} color={o.top} position={[0, -0.27, 0]} />
      <Part kind="sphere" args={[0.115, 16, 12]} color={SKIN} position={[0, -0.55, 0]} ol={0.1} />
      {side > 0 && (
        <>
          <group ref={R.phone} position={[0, -0.6, 0.12]} visible={false}>
            <Part kind="box" args={[0.2, 0.34, 0.035]} color={INK} ol={0} />
            <Flat kind="box" args={[0.17, 0.3, 0.01]} color={mode === "fit" ? "#2a2a2a" : "#F4F1EA"} position={[0, 0, 0.02]} />
            <Flat kind="sphere" args={[0.03, 10, 8]} color="#D6FF3F" position={[0, 0.09, 0.03]} />
          </group>
          <group ref={R.mug} position={[0, -0.6, 0.1]} visible={false}>
            <Part kind="cyl" args={[0.1, 0.085, 0.17, 16]} color="#F4F1EA" />
            <Part kind="torus" args={[0.06, 0.018, 8, 16]} color="#F4F1EA" position={[0.115, 0, 0]} rotation={[0, 0, 0]} ol={0.1} />
            <Flat kind="cyl" args={[0.088, 0.088, 0.01, 16]} color="#7A3B1B" position={[0, 0.082, 0]} />
            {[0, 1, 2].map((i) => (
              <mesh key={i} ref={(m) => (R.steam.current[i] = m)} position={[(i - 1) * 0.05, 0.1, 0]}><sphereGeometry args={[0.03, 8, 6]} /><meshBasicMaterial color="#fff" transparent opacity={0} /></mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
  const leg = (side, ref) => (
    <group ref={ref} position={[side * 0.17, 0.8, 0]}>
      <Part kind="capsule" args={[0.12, 0.34, 6, 12]} color={o.pants} position={[0, -0.27, 0]} />
      <Part kind="sphere" args={[1, 16, 12]} color={o.shoes} position={[0, -0.57, 0.08]} scale={[0.17, 0.11, 0.27]} />
    </group>
  );

  return (
    <>
      <group ref={R.root}>
        <group ref={R.torso}>
          <Part kind="capsule" args={[0.36, 0.1, 8, 20]} color={o.top} position={[0, 1.16, 0]} scale={[1.1, 1, 0.9]} />
          <Part kind="torus" args={[0.28, 0.09, 10, 24]} color={o.top} position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]} ol={0.08} />
          <Flat kind="box" args={[0.4, 0.22, 0.02]} color={o.patch} position={[0, 1.1, 0.345]} />
          <mesh position={[0, 1.1, 0.358]}><planeGeometry args={[0.34, 0.17]} /><meshBasicMaterial map={tx.patch} color={o.patchText} transparent /></mesh>
        </group>
        {arm(1, R.armR)}
        {arm(-1, R.armL)}
        {leg(1, R.legR)}
        {leg(-1, R.legL)}

        <group ref={R.head} position={[0, 2.12, 0]}>
          {/* hair: cap, bob and side locks */}
          <Part kind="sphere" args={[0.74, 32, 24, 0, TAU, 0, Math.PI * 0.53]} color={HAIR} rotation={[-0.45, 0, 0]} ol={0.04} />
          <Part kind="sphere" args={[0.72, 24, 18]} color={HAIR} position={[0, -0.32, -0.2]} scale={[1.05, 1, 0.9]} ol={0.04} />
          <Part kind="capsule" args={[0.17, 0.42, 6, 12]} color={HAIR} position={[-0.64, -0.5, 0.04]} rotation={[0, 0, 0.16]} />
          <Part kind="capsule" args={[0.17, 0.42, 6, 12]} color={HAIR} position={[0.64, -0.5, 0.04]} rotation={[0, 0, -0.16]} />
          {/* face */}
          <Part kind="sphere" args={[1, 32, 24]} color={SKIN} scale={[0.73, 0.65, 0.66]} ol={0.04} />
          <Part kind="sphere" args={[0.5, 24, 16]} color={HAIR} position={[0.12, 0.34, 0.44]} rotation={[0.4, 0, -0.3]} scale={[0.95, 0.38, 0.5]} ol={0.05} />
          <Flat kind="sphere" args={[1, 12, 8]} color="#FF6B4A" position={[-0.42, -0.2, 0.47]} rotation={[0, -0.55, 0]} scale={[0.11, 0.07, 0.02]} />
          <Flat kind="sphere" args={[1, 12, 8]} color="#FF6B4A" position={[0.42, -0.2, 0.47]} rotation={[0, 0.55, 0]} scale={[0.11, 0.07, 0.02]} />
          <group ref={R.eyes}>
            {[-0.25, 0.25].map((x) => (
              <group key={x} position={[x, -0.02, 0.6]}>
                <Flat kind="sphere" args={[1, 16, 12]} color={INK} scale={[0.09, 0.13, 0.04]} />
                <Flat kind="sphere" args={[0.035, 8, 6]} color="#fff" position={[0.03, 0.05, 0.04]} />
                <Flat kind="sphere" args={[0.017, 8, 6]} color="#fff" position={[-0.03, -0.05, 0.04]} />
              </group>
            ))}
          </group>
          {o.shades && (
            <group position={[0, -0.02, 0.64]}>
              <Part kind="sphere" args={[1, 16, 12]} color={INK} position={[-0.25, 0, 0]} scale={[0.17, 0.12, 0.05]} ol={0} />
              <Part kind="sphere" args={[1, 16, 12]} color={INK} position={[0.25, 0, 0]} scale={[0.17, 0.12, 0.05]} ol={0} />
              <Flat kind="box" args={[0.16, 0.03, 0.03]} color={INK} />
            </group>
          )}
          <Flat kind="capsule" args={[0.016, 0.14, 4, 8]} color={HAIR} position={[-0.25, 0.19, 0.57]} rotation={[0, 0, Math.PI / 2 + 0.15]} />
          <Flat kind="capsule" args={[0.016, 0.14, 4, 8]} color={HAIR} position={[0.25, 0.19, 0.57]} rotation={[0, 0, Math.PI / 2 - 0.15]} />
          <Flat kind="sphere" args={[0.035, 8, 6]} color={SKIN_D} position={[0, -0.1, 0.655]} />
          <group ref={R.mouth} position={[0, -0.26, 0.6]}>
            <Flat kind="sphere" args={[1, 16, 12]} color="#4A1410" scale={[0.17, 0.1, 0.04]} />
            <Flat kind="sphere" args={[1, 16, 8]} color="#fff" position={[0, 0.05, 0.02]} scale={[0.14, 0.035, 0.03]} />
            <Flat kind="sphere" args={[1, 12, 8]} color="#FF7A7A" position={[0, -0.05, 0.02]} scale={[0.07, 0.035, 0.03]} />
          </group>
          <Part kind="capsule" args={[0.045, 0.12, 4, 8]} color="#D6FF3F" position={[0.4, 0.4, 0.5]} rotation={[0, 0, 0.7]} ol={0.1} />
        </group>
      </group>

      {/* props & effects that stay in the world */}
      <group ref={R.laptop} position={[0, 0.66, 0.55]} visible={false}>
        <Part kind="box" args={[0.8, 0.06, 0.55]} color="#222222" ol={0.05} />
        <group position={[0, 0.03, -0.26]} rotation={[-0.2, 0, 0]}><Part kind="box" args={[0.8, 0.52, 0.05]} color="#FF5A1F" position={[0, 0.26, 0]} ol={0.04} /></group>
      </group>
      <mesh ref={R.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.05]}><circleGeometry args={[0.62, 32]} /><meshBasicMaterial color="#000" transparent opacity={0.35} /></mesh>
      {[0, 1, 2].map((i) => <sprite key={i} ref={(m) => (R.zs.current[i] = m)} visible={false}><spriteMaterial map={tx.z} transparent /></sprite>)}
      {tx.code.map((map, i) => <sprite key={i} ref={(m) => (R.codes.current[i] = m)} visible={false}><spriteMaterial map={map} transparent /></sprite>)}
      <sprite ref={R.q} visible={false}><spriteMaterial map={tx.q} transparent /></sprite>
      {[[-1.15, 2.7, 0.4], [1.2, 2.4, 0.4], [-1.05, 1.2, 0.4], [1.1, 1.3, 0.4], [0.1, 3.25, 0.2]].map((pos, i) => (
        <sprite key={i} ref={(m) => (R.sparks.current[i] = m)} position={pos} visible={false}><spriteMaterial map={tx.star} transparent color={i % 2 ? "#FF5A1F" : "#D6FF3F"} /></sprite>
      ))}
      <sprite ref={R.flash} position={[0.2, 1.3, 0.9]} visible={false}><spriteMaterial map={tx.flash} transparent depthTest={false} /></sprite>
      <sprite ref={R.sticker} position={[1.0, 2.75, 0.5]} scale={[0, 0, 0]} visible={false}><spriteMaterial map={tx.sticker} transparent /></sprite>
    </>
  );
}

export default function Avatar3D({ mode = "idle", talking = false, dir = 1, outfit = 0, draggable = false }) {
  const mouse = useRef({ x: 0, y: 0 });
  const userYaw = useRef(0);
  const dragging = useRef(false);
  const origin = useRef(null);

  useEffect(() => {
    const move = (e) => { mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2; mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const down = (e) => { if (!draggable) return; dragging.current = true; origin.current = { x: e.clientX, yaw: userYaw.current }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (dragging.current && origin.current) userYaw.current = origin.current.yaw + (e.clientX - origin.current.x) * 0.012; };
  const up = () => { dragging.current = false; };

  return (
    <div style={{ width: "100%", height: "100%", cursor: draggable ? "grab" : undefined, touchAction: draggable ? "pan-y" : "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <Canvas flat dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 1.45, 6.8], fov: 28 }} onCreated={({ camera }) => camera.lookAt(0, 1.45, 0)} style={{ background: "transparent" }}>
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Character mode={mode} talking={talking} dir={dir} outfit={outfit} mouse={mouse} userYaw={userYaw} dragging={dragging} />
      </Canvas>
    </div>
  );
}
