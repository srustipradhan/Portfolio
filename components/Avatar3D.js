"use client";
import { memo, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OUTFITS } from "@/lib/outfits";

const INK = "#0A0A0A";
const SKIN = "#F2B88C";
const HAIR = "#1E1511";
const HI = "#5E4333";
const { damp } = THREE.MathUtils;
const TAU = Math.PI * 2;

// Exact coordinate scale mapping the original 400x500 SVG head (center 200, 238, rx=112, ry=104)
const S = 0.72 / 112;
const FACE_RX = 112 * S; // 0.72
const FACE_RY = 104 * S; // ~0.6686
const FACE_RZ = 0.65;
const toX = (sx) => (sx - 200) * S;
const toY = (sy) => (238 - sy) * S;

// 3-step toon shading ramp (universal RGBA format for WebGL1/WebGL2)
let GRAD;
const grad = () =>
  GRAD ||
  (GRAD = (() => {
    const d = new Uint8Array([
      115, 115, 115, 255,
      195, 195, 195, 255,
      255, 255, 255, 255,
    ]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  })());

function canvasTex(w, h, draw) {
  if (typeof document === "undefined") return new THREE.Texture();
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return new THREE.Texture();
  if (!g.roundRect) {
    g.roundRect = function (x, y, rw, rh) {
      this.rect(x, y, rw, rh);
    };
  }
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

const textTex = (txt, color, font, w = 128, h = 128, stroke) =>
  canvasTex(w, h, (g) => {
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (stroke) {
      g.lineWidth = 12;
      g.lineJoin = "round";
      g.strokeStyle = stroke;
      g.strokeText(txt, w / 2, h / 2);
    }
    g.fillStyle = color;
    g.fillText(txt, w / 2, h / 2);
  });

// Build a curved BufferGeometry patch hugging the 3D face ellipsoid surface
function makeFacePatchGeo(sxMin, sxMax, syMin, syMax, zBias = 0.012, segX = 16, segY = 12, originY = 0) {
  const cols = segX + 1;
  const rows = segY + 1;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices = [];

  for (let iy = 0; iy < rows; iy++) {
    const v = iy / segY;
    const sy = syMax - v * (syMax - syMin); // v=0 bottom (syMax), v=1 top (syMin)
    const wy = toY(sy);
    for (let ix = 0; ix < cols; ix++) {
      const u = ix / segX;
      const sx = sxMin + u * (sxMax - sxMin);
      const wx = toX(sx);
      const q = (wx / FACE_RX) ** 2 + (wy / FACE_RY) ** 2;
      const wz = FACE_RZ * Math.sqrt(Math.max(0.02, 1 - Math.min(0.98, q))) + zBias;

      const idx = iy * cols + ix;
      positions[idx * 3] = wx;
      positions[idx * 3 + 1] = wy - originY;
      positions[idx * 3 + 2] = wz;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * cols + ix;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Compute the dome curve offset so sculpted 3D bangs wrap cleanly around the 3D forehead
const bangsDomeZ = (x, y) => {
  const nx = x / 0.84;
  const ny = (y - 0.56) / 0.72;
  const r2 = Math.min(0.96, 0.78 * nx * nx + 0.38 * ny * ny);
  return 0.45 * Math.sqrt(1 - r2) - 0.04;
};

// Build sculpted 3D hair geometries directly from the exact SVG Bezier curves
function buildHairGeometries() {
  const sv = (sx, sy) => [toX(sx), toY(sy)];

  // 1. Front side-swept bangs
  const bangsShape = new THREE.Shape();
  bangsShape.moveTo(...sv(80, 238));
  bangsShape.bezierCurveTo(...sv(66, 118), ...sv(128, 58), ...sv(202, 58));
  bangsShape.bezierCurveTo(...sv(280, 58), ...sv(336, 118), ...sv(320, 238));
  bangsShape.bezierCurveTo(...sv(316, 196), ...sv(292, 160), ...sv(260, 146));
  bangsShape.bezierCurveTo(...sv(234, 134), ...sv(204, 128), ...sv(182, 130));
  bangsShape.bezierCurveTo(...sv(140, 150), ...sv(104, 190), ...sv(80, 238));

  const bangsGeo = new THREE.ExtrudeGeometry(bangsShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 16,
  });
  // Bend vertices around the forehead sphere and seat seamlessly into the crown
  const bPos = bangsGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const x = bPos.getX(i);
    const y = bPos.getY(i);
    const z = bPos.getZ(i);
    bPos.setZ(i, z - 0.18 + bangsDomeZ(x, y));
  }
  bangsGeo.computeVertexNormals();

  // Separate centered outline geometry for bangs so scale expands evenly outward
  const bangsOlGeo = bangsGeo.clone();
  bangsOlGeo.computeBoundingBox();
  const bCenter = new THREE.Vector3();
  bangsOlGeo.boundingBox.getCenter(bCenter);
  bangsOlGeo.translate(-bCenter.x, -bCenter.y, -bCenter.z);

  // 2. Bangs highlight strands (4 curved 3D tubes hugging the front of the bangs)
  const makeHighlight = (pts) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([sx, sy]) => {
        const x = toX(sx);
        const y = toY(sy);
        return new THREE.Vector3(x, y, 0.128 + bangsDomeZ(x, y));
      })
    );
    return new THREE.TubeGeometry(curve, 12, 0.014, 5, false);
  };
  const highlights = [
    makeHighlight([[178, 70], [170, 92], [170, 112], [182, 128]]),
    makeHighlight([[196, 64], [220, 88], [250, 118], [276, 164]]),
    makeHighlight([[214, 62], [244, 84], [276, 112], [298, 156]]),
    makeHighlight([[122, 110], [106, 140], [98, 180], [98, 214]]),
  ];

  // 3. Flared side locks (left & right)
  const leftLockShape = new THREE.Shape();
  leftLockShape.moveTo(...sv(80, 238));
  leftLockShape.bezierCurveTo(...sv(78, 280), ...sv(74, 308), ...sv(64, 336));
  leftLockShape.bezierCurveTo(...sv(84, 346), ...sv(102, 338), ...sv(110, 320));
  leftLockShape.bezierCurveTo(...sv(113, 294), ...sv(109, 266), ...sv(105, 240));
  leftLockShape.closePath();

  const rightLockShape = new THREE.Shape();
  rightLockShape.moveTo(...sv(320, 238));
  rightLockShape.bezierCurveTo(...sv(322, 280), ...sv(326, 308), ...sv(336, 336));
  rightLockShape.bezierCurveTo(...sv(316, 346), ...sv(298, 338), ...sv(290, 320));
  rightLockShape.bezierCurveTo(...sv(287, 294), ...sv(291, 266), ...sv(295, 240));
  rightLockShape.closePath();

  const lockOpts = {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.032,
    bevelSegments: 3,
    curveSegments: 12,
  };
  const makeCenteredLock = (shape) => {
    const geo = new THREE.ExtrudeGeometry(shape, lockOpts);
    geo.computeBoundingBox();
    const c = new THREE.Vector3();
    geo.boundingBox.getCenter(c);
    geo.translate(-c.x, -c.y, -c.z);
    return { geo, center: c };
  };
  const leftLock = makeCenteredLock(leftLockShape);
  const rightLock = makeCenteredLock(rightLockShape);

  // 4. Back flared hair bob
  const backHairShape = new THREE.Shape();
  backHairShape.moveTo(...sv(78, 235));
  backHairShape.bezierCurveTo(...sv(66, 120), ...sv(128, 62), ...sv(200, 62));
  backHairShape.bezierCurveTo(...sv(272, 62), ...sv(334, 120), ...sv(322, 235));
  backHairShape.bezierCurveTo(...sv(324, 285), ...sv(330, 312), ...sv(336, 336));
  backHairShape.bezierCurveTo(...sv(310, 350), ...sv(286, 344), ...sv(276, 324));
  backHairShape.lineTo(...sv(124, 324));
  backHairShape.bezierCurveTo(...sv(114, 344), ...sv(90, 350), ...sv(64, 336));
  backHairShape.bezierCurveTo(...sv(70, 312), ...sv(76, 285), ...sv(78, 235));

  const backHairGeo = new THREE.ExtrudeGeometry(backHairShape, {
    depth: 0.36,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.055,
    bevelSegments: 3,
    curveSegments: 14,
  });
  backHairGeo.computeBoundingBox();
  const bhCenter = new THREE.Vector3();
  backHairGeo.boundingBox.getCenter(bhCenter);
  backHairGeo.translate(-bhCenter.x, -bhCenter.y, -bhCenter.z);

  return {
    bangsGeo,
    bangsOlGeo,
    bCenter,
    highlights,
    leftLock,
    rightLock,
    backHairGeo,
    bhCenter,
  };
}

// Build sculpted 3D bell/A-line hoodie lathe matching M42 198 C40 148 56 124 80 124 ...
function buildHoodieGeo(tall = false) {
  // Centered vertically at 0 so inverted-hull scale expands evenly in Y too
  const h = tall ? 1.15 : 0.72;
  const half = h / 2;
  const pts = [
    new THREE.Vector2(0.0, -half),
    new THREE.Vector2(tall ? 0.64 : 0.56, -half),
    new THREE.Vector2(tall ? 0.62 : 0.54, -half + h * 0.25),
    new THREE.Vector2(0.49, -half + h * 0.55),
    new THREE.Vector2(0.41, -half + h * 0.78),
    new THREE.Vector2(0.28, half),
    new THREE.Vector2(0.0, half),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.computeVertexNormals();
  return geo;
}

const GEO = {
  sphere: "sphereGeometry",
  capsule: "capsuleGeometry",
  box: "boxGeometry",
  torus: "torusGeometry",
  cyl: "cylinderGeometry",
};

// Toon-shaded 3D primitive with black inverted-hull outline
const Part = memo(function Part({ kind = "sphere", args, color, position, rotation, scale, ol = 0.055, ...rest }) {
  const G = GEO[kind];
  return (
    <group position={position} rotation={rotation} scale={scale} {...rest}>
      <mesh>
        <G args={args} />
        <meshToonMaterial color={color} gradientMap={grad()} />
      </mesh>
      {ol > 0 && (
        <mesh scale={1 + ol}>
          <G args={args} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
});

const Flat = memo(function Flat({ kind = "sphere", args, color, position, rotation, scale }) {
  const G = GEO[kind];
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <G args={args} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
});

const initPose = () => ({
  rootY: 0,
  leanX: 0,
  leanZ: 0,
  sit: 0,
  aRx: 0.04,
  aRz: 0.28,
  aLx: 0.04,
  aLz: 0.28,
  lR: 0,
  lL: 0,
  hX: 0,
  hY: 0,
  hZ: 0,
  bob: 0,
  eyeS: 1,
  eyeX: 0,
  eyeY: 0,
});

const CharacterModel = memo(function CharacterModel({ mode, talking, dir, outfit, variant, mouseRef }) {
  const o = OUTFITS[outfit] || OUTFITS[0];
  const isBust = variant === "bust";

  // Precompute all 3D geometries & face textures once
  const assets = useMemo(() => {
    const hair = buildHairGeometries();
    const hoodieFullGeo = buildHoodieGeo(false);
    const hoodieBustGeo = buildHoodieGeo(true);

    // Curved spherical patches mapped to exact SVG face positions
    const faceBaseGeo = makeFacePatchGeo(100, 300, 180, 295, 0.008, 20, 14, 0);
    const eyeLeftGeo = makeFacePatchGeo(134, 182, 220, 276, 0.016, 10, 10, toY(248));
    const eyeRightGeo = makeFacePatchGeo(218, 266, 220, 276, 0.016, 10, 10, toY(248));
    const mouthGeo = makeFacePatchGeo(156, 244, 286, 342, 0.014, 14, 10, toY(294));

    // Face base texture: coral blush cheeks + curved eyebrows + curved nose (exact SVG paths)
    const faceBaseTex = canvasTex(512, 294, (g) => {
      g.save();
      g.scale(512 / 200, 294 / 115);
      g.translate(-100, -180);

      // Cheeks
      g.save();
      g.globalAlpha = 0.5;
      g.fillStyle = "#FF6B4A";
      g.beginPath();
      g.ellipse(128, 286, 21, 13, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(272, 286, 21, 13, 0, 0, TAU);
      g.fill();
      g.restore();

      // Eyebrows
      g.strokeStyle = HAIR;
      g.lineWidth = 7;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(136, 206);
      g.quadraticCurveTo(158, 192, 182, 204);
      g.stroke();
      g.beginPath();
      g.moveTo(218, 204);
      g.quadraticCurveTo(242, 192, 264, 206);
      g.stroke();

      // Nose
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(196, 272);
      g.quadraticCurveTo(200, 277, 205, 273);
      g.stroke();

      g.restore();
    });

    // Eye texture (exact SVG oval eye + 2 white sparkles)
    const makeEyeTex = () =>
      canvasTex(160, 186, (g) => {
        g.save();
        g.scale(160 / 48, 186 / 56);
        g.translate(24, 28);

        g.fillStyle = INK;
        g.beginPath();
        g.ellipse(0, 0, 17, 22, 0, 0, TAU);
        g.fill();

        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(5, -8, 7, 0, TAU);
        g.fill();
        g.beginPath();
        g.arc(-6, 8, 3.5, 0, TAU);
        g.fill();

        g.restore();
      });

    // Mouth texture (exact SVG D-shaped happy smile with white teeth, pink tongue, thick black outline)
    const mouthTex = canvasTex(256, 162, (g) => {
      g.save();
      g.scale(256 / 88, 162 / 56);
      g.translate(-156, -286);

      const drawMouthPath = () => {
        g.beginPath();
        g.moveTo(164, 294);
        g.quadraticCurveTo(200, 350, 236, 294);
        g.closePath();
      };

      drawMouthPath();
      g.fillStyle = "#4A1410";
      g.fill();

      g.save();
      drawMouthPath();
      g.clip();

      // White teeth
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(160, 290);
      g.lineTo(240, 290);
      g.lineTo(240, 304);
      g.quadraticCurveTo(200, 314, 160, 304);
      g.closePath();
      g.fill();

      // Pink tongue
      g.fillStyle = "#FF7A7A";
      g.beginPath();
      g.ellipse(200, 334, 22, 13, 0, 0, TAU);
      g.fill();
      g.restore();

      // Black outline
      drawMouthPath();
      g.strokeStyle = INK;
      g.lineWidth = 4.5;
      g.lineJoin = "round";
      g.lineCap = "round";
      g.stroke();

      g.restore();
    });

    // Bust phone screen texture (matches Character.js orange header, bars, lime CTA pill)
    const bustPhoneTex = canvasTex(128, 256, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 128, 256);
      g.fillStyle = "#FF5A1F";
      g.beginPath();
      g.roundRect(14, 18, 100, 56, 12);
      g.fill();
      g.fillStyle = INK;
      g.beginPath();
      g.roundRect(14, 92, 82, 16, 8);
      g.fill();
      g.fillStyle = "rgba(10,10,10,0.35)";
      g.beginPath();
      g.roundRect(14, 124, 72, 16, 8);
      g.fill();
      g.beginPath();
      g.roundRect(14, 156, 90, 16, 8);
      g.fill();
      g.fillStyle = "#D6FF3F";
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.beginPath();
      g.roundRect(14, 192, 100, 34, 17);
      g.fill();
      g.stroke();
    });

    const tx = {
      patch: textTex("</>", "#ffffff", "bold 64px monospace", 128, 64),
      z: textTex("Z", "#F4F1EA", "bold 100px Impact, sans-serif", 128, 128, INK),
      q: textTex("?", "#FF5A1F", "bold 110px Impact, sans-serif", 128, 128, INK),
      sticker: canvasTex(256, 112, (g, w, h) => {
        g.fillStyle = "#D6FF3F";
        g.strokeStyle = INK;
        g.lineWidth = 10;
        g.beginPath();
        g.roundRect(8, 8, w - 16, h - 16, 40);
        g.fill();
        g.stroke();
        g.fillStyle = INK;
        g.font = "bold 62px Impact, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("10/10", w / 2, h / 2 + 4);
      }),
      star: canvasTex(64, 64, (g) => {
        g.fillStyle = "#fff";
        g.strokeStyle = INK;
        g.lineWidth = 3;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? 7 : 29;
          const a = (i * Math.PI) / 4 - Math.PI / 2;
          g.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a));
        }
        g.closePath();
        g.fill();
        g.stroke();
      }),
      flash: canvasTex(128, 128, (g) => {
        const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        r.addColorStop(0, "#fff");
        r.addColorStop(0.4, "rgba(255,255,255,.8)");
        r.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = r;
        g.fillRect(0, 0, 128, 128);
      }),
      code: ["</>", "{ }", ";", "()"].map((c, i) =>
        textTex(c, i % 2 ? "#FF5A1F" : "#D6FF3F", "bold 58px monospace", 128, 96, INK)
      ),
      faceBaseTex,
      eyeTex: makeEyeTex(),
      mouthTex,
      bustPhoneTex,
    };

    return {
      hair,
      hoodieFullGeo,
      hoodieBustGeo,
      faceBaseGeo,
      eyeLeftGeo,
      eyeRightGeo,
      mouthGeo,
      tx,
    };
  }, []);

  useEffect(() => {
    return () => {
      const { hair, hoodieFullGeo, hoodieBustGeo, faceBaseGeo, eyeLeftGeo, eyeRightGeo, mouthGeo, tx } = assets;
      hair.bangsGeo.dispose();
      hair.bangsOlGeo.dispose();
      hair.backHairGeo.dispose();
      hair.leftLock.geo.dispose();
      hair.rightLock.geo.dispose();
      hair.highlights.forEach((g) => g.dispose());
      hoodieFullGeo.dispose();
      hoodieBustGeo.dispose();
      faceBaseGeo.dispose();
      eyeLeftGeo.dispose();
      eyeRightGeo.dispose();
      mouthGeo.dispose();
      [tx.patch, tx.z, tx.q, tx.sticker, tx.star, tx.flash, tx.faceBaseTex, tx.eyeTex, tx.mouthTex, tx.bustPhoneTex].forEach((t) =>
        t?.dispose()
      );
      tx.code.forEach((t) => t?.dispose());
    };
  }, [assets]);

  const rootRef = useRef(null);
  const torsoRef = useRef(null);
  const headRef = useRef(null);
  const eyeTrackRef = useRef(null);
  const eyesBlinkRef = useRef(null);
  const mouthRef = useRef(null);
  const armRRef = useRef(null);
  const armLRef = useRef(null);
  const legRRef = useRef(null);
  const legLRef = useRef(null);
  const shadowRef = useRef(null);
  const laptopRef = useRef(null);
  const phoneRef = useRef(null);
  const mugRef = useRef(null);
  const flashRef = useRef(null);
  const stickerRef = useRef(null);
  const qRef = useRef(null);
  const steamRefs = useRef([]);
  const zsRefs = useRef([]);
  const codesRefs = useRef([]);
  const sparksRefs = useRef([]);

  const poseRef = useRef(initPose());
  const targetRef = useRef(initPose());
  const lastModeRef = useRef("");
  const startRef = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const p = poseRef.current;

    if (lastModeRef.current !== mode) {
      lastModeRef.current = mode;
      startRef.current = t;
    }
    const mt = t - startRef.current;
    const s = Math.sin;

    // Default forward-facing pose: ZERO flipping, ZERO turning (reuse target object to avoid GC churn)
    const T = targetRef.current;
    T.rootY = 0;
    T.leanX = 0;
    T.leanZ = 0;
    T.sit = 0;
    T.aRx = 0.04;
    T.aRz = 0.28;
    T.aLx = 0.04;
    T.aLz = 0.28;
    T.lR = 0;
    T.lL = 0;
    T.hX = 0;
    T.hY = 0;
    T.hZ = 0;
    T.bob = s(t * 1.8) * (isBust ? 0.025 : 0.012);
    T.eyeS = 1;
    T.eyeX = 0;
    T.eyeY = 0;
    let k = 8;
    let followMouse = true;

    if (isBust) {
      // Bust portrait matching Character.js: waving left arm (screen-left) & holding phone on right (screen-right)
      T.aLz = 2.25 + s(t * 5.2) * 0.22; // -aLz rotates arm up-left
      T.aLx = 0;
      T.aRz = 1.95; // +aRz rotates arm out-right to hold phone at shoulder/cheek level
      T.aRx = 0;
    } else {
      switch (mode) {
        case "walk": {
          // Walk smoothly facing forward (NO turning sideways or flipping)
          const w = s(t * 8);
          T.lR = w * 0.52;
          T.lL = -w * 0.52;
          T.aRx = -w * 0.48;
          T.aLx = w * 0.48;
          T.bob = Math.abs(Math.cos(t * 8)) * 0.06;
          T.leanZ = -dir * 0.035 + w * 0.025;
          T.eyeX = dir * 0.42;
          k = 16;
          followMouse = false;
          break;
        }
        case "wave":
          T.aRz = 2.4 + s(t * 10) * 0.28;
          T.aRx = -0.45;
          T.hZ = 0.08;
          break;
        case "dance":
          // Cheerful dance facing front (no turning)
          T.aRz = 2.1 + s(t * 8) * 0.45;
          T.aLz = 2.1 - s(t * 8) * 0.45;
          T.aRx = T.aLx = -0.2;
          T.bob = Math.abs(s(t * 6)) * 0.14;
          T.leanZ = s(t * 3) * 0.08;
          T.lR = s(t * 6) * 0.32;
          T.lL = -s(t * 6) * 0.32;
          k = 14;
          break;
        case "held":
          T.aRz = T.aLz = 2.55;
          T.lR = s(t * 6) * 0.28;
          T.lL = -s(t * 6) * 0.28;
          k = 10;
          break;
        case "code":
          T.sit = 1;
          T.aRx = -0.95 + s(t * 20) * 0.1;
          T.aLx = -0.95 + s(t * 20 + 2) * 0.1;
          T.aRz = T.aLz = 0.12;
          T.hX = 0.18;
          T.eyeY = 0.45;
          followMouse = false;
          break;
        case "phone":
          T.aRx = T.aLx = -1.2;
          T.aRz = T.aLz = -0.65;
          T.hX = 0.22;
          T.eyeY = 0.45;
          followMouse = false;
          break;
        case "coffee":
          T.aRx = -2.35 + s(t * 1.5) * 0.08;
          T.aRz = -0.25;
          T.hX = -0.05;
          T.eyeY = -0.25;
          break;
        case "stretch":
          T.aRz = T.aLz = 2.8 + s(t * 2) * 0.08;
          T.aRx = T.aLx = -0.1;
          T.leanX = -0.12 + s(t * 2) * 0.04;
          break;
        case "jump": {
          // Happy jump in place — NO flip
          const j = Math.abs(s(t * 4.2));
          T.rootY = j * 0.42;
          T.aRz = T.aLz = 2.45;
          T.aRx = T.aLx = -0.2;
          T.lR = T.lL = -0.4 * j;
          k = 18;
          followMouse = false;
          break;
        }
        case "leap":
          // Smooth arc leap to platform — NO front flip
          T.aRz = T.aLz = 2.35;
          T.aRx = T.aLx = -0.25;
          T.lR = 0.35;
          T.lL = -0.2;
          T.leanX = 0.08;
          followMouse = false;
          break;
        case "look":
          // Curious eye & subtle head tilt left/right — NO turning away
          T.eyeX = s(t * 2.4) * 0.75;
          T.hZ = s(t * 1.8) * 0.08;
          T.hY = s(t * 1.8) * 0.12;
          followMouse = false;
          break;
        case "sleep":
          T.sit = 1;
          T.hX = 0.35;
          T.hZ = 0.08;
          T.aRx = T.aLx = -0.35;
          T.eyeS = 0.08;
          k = 4;
          followMouse = false;
          break;
        case "fit":
          // Outfit pose facing forward (flash + sparkles + selfie phone + 10/10 sticker) — NO 360 spin
          T.aRz = T.aLz = mt < 1.2 ? 0.75 : 0.35;
          if (mt >= 1.2) {
            T.aRx = -1.25;
            T.aRz = -0.5;
          }
          T.hZ = mt > 1.3 ? 0.08 : 0;
          T.bob = Math.abs(s(t * 3.5)) * 0.04;
          followMouse = false;
          break;
        default:
          break;
      }
    }

    for (const key in T) p[key] = damp(p[key], T[key], k, dt);

    const mx = followMouse ? mouseRef.current.x : 0;
    const my = followMouse ? mouseRef.current.y : 0;

    const root = rootRef.current;
    if (!root) return;

    // Keep rotY strictly near 0 (subtle parallax at most, never turning away)
    root.position.y = p.rootY + p.bob - p.sit * 0.4;
    root.rotation.set(p.leanX, 0, p.leanZ);

    if (torsoRef.current) torsoRef.current.scale.y = 1 + s(t * 2) * 0.012;
    if (armRRef.current) armRRef.current.rotation.set(p.aRx, 0, p.aRz);
    if (armLRef.current) armLRef.current.rotation.set(p.aLx, 0, -p.aLz);
    if (legRRef.current) legRRef.current.rotation.set(p.lR - p.sit * 1.45, 0, -p.sit * 0.12);
    if (legLRef.current) legLRef.current.rotation.set(p.lL - p.sit * 1.45, 0, p.sit * 0.12);

    // Subtle mouse-follow head tilt (no turning sideways)
    if (headRef.current) {
      headRef.current.rotation.set(p.hX + my * 0.08, p.hY + mx * 0.08, p.hZ + mx * -0.07);
    }

    // Smooth spherical eye tracking + blinking
    if (eyeTrackRef.current) {
      const ex = followMouse ? mx : p.eyeX;
      const ey = followMouse ? my : p.eyeY;
      eyeTrackRef.current.rotation.set(ey * 0.045, ex * 0.065, 0);
    }

    const blink = t % 4 > 3.86 ? 0.08 : 1;
    if (eyesBlinkRef.current) {
      eyesBlinkRef.current.scale.y = damp(eyesBlinkRef.current.scale.y, Math.min(p.eyeS, blink), 30, dt);
    }

    if (mouthRef.current) {
      mouthRef.current.scale.y = talking
        ? 0.55 + 0.45 * Math.abs(s(t * 13))
        : mode === "stretch"
        ? 1.2 + s(t * 2) * 0.15
        : 1;
    }

    if (shadowRef.current) {
      shadowRef.current.scale.set(1 - p.rootY * 0.35, 1 - p.rootY * 0.35, 1);
    }

    // Props (only run sprite trigonometry when active)
    if (laptopRef.current) laptopRef.current.visible = !isBust && mode === "code";
    const showPhone = isBust || mode === "phone" || (mode === "fit" && mt > 1.2);
    if (phoneRef.current) {
      phoneRef.current.visible = showPhone;
      if (showPhone) {
        if (isBust) {
          phoneRef.current.rotation.set(0, 0, -p.aRz - 0.17);
        } else {
          phoneRef.current.rotation.set(-p.aRx, 0, 0);
        }
      }
    }
    const showCoffee = !isBust && mode === "coffee";
    if (mugRef.current) {
      mugRef.current.visible = showCoffee;
      if (showCoffee) {
        mugRef.current.rotation.x = -p.aRx;
        for (let i = 0; i < steamRefs.current.length; i++) {
          const m = steamRefs.current[i];
          if (!m) continue;
          const ph = (t * 0.6 + i * 0.33) % 1;
          m.position.y = 0.1 + ph * 0.35;
          if (m.material) m.material.opacity = s(Math.PI * ph) * 0.8;
        }
      }
    }
    const showSleep = !isBust && mode === "sleep";
    for (let i = 0; i < zsRefs.current.length; i++) {
      const m = zsRefs.current[i];
      if (!m) continue;
      if (m.visible !== showSleep) m.visible = showSleep;
      if (!showSleep) continue;
      const ph = (t * 0.45 + i * 0.33) % 1;
      m.position.set(0.65 + ph * 0.28 + i * 0.08, 2.35 + ph * 0.8, 0.3);
      if (m.material) m.material.opacity = s(Math.PI * ph);
      m.scale.setScalar(0.35 + i * 0.12);
    }
    const showCode = !isBust && mode === "code";
    for (let i = 0; i < codesRefs.current.length; i++) {
      const m = codesRefs.current[i];
      if (!m) continue;
      if (m.visible !== showCode) m.visible = showCode;
      if (!showCode) continue;
      const ph = (t * 0.45 + i * 0.25) % 1;
      m.position.set(i % 2 ? 0.95 : -0.95, 1.15 + ph * 1.4, 0.4);
      if (m.material) m.material.opacity = s(Math.PI * ph);
      m.scale.set(0.55, 0.41, 1);
    }
    const showLook = !isBust && mode === "look";
    if (qRef.current) {
      if (qRef.current.visible !== showLook) qRef.current.visible = showLook;
      if (showLook) {
        qRef.current.position.set(0.82, 2.95 + s(t * 5) * 0.08, 0.3);
        qRef.current.scale.setScalar(0.55 + s(t * 6) * 0.06);
      }
    }
    const showSparks = !isBust && mode === "fit" && mt > 1.5;
    for (let i = 0; i < sparksRefs.current.length; i++) {
      const m = sparksRefs.current[i];
      if (!m) continue;
      if (m.visible !== showSparks) m.visible = showSparks;
      if (!showSparks) continue;
      const ph = (t * 0.9 + i * 0.25) % 1;
      if (m.material) {
        m.material.opacity = s(Math.PI * ph);
        m.material.rotation = ph * 3;
      }
      m.scale.setScalar(0.25 + 0.3 * s(Math.PI * ph));
    }
    const fl = !isBust && mode === "fit" ? mt - 1.35 : -1;
    if (flashRef.current) {
      flashRef.current.visible = fl > 0 && fl < 0.5;
      if (flashRef.current.visible) {
        flashRef.current.scale.setScalar(0.3 + fl * 4.5);
        if (flashRef.current.material) flashRef.current.material.opacity = 1 - fl * 2;
      }
    }
    const st = !isBust && mode === "fit" ? mt - 1.75 : -1;
    if (stickerRef.current) {
      stickerRef.current.visible = st > 0;
      if (st > 0) {
        stickerRef.current.scale.setScalar(
          1.05 * Math.min(1, 1 - Math.pow(1 - Math.min(st * 2.5, 1), 3))
        );
      }
    }
  });

  const { hair, hoodieFullGeo, hoodieBustGeo, faceBaseGeo, eyeLeftGeo, eyeRightGeo, mouthGeo, tx } = assets;
  const hoodieGeo = isBust ? hoodieBustGeo : hoodieFullGeo;
  const torsoY = isBust ? 0.72 : 1.02;

  const legParts = (
    <>
      <Part kind="capsule" args={[0.11, 0.28, 6, 12]} color={o.pants} position={[0, -0.24, 0]} ol={0.075} />
      <Part
        kind="sphere"
        args={[1, 16, 12]}
        color={o.shoes}
        position={[0, -0.50, 0.06]}
        scale={[0.16, 0.105, 0.24]}
        ol={0.075}
      />
    </>
  );

  const armParts = (
    <>
      <Part kind="capsule" args={[0.105, 0.34, 6, 12]} color={o.top} position={[0, -0.25, 0]} ol={0.075} />
      <Part kind="sphere" args={[0.125, 16, 12]} color={SKIN} position={[0, -0.52, 0]} ol={0.095} />
    </>
  );

  return (
    <>
      <group ref={rootRef}>
        {/* Neck */}
        <Part kind="cyl" args={[0.15, 0.16, 0.26, 16]} color={SKIN} position={[0, 1.36, 0]} ol={0.06} />

        {/* A-line sculpted 3D hoodie */}
        <group ref={torsoRef}>
          <group position={[0, torsoY, 0]} scale={[1.0, 1.0, 0.76]}>
            <mesh geometry={hoodieGeo}>
              <meshToonMaterial color={o.top} gradientMap={grad()} />
            </mesh>
            <mesh geometry={hoodieGeo} scale={[1.055, 1.05, 1.06]}>
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
          </group>
          <Part
            kind="torus"
            args={[0.25, 0.06, 10, 24]}
            color={o.top}
            position={[0, 1.34, 0.02]}
            rotation={[Math.PI / 2 + 0.18, 0, 0]}
            ol={0.08}
          />
          <group position={[0, 1.02, 0.42]} rotation={[-0.18, 0, 0]}>
            <Flat kind="box" args={[0.42, 0.24, 0.02]} color={o.patch} position={[0, 0, 0]} />
            <mesh position={[0, 0, 0.013]}>
              <planeGeometry args={[0.36, 0.18]} />
              <meshBasicMaterial map={tx.patch} color={o.patchText} transparent />
            </mesh>
          </group>
        </group>

        <group ref={armRRef} position={[0.49, 1.24, isBust ? 0.22 : 0.16]}>
          {armParts}
          <group ref={phoneRef} position={[isBust ? 0.02 : 0, isBust ? -0.58 : -0.56, isBust ? 0.06 : 0.12]} visible={false}>
            <Part kind="box" args={isBust ? [0.34, 0.62, 0.05] : [0.2, 0.34, 0.035]} color={INK} ol={0} />
            {isBust ? (
              <mesh position={[0, 0, 0.028]}>
                <planeGeometry args={[0.29, 0.56]} />
                <meshBasicMaterial map={tx.bustPhoneTex} />
              </mesh>
            ) : (
              <>
                <Flat
                  kind="box"
                  args={[0.17, 0.3, 0.01]}
                  color={mode === "fit" ? "#2a2a2a" : "#F4F1EA"}
                  position={[0, 0, 0.02]}
                />
                <Flat kind="sphere" args={[0.03, 10, 8]} color="#D6FF3F" position={[0, 0.09, 0.03]} />
              </>
            )}
          </group>
          <group ref={mugRef} position={[0, -0.56, 0.1]} visible={false}>
            <Part kind="cyl" args={[0.1, 0.085, 0.17, 16]} color="#F4F1EA" />
            <Part kind="torus" args={[0.06, 0.018, 8, 16]} color="#F4F1EA" position={[0.115, 0, 0]} ol={0.1} />
            <Flat kind="cyl" args={[0.088, 0.088, 0.01, 16]} color="#7A3B1B" position={[0, 0.082, 0]} />
            {[0, 1, 2].map((i) => (
              <mesh key={i} ref={(m) => (steamRefs.current[i] = m)} position={[(i - 1) * 0.05, 0.1, 0]}>
                <sphereGeometry args={[0.03, 8, 6]} />
                <meshBasicMaterial color="#fff" transparent opacity={0} />
              </mesh>
            ))}
          </group>
        </group>

        <group ref={armLRef} position={[-0.49, 1.24, isBust ? 0.22 : 0.16]}>
          {armParts}
        </group>

        {!isBust && (
          <>
            <group ref={legRRef} position={[0.16, 0.68, 0]}>
              {legParts}
            </group>
            <group ref={legLRef} position={[-0.16, 0.68, 0]}>
              {legParts}
            </group>
          </>
        )}

        {/* Head & exact 3D sculpted hair + exact face features */}
        <group ref={headRef} position={[0, 2.02, 0]}>
          {/* 3D Back hair crown sphere + extruded flared bob */}
          <Part
            kind="sphere"
            args={[0.74, 24, 18]}
            color={HAIR}
            position={[0, 0.34, -0.16]}
            scale={[1.06, 1.12, 0.94]}
            ol={0.045}
          />
          <group position={[hair.bhCenter.x, hair.bhCenter.y, -0.26]}>
            <mesh geometry={hair.backHairGeo}>
              <meshToonMaterial color={HAIR} gradientMap={grad()} />
            </mesh>
            <mesh geometry={hair.backHairGeo} scale={[1.045, 1.045, 1.05]}>
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
          </group>

          {/* 3D Face ellipsoid with toon shading and crisp black outline */}
          <Part
            kind="sphere"
            args={[1, 28, 22]}
            color={SKIN}
            scale={[FACE_RX, FACE_RY, FACE_RZ]}
            ol={0.045}
          />

          {/* Curved face features hugging the 3D sphere surface */}
          <mesh geometry={faceBaseGeo}>
            <meshBasicMaterial map={tx.faceBaseTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>

          {/* Mouse-tracking & blinking eyes */}
          <group ref={eyeTrackRef}>
            <group ref={eyesBlinkRef} position={[0, toY(248), 0]}>
              <mesh geometry={eyeLeftGeo}>
                <meshBasicMaterial map={tx.eyeTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
              </mesh>
              <mesh geometry={eyeRightGeo}>
                <meshBasicMaterial map={tx.eyeTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
              </mesh>
            </group>
          </group>

          {/* Sunglasses for Outfit 4 */}
          {o.shades && (
            <group position={[0, toY(248), 0.66]}>
              <Part kind="box" args={[0.42, 0.30, 0.05]} color={INK} position={[toX(158), 0, 0]} ol={0} />
              <Part kind="box" args={[0.42, 0.30, 0.05]} color={INK} position={[toX(242), 0, 0]} ol={0} />
              <Flat kind="box" args={[0.16, 0.045, 0.04]} color={INK} />
              <Flat kind="box" args={[0.15, 0.03, 0.01]} color="#ffffff" position={[toX(150), 0.07, 0.03]} />
              <Flat kind="box" args={[0.15, 0.03, 0.01]} color="#ffffff" position={[toX(234), 0.07, 0.03]} />
            </group>
          )}

          {/* Animated D-shaped smile anchored at top lip */}
          <group ref={mouthRef} position={[0, toY(294), 0]}>
            <mesh geometry={mouthGeo}>
              <meshBasicMaterial map={tx.mouthTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
          </group>

          {/* Sculpted 3D side-swept bangs curved across the forehead */}
          <mesh geometry={hair.bangsGeo}>
            <meshToonMaterial color={HAIR} gradientMap={grad()} />
          </mesh>
          <mesh
            geometry={hair.bangsOlGeo}
            position={[hair.bCenter.x, hair.bCenter.y, hair.bCenter.z]}
            scale={[1.045, 1.045, 1.12]}
          >
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
          {hair.highlights.map((geo, i) => (
            <mesh key={i} geometry={geo}>
              <meshBasicMaterial color={HI} />
            </mesh>
          ))}

          {/* Flared 3D side locks framing the cheeks */}
          {[hair.leftLock, hair.rightLock].map((lock, i) => (
            <group key={i} position={[lock.center.x, lock.center.y, 0.10]}>
              <mesh geometry={lock.geo}>
                <meshToonMaterial color={HAIR} gradientMap={grad()} />
              </mesh>
              <mesh geometry={lock.geo} scale={[1.08, 1.06, 1.14]}>
                <meshBasicMaterial color={INK} side={THREE.BackSide} />
              </mesh>
            </group>
          ))}

          {/* 3D Lime Hair Clip at exact SVG position (262, 150), -28deg tilt */}
          <Part
            kind="capsule"
            args={[0.048, 0.14, 6, 12]}
            color="#D6FF3F"
            position={[toX(262), toY(150), 0.14 + bangsDomeZ(toX(262), toY(150))]}
            rotation={[0.25, 0.25, Math.PI / 2 + (28 * Math.PI) / 180]}
            ol={0.14}
          />
        </group>
      </group>

      {/* Props & effects in world space (full mascot mode) */}
      <group ref={laptopRef} position={[0, 0.49, 0.68]} visible={false}>
        <Part kind="box" args={[0.78, 0.06, 0.42]} color="#181818" ol={0.05} />
        <group position={[0, 0.03, 0.19]} rotation={[-0.16, 0, 0]}>
          <Part kind="box" args={[0.76, 0.38, 0.045]} color="#181818" position={[0, 0.19, 0]} ol={0.05} />
          <Flat kind="sphere" args={[0.052, 16, 12]} color="#ffffff" position={[0, 0.19, 0.026]} scale={[1, 1, 0.3]} />
        </group>
      </group>
      {!isBust && (
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.05]}>
          <circleGeometry args={[0.62, 24]} />
          <meshBasicMaterial color="#000" transparent opacity={0.35} />
        </mesh>
      )}
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(m) => (zsRefs.current[i] = m)} visible={false}>
          <spriteMaterial map={tx.z} transparent />
        </sprite>
      ))}
      {tx.code.map((map, i) => (
        <sprite key={i} ref={(m) => (codesRefs.current[i] = m)} visible={false}>
          <spriteMaterial map={map} transparent />
        </sprite>
      ))}
      <sprite ref={qRef} visible={false}>
        <spriteMaterial map={tx.q} transparent />
      </sprite>
      {[
        [-0.95, 2.7, 0.4],
        [0.95, 2.4, 0.4],
        [-0.9, 1.2, 0.4],
        [0.9, 1.3, 0.4],
        [0.1, 3.3, 0.2],
      ].map((pos, i) => (
        <sprite key={i} ref={(m) => (sparksRefs.current[i] = m)} position={pos} visible={false}>
          <spriteMaterial map={tx.star} transparent color={i % 2 ? "#FF5A1F" : "#D6FF3F"} />
        </sprite>
      ))}
      <sprite ref={flashRef} position={[0.2, 1.3, 0.9]} visible={false}>
        <spriteMaterial map={tx.flash} transparent depthTest={false} />
      </sprite>
      <sprite ref={stickerRef} position={[0.75, 2.8, 0.5]} scale={[0, 0, 0]} visible={false}>
        <spriteMaterial map={tx.sticker} transparent />
      </sprite>
    </>
  );
});

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const CAM_BUST = [0, 1.82, 6.2];
const CAM_FULL = [0, 1.82, 7.7];
const GL_OPTS = { alpha: true, antialias: true };
const CANVAS_STYLE = { background: "transparent" };
const WRAP_STYLE = { width: "100%", height: "100%", userSelect: "none", WebkitUserSelect: "none" };
const EMPTY_STYLE = { width: "100%", height: "100%" };

const Avatar3D = memo(function Avatar3D({
  mode = "idle",
  talking = false,
  dir = 1,
  outfit = 0,
  variant = "full",
  active = true,
  cameraPosition,
  fov = 28,
}) {
  const mounted = useMounted();
  const mouseRef = useRef({ x: 0, y: 0 });
  const camPos = cameraPosition || (variant === "bust" ? CAM_BUST : CAM_FULL);

  useEffect(() => {
    const clamp = (v) => (Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
    const move = (e) => {
      mouseRef.current.x = clamp((e.clientX / window.innerWidth - 0.5) * 2);
      mouseRef.current.y = clamp((e.clientY / window.innerHeight - 0.5) * 2);
    };
    const reset = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };
    window.addEventListener("mousemove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("mousemove", move);
      document.documentElement.removeEventListener("mouseleave", reset);
    };
  }, []);

  if (!mounted) return <div style={EMPTY_STYLE} />;

  return (
    <div style={WRAP_STYLE}>
      <Canvas
        flat
        frameloop={active ? "always" : "demand"}
        dpr={[1, 1.5]}
        gl={GL_OPTS}
        camera={{ position: camPos, fov }}
        onCreated={({ camera }) => camera.lookAt(0, camPos[1], 0)}
        style={CANVAS_STYLE}
      >
        <ambientLight intensity={1.35} />
        <directionalLight position={[3, 5, 5]} intensity={1.35} />
        <directionalLight position={[-3, 2, 2]} intensity={0.45} />
        <CharacterModel
          mode={mode}
          talking={talking}
          dir={dir}
          outfit={outfit}
          variant={variant}
          mouseRef={mouseRef}
        />
      </Canvas>
    </div>
  );
});

export default Avatar3D;
