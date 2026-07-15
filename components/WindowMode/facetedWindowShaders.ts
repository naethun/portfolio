export const FACET_VERTEX_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  vec3 safeFacetNormal(vec3 candidate, vec3 fallbackDirection) {
    float normalLength = length(candidate);
    if (normalLength <= 0.0001) {
      return fallbackDirection;
    }
    return candidate / max(normalLength, 0.0001);
  }

  void main() {
    vUv = uv;
    vec3 transformedNormal = mat3(modelMatrix) * normal;
    vNormal = safeFacetNormal(transformedNormal, vec3(0.0, 0.0, 1.0));

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
  uniform float uMotion;
  uniform vec2 uViewport;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  const vec3 OPTICAL_INK = vec3(0.03137255, 0.05098039, 0.07450980);
  const vec3 ICE_WHITE = vec3(0.93725490, 0.98823529, 1.00000000);
  const vec3 COOL_SILVER = vec3(0.70588235, 0.77647059, 0.83137255);
  const vec3 PEARL = vec3(0.92549020, 0.91372549, 1.00000000);
  const vec3 CYAN_INTERFERENCE = vec3(0.44313725, 0.94509804, 0.95294118);
  const vec3 VIOLET_INTERFERENCE = vec3(0.50196078, 0.43137255, 1.00000000);

  vec3 safeFacetNormal(vec3 candidate, vec3 fallbackDirection) {
    float normalLength = length(candidate);
    if (normalLength <= 0.0001) {
      return fallbackDirection;
    }
    return candidate / max(normalLength, 0.0001);
  }

  float facetLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  vec2 safeUv(vec2 uv) {
    return clamp(uv, vec2(0.001), vec2(0.999));
  }

  vec3 sampleVideo(vec2 uv) {
    return texture2D(uVideo, safeUv(uv)).rgb;
  }

  float sampleLuma(vec2 uv) {
    return facetLuminance(sampleVideo(uv));
  }

  vec2 causticVector(vec2 uv, float energy, float grazing) {
    float phase = uTime * 0.18;
    vec2 wave = vec2(
      sin(uv.y * 21.0 + phase * 1.7 + sin(uv.x * 8.0 + phase)),
      cos(uv.x * 18.0 - phase * 1.4 + sin(uv.y * 9.0 - phase))
    );
    vec2 pixel = 1.0 / max(uViewport, vec2(1.0));
    return wave * pixel * (0.85 + energy * 2.6 + grazing * 1.35);
  }

  void main() {
    if (uOpacity <= 0.001) discard;

    vec2 sourceUv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 pixel = 1.0 / max(uViewport, vec2(1.0));
    vec3 orientedNormal = gl_FrontFacing ? vNormal : -vNormal;
    vec3 fallbackNormal = gl_FrontFacing
      ? vec3(0.0, 0.0, 1.0)
      : vec3(0.0, 0.0, -1.0);
    vec3 faceNormal = safeFacetNormal(orientedNormal, fallbackNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = clamp(abs(dot(faceNormal, viewDirection)), 0.0, 1.0);
    float grazing = 1.0 - facing;
    float energy = clamp(uMotion, 0.0, 1.0);
    vec2 caustic = causticVector(sourceUv, energy, grazing);
    vec2 opticalUv = safeUv(sourceUv + caustic);
    vec3 centerColor = sampleVideo(opticalUv);
    float luma = facetLuminance(centerColor);
    float leftLuma = sampleLuma(opticalUv - vec2(pixel.x * 1.5, 0.0));
    float rightLuma = sampleLuma(opticalUv + vec2(pixel.x * 1.5, 0.0));
    float downLuma = sampleLuma(opticalUv - vec2(0.0, pixel.y * 1.5));
    float upLuma = sampleLuma(opticalUv + vec2(0.0, pixel.y * 1.5));
    vec2 gradient = vec2(rightLuma - leftLuma, upLuma - downLuma);
    float edge = clamp(length(gradient) * 4.4, 0.0, 1.0);
    vec3 color;

    if (uMode < 0.5) {
      // mode 0: frosted diffusion
      float blurPixels = mix(0.8, 2.9, energy) * (1.0 + grazing * 0.55);
      vec2 blurStep = pixel * blurPixels;
      vec3 frostSample = (
        centerColor * 2.0
        + sampleVideo(opticalUv + vec2(blurStep.x, 0.0))
        + sampleVideo(opticalUv - vec2(blurStep.x, 0.0))
        + sampleVideo(opticalUv + vec2(0.0, blurStep.y))
        + sampleVideo(opticalUv - vec2(0.0, blurStep.y))
      ) / 6.0;
      float frostLuma = facetLuminance(frostSample);
      vec3 frost = mix(
        OPTICAL_INK,
        ICE_WHITE,
        smoothstep(0.04, 0.94, frostLuma)
      );
      frost = mix(
        frost,
        COOL_SILVER,
        (1.0 - smoothstep(0.22, 0.82, frostLuma)) * 0.34
      );
      float frostEdge = edge * (0.035 + energy * 0.045);
      frost = mix(frost, ICE_WHITE, frostEdge);
      float ridgeCoordinate = sourceUv.x + sourceUv.y * 0.62
        + grazing * 0.09;
      float ridgeWave = sin(ridgeCoordinate * 15.0 - uTime * 0.42);
      float ridge = pow(max(0.0, 1.0 - abs(ridgeWave)), 6.0);
      color = mix(frost, PEARL, ridge * (0.12 + grazing * 0.12));
    } else if (uMode < 1.5) {
      // mode 1: liquid mercury
      float reflectionBand = 0.5 + 0.5 * cos(
        (luma * 1.35 + opticalUv.y * 0.20 + caustic.y * uViewport.y * 0.014)
          * 19.0
      );
      reflectionBand = pow(reflectionBand, 1.75);
      vec3 mercury = mix(
        OPTICAL_INK,
        COOL_SILVER,
        smoothstep(0.04, 0.72, luma)
      );
      mercury = mix(
        mercury,
        ICE_WHITE,
        reflectionBand * (0.54 + grazing * 0.25)
      );
      mercury = mix(mercury, PEARL, edge * 0.20);
      float sweepPosition = fract(
        uTime * (0.045 + energy * 0.025) + grazing * 0.22
      ) * 1.55 - 0.25;
      float sweepCoordinate = opticalUv.x + opticalUv.y * 0.33
        + caustic.x * uViewport.x * 0.035 * (1.0 + energy);
      float sweepWidth = mix(0.035, 0.070, grazing);
      float specularSweep = 1.0 - smoothstep(
        sweepWidth,
        sweepWidth + 0.075,
        abs(sweepCoordinate - sweepPosition)
      );
      color = mix(mercury, ICE_WHITE, specularSweep * (0.48 + grazing * 0.28));
    } else {
      // mode 2: interference membrane
      float separationPixels = mix(
        0.55,
        2.5,
        clamp(energy * 0.62 + grazing * 0.60, 0.0, 1.0)
      );
      float gradientMagnitude = max(length(gradient), 0.0001);
      vec2 gradientDirection = gradient / gradientMagnitude;
      vec2 separation = gradientDirection * pixel * separationPixels;
      float positiveLuma = sampleLuma(opticalUv + separation);
      float negativeLuma = sampleLuma(opticalUv - separation);
      vec3 membrane = mix(
        OPTICAL_INK,
        PEARL,
        smoothstep(0.04, 0.90, luma)
      );
      membrane = mix(
        membrane,
        COOL_SILVER,
        (1.0 - smoothstep(0.28, 0.82, luma)) * 0.30
      );
      float cyanMask = clamp(
        max(positiveLuma - luma, 0.0) * 5.0
          + edge * (0.08 + energy * 0.30),
        0.0,
        0.72
      );
      float violetMask = clamp(
        max(negativeLuma - luma, 0.0) * 5.0
          + edge * grazing * 0.26,
        0.0,
        0.68
      );
      membrane = mix(membrane, CYAN_INTERFERENCE, cyanMask);
      membrane = mix(membrane, VIOLET_INTERFERENCE, violetMask);
      float film = 0.5 + 0.5 * sin(
        (sourceUv.x * 0.8 + sourceUv.y) * 18.0 + uTime * 0.30
      );
      color = mix(membrane, PEARL, film * 0.08);
    }

    vec3 lightDirection = normalize(vec3(-0.45, 0.58, 0.68));
    float faceLight = 0.88 + 0.12 * max(dot(faceNormal, lightDirection), 0.0);
    float depthLift = clamp(vWorldPosition.z * 0.015, -0.012, 0.012);
    color = clamp(color * (faceLight + depthLift), OPTICAL_INK, vec3(1.0));
    gl_FragColor = vec4(color, uOpacity);
  }
`;
