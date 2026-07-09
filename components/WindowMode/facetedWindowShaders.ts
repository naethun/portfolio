export const FACET_VERTEX_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const FACET_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform sampler2D uAscii;
  uniform float uOpacity;
  uniform float uMode;
  uniform float uTime;
  uniform vec2 uViewport;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  const vec3 INK = vec3(0.02745098, 0.02745098, 0.03529412);
  const vec3 BONE = vec3(0.95686275, 0.94117647, 0.90196078);
  const vec3 COBALT = vec3(0.09411765, 0.29019608, 0.53333333);
  const vec3 CHLOROPHYLL = vec3(0.15686275, 0.47843137, 0.27058824);
  const vec3 CORAL = vec3(0.84313725, 0.39215686, 0.33333333);

  float facetLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    if (uOpacity <= 0.001) discard;

    // Task 1 UVs use the conventional bottom-left origin. Both live textures
    // retain their DOM-source orientation, so sample them in top-left space.
    vec2 sourceUv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 videoColor = texture2D(uVideo, sourceUv).rgb;
    float luma = facetLuminance(videoColor);
    vec3 color;

    if (uMode < 0.5) {
      // mode 0: dark ASCII texture
      color = texture2D(uAscii, sourceUv).rgb;
    } else if (uMode < 1.5) {
      // mode 1: cobalt/chalk cyanotype threshold
      float threshold = smoothstep(0.34, 0.70, luma);
      float grain = hash21(floor(gl_FragCoord.xy * 0.55));
      threshold = clamp(
        threshold + (grain - 0.5) * 0.055 + sin(uTime * 0.35) * 0.008,
        0.0,
        1.0
      );
      color = mix(COBALT, BONE, threshold);
    } else if (uMode < 2.5) {
      // mode 2: green/cream duotone with restrained RGB separation
      float pixel = 1.35 / max(uViewport.x, 1.0);
      float redLuma = facetLuminance(texture2D(uVideo, sourceUv + vec2(pixel, 0.0)).rgb);
      float blueLuma = facetLuminance(texture2D(uVideo, sourceUv - vec2(pixel, 0.0)).rgb);
      float tone = smoothstep(0.22, 0.82, luma);
      color = mix(CHLOROPHYLL, BONE, tone);
      color = mix(color, CORAL, clamp((redLuma - luma) * 0.9, 0.0, 0.075));
      color = mix(color, COBALT, clamp((blueLuma - luma) * 0.9, 0.0, 0.075));
    } else {
      // mode 3: coral stipple-halftone on a light ground
      vec2 safeViewport = max(uViewport, vec2(1.0));
      vec2 viewportUv = gl_FragCoord.xy / safeViewport;
      vec2 grid = viewportUv * safeViewport / 6.0;
      vec2 cell = fract(grid) - 0.5;
      float grain = hash21(floor(grid));
      float inkAmount = clamp(1.0 - luma + (grain - 0.5) * 0.12, 0.0, 1.0);
      float radius = mix(0.08, 0.47, inkAmount);
      float dotMask = 1.0 - smoothstep(radius - 0.045, radius, length(cell));
      color = mix(BONE, CORAL, dotMask);
    }

    vec3 faceNormal = normalize(gl_FrontFacing ? vNormal : -vNormal);
    vec3 lightDirection = normalize(vec3(-0.45, 0.58, 0.68));
    float faceLight = 0.88 + 0.12 * max(dot(faceNormal, lightDirection), 0.0);
    float depthLift = clamp(vWorldPosition.z * 0.015, -0.012, 0.012);
    color = max(INK, color * (faceLight + depthLift));

    gl_FragColor = vec4(color, uOpacity);
  }
`;
