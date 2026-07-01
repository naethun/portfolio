'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

import type { UniverseMedia } from '@/lib/getUniverseMedia';
import { buildAtlas, type AtlasItem } from './atlas';
import {
  POINTS_VERTEX,
  POINTS_FRAGMENT,
  PLANE_VERTEX,
  PLANE_FRAGMENT,
  VIDEO_VERTEX,
  VIDEO_FRAGMENT,
} from './shaders';

/* ============================================================================
 * TUNABLES — everything you'd want to tweak lives here.
 * ==========================================================================*/

/** Render mode. Instanced planes = crisp + correct aspect (best for photos).
 *  Flip to false for the classic square Points sprites from the brief. */
const USE_INSTANCED_PLANES = true;

/** Near-white gallery-in-space background. */
const BACKGROUND_COLOR = '#f4f2ee';

/** Half-extent of the cloud. Positions land on a spherical shell of this size. */
const POSITION_SPREAD = 60;
/** Inner-radius fraction of the shell (0 = solid ball, 1 = thin shell). */
const SHELL_BIAS = 0.35;

/** Per-particle base size and its ± jitter (0.5 = ±50%). */
const SIZE_BASE = 7;
const SIZE_JITTER = 0.5;

/** The tunable "300.0" from the brief — bigger = larger point sprites. */
const POINT_SIZE_FACTOR = 300.0;
/** World-unit scale for instanced planes (independent of point-size factor). */
const PLANE_WORLD_SCALE = 0.9;

/** OrbitControls feel. */
const DAMPING = 0.08;
const MIN_ZOOM = 8;
const MAX_ZOOM = POSITION_SPREAD * 3.5;

/** Idle auto-drift: after this much stillness, camera slowly rotates. */
const IDLE_DELAY_MS = 3500;
const IDLE_DRIFT_SPEED = 0.3;

/** Camera. */
const FOV = 55;
const INTRO_DURATION = 2.2; // seconds
const START_DISTANCE = POSITION_SPREAD * 1.5; // resting distance after intro

/** Globe formation (gesture-driven scatter → sphere morph). */
const GLOBE_RADIUS = 16; // sphere radius in world units when fully formed
const FORMATION_EASE = 3.0; // higher = snappier scatter↔globe transition
const GLOBE_SPIN_SPEED = 0.25; // radians/sec at full formation

/* ==========================================================================*/

interface Props {
  media: UniverseMedia[];
  className?: string;
  /** override the near-white background if you want. */
  background?: string;
  /** fired when a sprite is clicked (camera also flies to frame it). */
  onSelect?: (media: UniverseMedia, index: number) => void;
  /**
   * Optional 0..1 target the render loop eases toward: 0 = scattered cloud,
   * 1 = globe. Driven externally (e.g. by hand gestures). Instanced-planes
   * mode only; ignored in Points mode.
   */
  formationTargetRef?: React.RefObject<number>;
}

interface Pickable {
  pos: THREE.Vector3;
  /** world height of the plane (instanced) — used to size the pick radius. */
  worldH: number;
  /** point base size (points mode) — used to size the pick radius. */
  aSize: number;
  globalIndex: number;
}

export default function ImageUniverse({
  media,
  className,
  background = BACKGROUND_COLOR,
  onSelect,
  formationTargetRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const formationTargetInternal = useRef(0);
  const formationRef = formationTargetRef ?? formationTargetInternal;
  // keep the latest onSelect without re-running the heavy scene effect
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const hasImages = media.some((m) => m.type === 'image');
  const hasVideos = media.some((m) => m.type === 'video');
  const isEmpty = !hasImages && !hasVideos;

  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>(
    isEmpty ? 'empty' : 'loading',
  );
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  useEffect(() => {
    if (isEmpty) return;
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let raf = 0;

    // ---- renderer / scene / camera ----------------------------------------
    const initialW = container.clientWidth || 1;
    const initialH = container.clientHeight || 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(initialW, initialH);
    renderer.setClearColor(new THREE.Color(background), 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(
      FOV,
      initialW / initialH,
      0.1,
      2000,
    );
    camera.position.set(0, 0, START_DISTANCE);

    // ---- controls ----------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = DAMPING;
    controls.enablePan = true;
    controls.minDistance = MIN_ZOOM;
    controls.maxDistance = MAX_ZOOM;
    controls.autoRotateSpeed = IDLE_DRIFT_SPEED;
    controls.autoRotate = false;

    // ---- shared reveal uniform (0 -> 1 intro fade/scale) -------------------
    const uReveal = { value: 0 };

    // ---- globe-formation uniforms (scatter <-> sphere morph) ---------------
    const uFormation = { value: 0 };
    const uSpin = { value: 0 };
    const uGlobeRadius = { value: GLOBE_RADIUS };
    const uCamRight = { value: new THREE.Vector3(1, 0, 0) };
    const uCamUp = { value: new THREE.Vector3(0, 1, 0) };
    // true once the instanced image mesh exists (globe is instanced-only)
    let globeActive = false;

    // ---- deterministic-ish position + size generation ----------------------
    const count = media.length;
    const positions = new Float32Array(count * 3);
    const sizeBase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r =
        POSITION_SPREAD * (SHELL_BIAS + (1 - SHELL_BIAS) * Math.cbrt(Math.random()));
      const sinPhi = Math.sin(phi);
      positions[i * 3] = r * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizeBase[i] = SIZE_BASE * (1 + SIZE_JITTER * (Math.random() * 2 - 1));
    }

    const pickables: Pickable[] = [];
    const disposables: Array<{ dispose: () => void }> = [];

    // ---- videos: one billboarded plane each --------------------------------
    const videoEls: HTMLVideoElement[] = [];
    const videoMeshes: THREE.Mesh[] = [];
    const videoUniforms: Array<{
      uCenter: { value: THREE.Vector3 };
      uScale: { value: THREE.Vector2 };
    }> = [];

    function unitQuad(): THREE.BufferGeometry {
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
          3,
        ),
      );
      g.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
      );
      g.setIndex([0, 1, 2, 0, 2, 3]);
      return g;
    }

    const videoQuad = unitQuad();

    media.forEach((m, i) => {
      if (m.type !== 'video') return;

      const video = document.createElement('video');
      video.src = m.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.crossOrigin = 'anonymous';
      video.play().catch(() => {});
      videoEls.push(video);

      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      // Match the atlas convention (top-left origin): the shared `1.0 - uv.y`
      // flip in VIDEO_VERTEX assumes flipY=false. VideoTexture defaults to
      // flipY=true, which would double-flip and render the video upside-down.
      tex.flipY = false;

      const center = new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      );
      const base = sizeBase[i] * PLANE_WORLD_SCALE;
      const scale = new THREE.Vector2(base, base); // square until metadata loads

      const uCenter = { value: center };
      const uScale = { value: scale };
      videoUniforms.push({ uCenter, uScale });

      const mat = new THREE.ShaderMaterial({
        uniforms: { uVideo: { value: tex }, uCenter, uScale, uReveal },
        vertexShader: VIDEO_VERTEX,
        fragmentShader: VIDEO_FRAGMENT,
        transparent: true,
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(videoQuad, mat);
      mesh.frustumCulled = false;
      scene.add(mesh);
      videoMeshes.push(mesh);
      disposables.push(mat, tex);

      const videoPickable: Pickable = {
        pos: center,
        worldH: base,
        aSize: sizeBase[i],
        globalIndex: i,
      };
      pickables.push(videoPickable);

      // correct the aspect once dimensions are known, and keep the pick/fly
      // hit-radius in sync with the rendered plane height.
      video.addEventListener('loadedmetadata', () => {
        if (video.videoWidth && video.videoHeight) {
          const a = video.videoWidth / video.videoHeight;
          uScale.value.set(base * Math.sqrt(a), base / Math.sqrt(a));
          videoPickable.worldH = base / Math.sqrt(a);
        }
      });
    });

    // ---- images: build atlas, then one draw call ---------------------------
    const imageIndices: number[] = [];
    const imageSources: string[] = [];
    media.forEach((m, i) => {
      if (m.type === 'image') {
        imageIndices.push(i);
        imageSources.push(m.src);
      }
    });

    let imageMesh: THREE.Points | THREE.Mesh | null = null;

    function buildImages() {
      if (imageSources.length === 0) {
        finishSetup();
        return;
      }
      setProgress({ loaded: 0, total: imageSources.length });

      buildAtlas(imageSources, {
        anisotropy: renderer.capabilities.getMaxAnisotropy(),
        onProgress: (loaded, total) => {
          if (!disposed) setProgress({ loaded, total });
        },
      })
        .then((atlas) => {
          if (disposed) {
            atlas.texture.dispose();
            return;
          }
          createImageMesh(atlas.items, atlas.texture);
          disposables.push(atlas.texture);
          finishSetup();
        })
        .catch(() => {
          if (!disposed) finishSetup();
        });
    }

    function createImageMesh(items: AtlasItem[], texture: THREE.Texture) {
      const n = items.length;
      const uAtlas = { value: texture };

      if (USE_INSTANCED_PLANES) {
        const geo = new THREE.InstancedBufferGeometry();
        geo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
            3,
          ),
        );
        geo.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
        );
        geo.setIndex([0, 1, 2, 0, 2, 3]);

        const iPos = new Float32Array(n * 3);
        const iSphereDir = new Float32Array(n * 3);
        const iScale = new Float32Array(n * 2);
        const iUvOffset = new Float32Array(n * 2);
        const iUvScale = new Float32Array(n * 2);

        // Fibonacci sphere: even direction per image for globe coverage.
        const golden = Math.PI * (3 - Math.sqrt(5));

        items.forEach((item, k) => {
          const g = imageIndices[k];
          iPos[k * 3] = positions[g * 3];
          iPos[k * 3 + 1] = positions[g * 3 + 1];
          iPos[k * 3 + 2] = positions[g * 3 + 2];

          // even point on the unit sphere for this image
          const y = n > 1 ? 1 - (k / (n - 1)) * 2 : 0;
          const rad = Math.sqrt(Math.max(0, 1 - y * y));
          const th = k * golden;
          iSphereDir[k * 3] = Math.cos(th) * rad;
          iSphereDir[k * 3 + 1] = y;
          iSphereDir[k * 3 + 2] = Math.sin(th) * rad;

          const base = sizeBase[g] * PLANE_WORLD_SCALE;
          const a = item.aspect;
          const w = base * Math.sqrt(a);
          const h = base / Math.sqrt(a);
          iScale[k * 2] = w;
          iScale[k * 2 + 1] = h;
          iUvOffset[k * 2] = item.uvOffset[0];
          iUvOffset[k * 2 + 1] = item.uvOffset[1];
          iUvScale[k * 2] = item.uvScale[0];
          iUvScale[k * 2 + 1] = item.uvScale[1];
          pickables.push({ pos: new THREE.Vector3(iPos[k * 3], iPos[k * 3 + 1], iPos[k * 3 + 2]), worldH: h, aSize: sizeBase[g], globalIndex: g });
        });

        geo.setAttribute('iPosition', new THREE.InstancedBufferAttribute(iPos, 3));
        geo.setAttribute('iSphereDir', new THREE.InstancedBufferAttribute(iSphereDir, 3));
        geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(iScale, 2));
        geo.setAttribute('iUvOffset', new THREE.InstancedBufferAttribute(iUvOffset, 2));
        geo.setAttribute('iUvScale', new THREE.InstancedBufferAttribute(iUvScale, 2));
        geo.instanceCount = n;

        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uAtlas,
            uReveal,
            uFormation,
            uSpin,
            uGlobeRadius,
            uCamRight,
            uCamUp,
          },
          vertexShader: PLANE_VERTEX,
          fragmentShader: PLANE_FRAGMENT,
          transparent: true,
          depthTest: true,
          depthWrite: true,
          side: THREE.DoubleSide,
        });
        globeActive = true;

        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        scene.add(mesh);
        imageMesh = mesh;
        disposables.push(geo, mat);
      } else {
        // POINTS mode
        const pos = new Float32Array(n * 3);
        const aSizeArr = new Float32Array(n);
        const aUvOffset = new Float32Array(n * 2);
        const aUvScale = new Float32Array(n * 2);
        const aAspect = new Float32Array(n);

        items.forEach((item, k) => {
          const g = imageIndices[k];
          pos[k * 3] = positions[g * 3];
          pos[k * 3 + 1] = positions[g * 3 + 1];
          pos[k * 3 + 2] = positions[g * 3 + 2];
          aSizeArr[k] = sizeBase[g];
          aUvOffset[k * 2] = item.uvOffset[0];
          aUvOffset[k * 2 + 1] = item.uvOffset[1];
          aUvScale[k * 2] = item.uvScale[0];
          aUvScale[k * 2 + 1] = item.uvScale[1];
          aAspect[k] = item.aspect;
          pickables.push({ pos: new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]), worldH: 0, aSize: sizeBase[g], globalIndex: g });
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.Float32BufferAttribute(aSizeArr, 1));
        geo.setAttribute('aUvOffset', new THREE.Float32BufferAttribute(aUvOffset, 2));
        geo.setAttribute('aUvScale', new THREE.Float32BufferAttribute(aUvScale, 2));
        geo.setAttribute('aAspect', new THREE.Float32BufferAttribute(aAspect, 1));

        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uAtlas,
            uReveal,
            uSizeFactor: { value: POINT_SIZE_FACTOR },
            uPixelRatio: { value: pixelRatio },
          },
          vertexShader: POINTS_VERTEX,
          fragmentShader: POINTS_FRAGMENT,
          transparent: true,
          depthTest: true,
          depthWrite: true,
        });

        const points = new THREE.Points(geo, mat);
        points.frustumCulled = false;
        scene.add(points);
        imageMesh = points;
        disposables.push(geo, mat);
      }
    }

    // ---- picking (mode-agnostic screen-space projection) -------------------
    const focalRef = () => {
      const rect = renderer.domElement.getBoundingClientRect();
      return rect.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));
    };

    function pick(clientX: number, clientY: number): Pickable | null {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const focal = focalRef();
      const v = new THREE.Vector3();
      let best: Pickable | null = null;
      let bestDepth = Infinity;

      for (const p of pickables) {
        v.copy(p.pos).project(camera);
        if (v.z < -1 || v.z > 1) continue;
        const sx = (v.x * 0.5 + 0.5) * rect.width;
        const sy = (-v.y * 0.5 + 0.5) * rect.height;
        const dist = camera.position.distanceTo(p.pos);

        // on-screen radius estimate per render mode
        let screenR: number;
        if (USE_INSTANCED_PLANES) {
          screenR = 0.5 * p.worldH * (focal / dist);
        } else {
          screenR = 0.5 * p.aSize * (POINT_SIZE_FACTOR / dist);
        }
        screenR = Math.min(Math.max(screenR, 14), 220);

        const dx = sx - px;
        const dy = sy - py;
        if (dx * dx + dy * dy <= screenR * screenR && v.z < bestDepth) {
          bestDepth = v.z; // smaller NDC z = nearer the camera
          best = p;
        }
      }
      return best;
    }

    function flyTo(p: Pickable) {
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      const worldSize = USE_INSTANCED_PLANES ? p.worldH : p.aSize * 0.6;
      // distance that frames the item at ~50% of the viewport height
      let dist =
        worldSize / 0.5 / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));
      dist = THREE.MathUtils.clamp(dist * 8, MIN_ZOOM * 1.5, MAX_ZOOM * 0.7);
      const dir = camera.position.clone().sub(p.pos).normalize();
      const dest = p.pos.clone().add(dir.multiplyScalar(dist));
      interacting();
      gsap.to(camera.position, {
        x: dest.x,
        y: dest.y,
        z: dest.z,
        duration: 1.2,
        ease: 'power3.inOut',
        // refresh the idle timer on arrival so the auto-drift countdown starts
        // when the camera settles, not when the flight began.
        onComplete: () => {
          lastInteraction = performance.now();
        },
      });
      gsap.to(controls.target, {
        x: p.pos.x,
        y: p.pos.y,
        z: p.pos.z,
        duration: 1.2,
        ease: 'power3.inOut',
        onUpdate: () => controls.update(),
      });
    }

    // ---- idle / interaction bookkeeping ------------------------------------
    let lastInteraction = performance.now();
    let introRunning = true;
    function interacting() {
      lastInteraction = performance.now();
      controls.autoRotate = false;
    }
    const onControlStart = () => {
      // user grabbed — stop fighting any camera tween / idle drift
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      introRunning = false;
      interacting();
    };
    const onControlEnd = () => interacting();
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // ---- click vs drag detection for picking -------------------------------
    let downX = 0;
    let downY = 0;
    let downT = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    };
    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      const dt = performance.now() - downT;
      if (moved < 6 && dt < 400) {
        const hit = pick(e.clientX, e.clientY);
        if (hit) {
          onSelectRef.current?.(media[hit.globalIndex], hit.globalIndex);
          flyTo(hit);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ---- resize (container-aware, not just window) -------------------------
    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // ---- intro animation ---------------------------------------------------
    function finishSetup() {
      if (disposed) return;
      setStatus('ready');

      // eased camera dolly-in from far + particle reveal
      camera.position.set(
        POSITION_SPREAD * 0.25,
        POSITION_SPREAD * 0.1,
        START_DISTANCE * 2.1,
      );
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: START_DISTANCE,
        duration: INTRO_DURATION,
        ease: 'power2.out',
        onComplete: () => {
          introRunning = false;
          lastInteraction = performance.now();
        },
      });
      gsap.to(uReveal, {
        value: 1,
        duration: INTRO_DURATION * 0.8,
        ease: 'power1.out',
      });
    }

    // ---- render loop -------------------------------------------------------
    let lastFrame = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrame) / 1000); // clamp long stalls
      lastFrame = now;

      // enable idle drift only when truly idle and intro finished
      if (!introRunning && !controls.autoRotate) {
        if (now - lastInteraction > IDLE_DELAY_MS) {
          controls.autoRotate = true;
        }
      }

      controls.update();

      // ease the scatter <-> globe morph toward its external target, spin the
      // globe (proportional to formation), and refresh the billboard camera basis
      // (after controls.update so it reflects this frame's camera orientation).
      if (globeActive) {
        const target = Math.max(0, Math.min(1, formationRef.current ?? 0));
        uFormation.value += (target - uFormation.value) * Math.min(1, dt * FORMATION_EASE);
        uSpin.value += GLOBE_SPIN_SPEED * dt * uFormation.value;
        camera.updateMatrixWorld();
        const e = camera.matrixWorld.elements;
        uCamRight.value.set(e[0], e[1], e[2]);
        uCamUp.value.set(e[4], e[5], e[6]);
      }

      renderer.render(scene, camera);
    };

    buildImages();
    animate();

    // ---- teardown ----------------------------------------------------------
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      gsap.killTweensOf(uReveal);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();

      videoEls.forEach((v) => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      videoQuad.dispose();
      videoMeshes.forEach((m) => scene.remove(m));
      if (imageMesh) scene.remove(imageMesh);

      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      // dispose() frees GPU resources but not the WebGL context itself;
      // forceContextLoss releases it synchronously so rapid mount/unmount
      // cycles don't accumulate contexts toward the browser's hard limit.
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // rebuild if the media set changes (formationRef is a stable ref object)
  }, [media, background, isEmpty, formationRef]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {status === 'empty' && (
        <div style={overlayStyle}>
          <p style={{ maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>
            No media yet. Drop images or videos into{' '}
            <code style={codeStyle}>public/portfolio/loop-imgs/</code> and refresh.
          </p>
        </div>
      )}
      {status === 'loading' && (
        <div style={overlayStyle}>
          <p style={{ letterSpacing: '0.2em', fontSize: 12 }}>
            ASSEMBLING UNIVERSE
            {progress.total > 0 ? ` · ${progress.loaded}/${progress.total}` : '…'}
          </p>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  color: '#5b574e',
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Mono", monospace',
  pointerEvents: 'none',
  zIndex: 2,
};

const codeStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.06)',
  padding: '2px 6px',
  borderRadius: 4,
};
