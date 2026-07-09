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
  uniform float uOpacity;
  uniform float uMode;
  uniform float uTime;
  uniform vec2 uViewport;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  const vec3 INK = vec3(0.02745098, 0.02745098, 0.03529412);
  const vec3 POLKA_VIOLET = vec3(0.42352941, 0.16862745, 0.85098039);
  const vec3 POLKA_WHITE = vec3(0.97254902, 0.96862745, 1.00000000);
  const vec3 INDIGO = vec3(0.15686275, 0.20000000, 0.43529412);
  const vec3 PEARL = vec3(0.94117647, 0.94901961, 0.91372549);
  const vec3 CHROME_DARK = vec3(0.03529412, 0.04705882, 0.07058824);
  const vec3 CHROME_SILVER = vec3(0.58039216, 0.63137255, 0.70196078);
  const vec3 CHROME_WHITE = vec3(0.94901961, 0.98039216, 1.00000000);
  const vec3 CHROME_CYAN = vec3(0.18039216, 0.85882353, 0.94117647);
  const vec3 CHROME_VIOLET = vec3(0.52156863, 0.27843137, 0.92156863);
  const vec3 BRICK = vec3(0.70980392, 0.28235294, 0.21176471);
  const vec3 COOL_PAPER = vec3(0.90980392, 0.92941176, 0.94117647);

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
      // mode 0: camera-reactive violet polka
      vec2 polkaGrid = gl_FragCoord.xy / 10.0;
      float polkaRow = floor(polkaGrid.y);
      polkaGrid.x += mod(polkaRow, 2.0) * 0.5;
      vec2 polkaCell = fract(polkaGrid) - 0.5;
      float polkaAmount = clamp(1.0 - luma, 0.0, 1.0);
      float polkaRadius = mix(
        0.08,
        0.47,
        smoothstep(0.06, 0.94, polkaAmount)
      );
      float dotMask = 1.0 - smoothstep(
        polkaRadius - 0.055,
        polkaRadius,
        length(polkaCell)
      );
      color = mix(POLKA_WHITE, POLKA_VIOLET, dotMask);
    } else if (uMode < 1.5) {
      // mode 1: indigo riso cyanotype
      vec2 risoCell = floor(gl_FragCoord.xy * 0.42);
      float grain = hash21(risoCell);
      float fiber = sin(
        gl_FragCoord.y * 0.38
        + hash21(floor(gl_FragCoord.xy * vec2(0.12, 0.05))) * 6.28318
      );
      float threshold = smoothstep(
        0.32,
        0.72,
        luma + (grain - 0.5) * 0.075 + fiber * 0.012
          + sin(uTime * 0.28) * 0.006
      );
      color = mix(INDIGO, PEARL, threshold);
    } else if (uMode < 2.5) {
      // mode 2: camera-reactive liquid chrome
      float chromePixel = 1.35 / max(uViewport.x, 1.0);
      float leftLuma = facetLuminance(
        texture2D(uVideo, sourceUv - vec2(chromePixel, 0.0)).rgb
      );
      float rightLuma = facetLuminance(
        texture2D(uVideo, sourceUv + vec2(chromePixel, 0.0)).rgb
      );
      float chromeEdge = clamp(abs(rightLuma - leftLuma) * 4.2, 0.0, 1.0);
      float reflectionBand = 0.5 + 0.5 * cos(
        (luma * 1.34 + sourceUv.y * 0.18) * 18.0
      );
      reflectionBand = pow(reflectionBand, 1.7);
      vec3 chrome = mix(
        CHROME_DARK,
        CHROME_SILVER,
        smoothstep(0.04, 0.72, luma)
      );
      chrome = mix(chrome, CHROME_WHITE, reflectionBand * 0.76);
      float sweepPosition = fract(uTime * 0.07) * 1.7 - 0.35;
      float specularSweep = 1.0 - smoothstep(
        0.0,
        0.085,
        abs(sourceUv.x + sourceUv.y * 0.38 - sweepPosition)
      );
      chrome = mix(chrome, CHROME_WHITE, specularSweep * 0.78);
      chrome = mix(chrome, CHROME_CYAN, chromeEdge * 0.24);
      chrome = mix(
        chrome,
        CHROME_VIOLET,
        clamp((rightLuma - leftLuma) * 3.5, 0.0, 0.18)
      );
      color = chrome;
    } else {
      // mode 3: brick elliptical stipple
      vec2 safeViewport = max(uViewport, vec2(1.0));
      vec2 viewportUv = gl_FragCoord.xy / safeViewport;
      vec2 grid = viewportUv * safeViewport / vec2(7.0, 5.8);
      vec2 cell = (fract(grid) - 0.5) * vec2(0.82, 1.18);
      float grain = hash21(floor(grid));
      float inkAmount = clamp(
        1.0 - luma + (grain - 0.5) * 0.09,
        0.0,
        1.0
      );
      float radius = mix(0.07, 0.46, inkAmount);
      float dotMask = 1.0 - smoothstep(
        radius - 0.05,
        radius,
        length(cell)
      );
      color = mix(COOL_PAPER, BRICK, dotMask);
    }

    vec3 faceNormal = normalize(gl_FrontFacing ? vNormal : -vNormal);
    vec3 lightDirection = normalize(vec3(-0.45, 0.58, 0.68));
    float faceLight = 0.88 + 0.12 * max(dot(faceNormal, lightDirection), 0.0);
    float depthLift = clamp(vWorldPosition.z * 0.015, -0.012, 0.012);
    color = max(INK, color * (faceLight + depthLift));

    gl_FragColor = vec4(color, uOpacity);
  }
`;
