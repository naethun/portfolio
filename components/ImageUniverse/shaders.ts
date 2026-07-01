/**
 * SHADERS
 * =======
 * Two render paths share the same atlas + per-particle data:
 *
 *  1. POINTS  — one THREE.Points, size-by-distance via gl_PointSize (this is the
 *     technique from the brief). Sprites are square and GPU-capped (~1024px), so
 *     we discard the out-of-aspect margins to avoid distortion.
 *
 *  2. INSTANCED PLANES — one instanced draw of camera-facing quads scaled to each
 *     image's aspect ratio. Crisp (mipmapped, not point-size-capped) and correct
 *     aspect. This is the default because the gallery is mostly portrait photos.
 *
 * Both discard fully transparent fragments so sprites composite cleanly, and both
 * multiply alpha by `uReveal` for the GSAP fade-in.
 */

// ----------------------------------------------------------------------------
// POINTS
// ----------------------------------------------------------------------------

export const POINTS_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec2 aUvOffset;
  attribute vec2 aUvScale;
  attribute float aAspect;

  uniform float uSizeFactor;   // the tunable "300.0" point-size factor
  uniform float uReveal;       // 0..1 intro scale-in
  uniform float uPixelRatio;

  varying vec2 vUvOffset;
  varying vec2 vUvScale;
  varying float vAspect;

  void main() {
    vUvOffset = aUvOffset;
    vUvScale = aUvScale;
    vAspect = aAspect;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // near = big, far = small. mix(...) keeps a little size while revealing.
    gl_PointSize = aSize * mix(0.2, 1.0, uReveal) * uPixelRatio * (uSizeFactor / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const POINTS_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uAtlas;
  uniform float uReveal;

  varying vec2 vUvOffset;
  varying vec2 vUvScale;
  varying float vAspect;

  void main() {
    // gl_PointCoord: (0,0) top-left, (1,1) bottom-right — matches our atlas.
    vec2 pc = gl_PointCoord;

    // The sprite is square; remap so the image keeps its aspect and the
    // leftover margin is discarded (no stretch, no crop).
    vec2 uv = pc;
    if (vAspect >= 1.0) {
      uv.y = (pc.y - 0.5) * vAspect + 0.5;   // landscape: shrink vertically
    } else {
      uv.x = (pc.x - 0.5) / vAspect + 0.5;   // portrait: shrink horizontally
    }
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

    vec4 color = texture2D(uAtlas, vUvOffset + uv * vUvScale);
    if (color.a < 0.01) discard;
    color.a *= uReveal;
    gl_FragColor = color;
  }
`;

// ----------------------------------------------------------------------------
// INSTANCED PLANES (billboarded quads)
// ----------------------------------------------------------------------------

export const PLANE_VERTEX = /* glsl */ `
  // Provided by three for the unit-quad BufferGeometry: position (vec3), uv.
  attribute vec3 iPosition;   // per-instance scattered world center
  attribute vec3 iSphereDir;  // per-instance unit direction on the globe
  attribute vec2 iHelix;      // per-instance helix params: (base angle, height)
  attribute vec2 iScale;      // per-instance world (width, height) — encodes aspect
  attribute vec2 iUvOffset;
  attribute vec2 iUvScale;

  uniform float uReveal;
  uniform float uFormation;    // 0 = scattered cloud, 1 = formed shape
  uniform float uShape;        // 0 = globe, 1 = helix (DNA)
  uniform float uSpin;         // rotation about Y (radians)
  uniform float uGlobeRadius;
  uniform float uHelixRadius;
  uniform vec3 uCamRight;      // world-space camera basis (for the billboard term)
  uniform vec3 uCamUp;

  varying vec2 vUv;
  varying vec2 vUvOffset;
  varying vec2 vUvScale;

  vec3 rotateY(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    // Flip V: plane uv has (0,0) at bottom-left, atlas is authored top-left.
    vUv = vec2(uv.x, 1.0 - uv.y);
    vUvOffset = iUvOffset;
    vUvScale = iUvScale;

    // --- Globe target: spin the sphere direction about Y, place on the sphere.
    vec3 dirG = rotateY(iSphereDir, uSpin);
    vec3 globePos = dirG * uGlobeRadius;
    // Surface-tangent basis so the quad faces outward (reads as a solid globe).
    vec3 upG = abs(dirG.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 tanG = normalize(cross(upG, dirG));
    vec3 bitG = cross(dirG, tanG);

    // --- Helix (DNA) target: point on a spinning vertical spiral, facing out.
    float ang = iHelix.x + uSpin;
    vec3 helixPos = vec3(cos(ang) * uHelixRadius, iHelix.y, sin(ang) * uHelixRadius);
    vec3 nH = vec3(cos(ang), 0.0, sin(ang)); // radial outward (horizontal)
    vec3 tanH = normalize(cross(vec3(0.0, 1.0, 0.0), nH));
    vec3 bitH = cross(nH, tanH);

    // Blend the formed shape (globe <-> helix), then scatter <-> formed.
    vec3 formedPos = mix(globePos, helixPos, uShape);
    vec3 tangent = mix(tanG, tanH, uShape);
    vec3 bitangent = mix(bitG, bitH, uShape);
    vec3 center = mix(iPosition, formedPos, uFormation);

    float sx = position.x * iScale.x * uReveal;
    float sy = position.y * iScale.y * uReveal;

    // Billboard (camera-facing) vs formed-surface offset, blended by formation.
    // At uFormation = 0 this reduces to the original screen-aligned billboard.
    vec3 billboardOffset = uCamRight * sx + uCamUp * sy;
    vec3 shapeOffset = tangent * sx + bitangent * sy;
    vec3 worldPos = center + mix(billboardOffset, shapeOffset, uFormation);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  }
`;

export const PLANE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uAtlas;
  uniform float uReveal;

  varying vec2 vUv;
  varying vec2 vUvOffset;
  varying vec2 vUvScale;

  void main() {
    vec4 color = texture2D(uAtlas, vUvOffset + vUv * vUvScale);
    if (color.a < 0.01) discard;
    color.a *= uReveal;
    gl_FragColor = color;
  }
`;

// ----------------------------------------------------------------------------
// VIDEO (single billboarded plane, one per video texture)
// ----------------------------------------------------------------------------

export const VIDEO_VERTEX = /* glsl */ `
  uniform vec3 uCenter;
  uniform vec2 uScale;
  uniform float uReveal;

  varying vec2 vUv;

  void main() {
    vUv = vec2(uv.x, 1.0 - uv.y);
    vec4 mv = modelViewMatrix * vec4(uCenter, 1.0);
    mv.xy += position.xy * uScale * uReveal;
    gl_Position = projectionMatrix * mv;
  }
`;

export const VIDEO_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform float uReveal;

  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uVideo, vUv);
    // Match the image shaders: with depthWrite on, transparent regions of an
    // alpha-channel video must not write depth and occlude sprites behind them.
    if (color.a < 0.01) discard;
    color.a *= uReveal;
    gl_FragColor = color;
  }
`;
