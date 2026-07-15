import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const shaderSource = readFileSync(
  new URL('./facetedWindowShaders.ts', import.meta.url),
  'utf8',
);
const componentSource = readFileSync(
  new URL('./FacetedWindow.tsx', import.meta.url),
  'utf8',
);

function extractShaderStage(exportName) {
  const declarationIndex = shaderSource.indexOf(`export const ${exportName}`);
  assert.notEqual(declarationIndex, -1, `${exportName} declaration is missing`);
  const openingTick = shaderSource.indexOf('`', declarationIndex);
  assert.notEqual(openingTick, -1, `${exportName} opening delimiter is missing`);

  let closingTick = -1;
  for (let index = openingTick + 1; index < shaderSource.length; index += 1) {
    if (shaderSource[index] !== '`') continue;
    let escapeCount = 0;
    for (
      let escapeIndex = index - 1;
      escapeIndex >= 0 && shaderSource[escapeIndex] === '\\';
      escapeIndex -= 1
    ) {
      escapeCount += 1;
    }
    if (escapeCount % 2 === 0) {
      closingTick = index;
      break;
    }
  }
  assert.notEqual(closingTick, -1, `${exportName} closing delimiter is missing`);
  return shaderSource.slice(openingTick + 1, closingTick);
}

function stripGlslComments(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
    (comment) => comment.replace(/[^\r\n]/g, ' '),
  );
}

function compactGlsl(source) {
  return stripGlslComments(source).replace(/\s+/g, '');
}

function findColorMutations(source) {
  const colorLValue = String.raw`\bcolor(?:\s*(?:\.[A-Za-z_]\w*|\[[^\]]+\]))*`;
  return [
    ...stripGlslComments(source).matchAll(
      new RegExp(
        `(?:(?:\\+\\+|--)\\s*${colorLValue}|${colorLValue}\\s*(?:(?:<<|>>|[+\\-*/%&|^])?=|\\+\\+|--))`,
        'g',
      ),
    ),
  ].map((match) => match[0]);
}

function assertTerminalColorAssignment(block, approvedTerminalPattern, phaseName) {
  const executableBlock = stripGlslComments(block).trim();
  assert.equal(
    findColorMutations(executableBlock).length,
    1,
    `${phaseName} must have exactly one color mutation`,
  );
  assert.match(
    executableBlock,
    approvedTerminalPattern,
    `${phaseName} reconstruction must be the final executable statement`,
  );
}

function removeSinglePattern(source, pattern, label) {
  assert.equal(pattern.global, true, `${label} pattern must be global`);
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${label} must occur exactly once`);
  return source.replace(pattern, '');
}

function braceDepthAt(source, targetIndex) {
  let depth = 0;
  for (let index = 0; index < targetIndex; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
  }
  return depth;
}

function extractBracedBlock(source, marker, fromIndex = 0) {
  const match = source.slice(fromIndex).match(marker);
  assert.ok(match, `missing block marker: ${marker}`);
  const markerIndex = fromIndex + match.index;
  const openingBrace = source.indexOf('{', markerIndex + match[0].length);
  assert.notEqual(openingBrace, -1, `missing opening brace after: ${marker}`);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] !== '}') continue;
    depth -= 1;
    if (depth === 0) {
      return {
        body: source.slice(openingBrace + 1, index),
        markerMatch: match,
        markerStart: markerIndex,
        start: openingBrace,
        end: index + 1,
      };
    }
  }

  assert.fail(`missing closing brace after: ${marker}`);
}

function extractModeBlocks(source) {
  const mainMatch = stripGlslComments(source).match(/void\s+main\s*\(\s*\)/);
  const modeSource = mainMatch
    ? extractBracedBlock(source, /void\s+main\s*\(\s*\)/).body
    : source;
  const executableModeSource = stripGlslComments(modeSource);
  const frost = extractBracedBlock(
    executableModeSource,
    /\bif\s*\(\s*uMode\s*<\s*0\.5\s*\)/,
  );
  const mercury = extractBracedBlock(
    executableModeSource,
    /\belse\s+if\s*\(\s*uMode\s*<\s*1\.5\s*\)/,
    frost.end,
  );
  const membrane = extractBracedBlock(
    executableModeSource,
    /\belse\b(?!\s+if\b)/,
    mercury.end,
  );
  assert.equal(braceDepthAt(executableModeSource, frost.markerStart), 0);
  assert.equal(braceDepthAt(executableModeSource, mercury.markerStart), 0);
  assert.equal(braceDepthAt(executableModeSource, membrane.markerStart), 0);
  assert.equal(
    executableModeSource.slice(mercury.end, membrane.markerStart).trim(),
    '',
    'mode 2 must be the immediate final fallback branch',
  );
  return {
    frost: modeSource.slice(frost.start + 1, frost.end - 1),
    mercury: modeSource.slice(mercury.start + 1, mercury.end - 1),
    membrane: modeSource.slice(membrane.start + 1, membrane.end - 1),
  };
}

function assertVec3Constant(source, name, values) {
  const components = values
    .map((value) => value.replaceAll('.', '\\.'))
    .join('\\s*,\\s*');
  assert.match(
    source,
    new RegExp(
      `\\bconst\\s+vec3\\s+${name}\\s*=\\s*vec3\\(\\s*${components}\\s*\\)\\s*;`,
    ),
  );
}

const vertexShaderSource = extractShaderStage('FACET_VERTEX_SHADER');
const fragmentShaderSource = extractShaderStage('FACET_FRAGMENT_SHADER');

describe('Cryogenic Pearl shaders', () => {
  it('guards degenerate facet normals in both shader stages', () => {
    for (const stageSource of [vertexShaderSource, fragmentShaderSource]) {
      const safeNormal = extractBracedBlock(
        stageSource,
        /vec3\s+safeFacetNormal\s*\(\s*vec3\s+candidate,\s*vec3\s+fallbackDirection\s*\)/,
      ).body;
      assert.match(
        safeNormal,
        /float\s+normalLength\s*=\s*length\(candidate\)/,
      );
      assert.match(
        safeNormal,
        /if\s*\(\s*normalLength\s*<=\s*0\.0001\s*\)\s*\{\s*return\s+fallbackDirection\s*;/,
      );
      assert.match(
        safeNormal,
        /return\s+candidate\s*\/\s*max\(normalLength,\s*0\.0001\)/,
      );
    }

    assert.match(
      vertexShaderSource,
      /vNormal\s*=\s*safeFacetNormal\(transformedNormal,\s*vec3\(0\.0,\s*0\.0,\s*1\.0\)\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec3\s+faceNormal\s*=\s*safeFacetNormal\(orientedNormal,\s*fallbackNormal\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec3\s+fallbackNormal\s*=\s*gl_FrontFacing\s*\?\s*vec3\(0\.0,\s*0\.0,\s*1\.0\)\s*:\s*vec3\(0\.0,\s*0\.0,\s*-1\.0\)/,
    );
    assert.doesNotMatch(vertexShaderSource, /vNormal\s*=\s*normalize\(/);
    assert.doesNotMatch(fragmentShaderSource, /faceNormal\s*=\s*normalize\(/);
  });

  it('uses restrained camera edges in frosted reconstruction', () => {
    const { frost } = extractModeBlocks(fragmentShaderSource);
    assert.match(
      frost,
      /float\s+frostEdge\s*=\s*edge\s*\*\s*\(\s*0\.035\s*\+\s*energy\s*\*\s*0\.045\s*\)/,
    );
    assert.match(
      frost,
      /frost\s*=\s*mix\(\s*frost,\s*ICE_WHITE,\s*frostEdge\s*\)/,
    );
  });

  it('shifts the frosted ridge position with facet grazing angle', () => {
    const { frost } = extractModeBlocks(fragmentShaderSource);
    assert.match(
      frost,
      /float\s+ridgeCoordinate\s*=\s*sourceUv\.x\s*\+\s*sourceUv\.y\s*\*\s*0\.62\s*\+\s*grazing\s*\*\s*0\.09/,
    );
    assert.match(
      frost,
      /float\s+ridgeWave\s*=\s*sin\(\s*ridgeCoordinate\s*\*\s*15\.0\s*-\s*uTime\s*\*\s*0\.42\s*\)/,
    );
  });

  it('widens the mercury sweep with a bounded grazing response', () => {
    const { mercury } = extractModeBlocks(fragmentShaderSource);
    assert.match(
      mercury,
      /float\s+sweepWidth\s*=\s*mix\(\s*0\.035,\s*0\.070,\s*grazing\s*\)/,
    );
    assert.match(
      mercury,
      /smoothstep\(\s*sweepWidth,\s*sweepWidth\s*\+\s*0\.075,/,
    );
  });

  it('declares the exact palette and derives the shared optical foundation', () => {
    assert.match(fragmentShaderSource, /uniform\s+float\s+uMotion\s*;/);
    assertVec3Constant(
      fragmentShaderSource,
      'OPTICAL_INK',
      ['0.03137255', '0.05098039', '0.07450980'],
    );
    assertVec3Constant(
      fragmentShaderSource,
      'ICE_WHITE',
      ['0.93725490', '0.98823529', '1.00000000'],
    );
    assertVec3Constant(
      fragmentShaderSource,
      'COOL_SILVER',
      ['0.70588235', '0.77647059', '0.83137255'],
    );
    assertVec3Constant(
      fragmentShaderSource,
      'PEARL',
      ['0.92549020', '0.91372549', '1.00000000'],
    );
    assertVec3Constant(
      fragmentShaderSource,
      'CYAN_INTERFERENCE',
      ['0.44313725', '0.94509804', '0.95294118'],
    );
    assertVec3Constant(
      fragmentShaderSource,
      'VIOLET_INTERFERENCE',
      ['0.50196078', '0.43137255', '1.00000000'],
    );
    assert.match(
      fragmentShaderSource,
      /float\s+energy\s*=\s*clamp\(\s*uMotion,\s*0\.0,\s*1\.0\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /float\s+facing\s*=\s*clamp\(\s*abs\(dot\(faceNormal,\s*viewDirection\)\),\s*0\.0,\s*1\.0\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /float\s+grazing\s*=\s*1\.0\s*-\s*facing/,
    );

    const caustic = extractBracedBlock(
      fragmentShaderSource,
      /vec2\s+causticVector\s*\(\s*vec2\s+uv,\s*float\s+energy,\s*float\s+grazing\s*\)/,
    ).body;
    assert.match(caustic, /uTime/);
    assert.match(caustic, /\buv\b/);
    assert.match(caustic, /\benergy\b/);
    assert.match(caustic, /\bgrazing\b/);
    assert.match(
      fragmentShaderSource,
      /vec2\s+caustic\s*=\s*causticVector\(\s*sourceUv,\s*energy,\s*grazing\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec2\s+opticalUv\s*=\s*safeUv\(\s*sourceUv\s*\+\s*caustic\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec3\s+centerColor\s*=\s*sampleVideo\(\s*opticalUv\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /float\s+luma\s*=\s*facetLuminance\(\s*centerColor\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /float\s+leftLuma\s*=\s*sampleLuma\(\s*opticalUv\s*-\s*vec2\(\s*pixel\.x\s*\*\s*1\.5,\s*0\.0\s*\)\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /float\s+upLuma\s*=\s*sampleLuma\(\s*opticalUv\s*\+\s*vec2\(\s*0\.0,\s*pixel\.y\s*\*\s*1\.5\s*\)\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec2\s+gradient\s*=\s*vec2\(\s*rightLuma\s*-\s*leftLuma,\s*upLuma\s*-\s*downLuma\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /float\s+edge\s*=\s*clamp\(\s*length\(gradient\)\s*\*\s*4\.4,\s*0\.0,\s*1\.0\s*\)/,
    );
  });

  it('implements exactly three executable phases with no legacy treatments', () => {
    let unclaimedModeSource = stripGlslComments(fragmentShaderSource);
    unclaimedModeSource = removeSinglePattern(
      unclaimedModeSource,
      /\buniform\s+float\s+uMode\s*;/g,
      'uMode declaration',
    );
    unclaimedModeSource = removeSinglePattern(
      unclaimedModeSource,
      /\bif\s*\(\s*uMode\s*<\s*0\.5\s*\)/g,
      'frost threshold',
    );
    unclaimedModeSource = removeSinglePattern(
      unclaimedModeSource,
      /\belse\s+if\s*\(\s*uMode\s*<\s*1\.5\s*\)/g,
      'mercury threshold',
    );
    assert.doesNotMatch(
      unclaimedModeSource,
      /\buMode\b/,
      'uMode may only select the three approved top-level phases',
    );

    const { frost, mercury, membrane } = extractModeBlocks(fragmentShaderSource);
    assert.match(frost, /mode\s+0:\s*frosted diffusion/);
    assert.match(mercury, /mode\s+1:\s*liquid mercury/);
    assert.match(membrane, /mode\s+2:\s*interference membrane/);
    assert.deepEqual(
      [...fragmentShaderSource.matchAll(/mode\s+([0-9]):/g)].map(
        (match) => match[1],
      ),
      ['0', '1', '2'],
    );
    assert.doesNotMatch(
      fragmentShaderSource,
      /\b(?:POLKA\w*|INDIGO|BRICK|COOL_PAPER|CHROME\w*|cyanotype|stipple|riso|print)\b|liquid\s+chrome/i,
    );
  });

  it('feeds every phase from the shared camera, edge, caustic, motion, angle, and idle signals', () => {
    const { frost, mercury, membrane } = extractModeBlocks(fragmentShaderSource);
    const phaseContracts = [
      {
        name: 'frost',
        block: frost,
        camera: /frostLuma\s*=\s*facetLuminance\(\s*frostSample\s*\)/,
        edge: /frostEdge\s*=\s*edge\s*\*/,
        caustic: /sampleVideo\(\s*opticalUv/,
        idle: /ridgeWave\s*=\s*sin\([^;]*uTime/,
        energy: /blurPixels\s*=\s*mix\([^;]*energy/,
        grazing: /ridgeCoordinate\s*=[^;]*grazing/,
        local: /ridgeCoordinate\s*=\s*sourceUv/,
      },
      {
        name: 'mercury',
        block: mercury,
        camera: /smoothstep\(\s*0\.04,\s*0\.72,\s*luma\s*\)/,
        edge: /mix\(\s*mercury,\s*PEARL,\s*edge\s*\*/,
        caustic: /caustic\.[xy]/,
        idle: /uTime\s*\*\s*\(\s*0\.045/,
        energy: /sweepCoordinate\s*=[^;]*energy/,
        grazing: /sweepWidth\s*=\s*mix\([^;]*grazing/,
        local: /sweepCoordinate\s*=\s*opticalUv/,
      },
      {
        name: 'membrane',
        block: membrane,
        camera: /smoothstep\(\s*0\.04,\s*0\.90,\s*luma\s*\)/,
        edge: /edge\s*\*\s*\(\s*0\.08/,
        caustic: /sampleLuma\(\s*opticalUv\s*\+\s*separation\s*\)/,
        idle: /film\s*=[^;]*uTime/,
        energy: /separationPixels\s*=\s*mix\([^;]*energy/,
        grazing: /separationPixels\s*=\s*mix\([^;]*grazing/,
        local: /film\s*=[^;]*sourceUv/,
      },
    ];

    for (const phase of phaseContracts) {
      assert.match(phase.block, phase.camera, `${phase.name}: camera luma`);
      assert.match(phase.block, phase.edge, `${phase.name}: camera edges`);
      assert.match(phase.block, phase.caustic, `${phase.name}: shared caustic`);
      assert.match(phase.block, phase.idle, `${phase.name}: restrained idle time`);
      assert.match(phase.block, phase.energy, `${phase.name}: motion energy`);
      assert.match(phase.block, phase.grazing, `${phase.name}: facet angle`);
      assert.match(phase.block, phase.local, `${phase.name}: local coordinates`);
    }
  });

  it('routes each phase reconstruction into the final bounded color', () => {
    const { frost, mercury, membrane } = extractModeBlocks(fragmentShaderSource);
    assertTerminalColorAssignment(
      frost,
      /\bcolor\s*=\s*mix\(\s*frost,\s*PEARL,\s*ridge\s*\*\s*\(\s*0\.12\s*\+\s*grazing\s*\*\s*0\.12\s*\)\s*\)\s*;\s*$/,
      'frost',
    );
    assertTerminalColorAssignment(
      mercury,
      /\bcolor\s*=\s*mix\(\s*mercury,\s*ICE_WHITE,\s*specularSweep\s*\*\s*\(\s*0\.48\s*\+\s*grazing\s*\*\s*0\.28\s*\)\s*\)\s*;\s*$/,
      'mercury',
    );
    assertTerminalColorAssignment(
      membrane,
      /\bcolor\s*=\s*mix\(\s*membrane,\s*PEARL,\s*film\s*\*\s*0\.08\s*\)\s*;\s*$/,
      'membrane',
    );

    const main = extractBracedBlock(
      fragmentShaderSource,
      /void\s+main\s*\(\s*\)/,
    ).body;
    assert.equal(findColorMutations(main).length, 4);
    assert.match(
      main,
      /color\s*=\s*clamp\(\s*color\s*\*\s*\(\s*faceLight\s*\+\s*depthLift\s*\),\s*OPTICAL_INK,\s*vec3\(1\.0\)\s*\)/,
    );
  });

  it('whitelists every restrained idle-time use and membrane weight', () => {
    let unclaimedTimeSource = stripGlslComments(fragmentShaderSource);
    unclaimedTimeSource = removeSinglePattern(
      unclaimedTimeSource,
      /\buniform\s+float\s+uTime\s*;/g,
      'uTime declaration',
    );
    assert.equal(
      (unclaimedTimeSource.match(/\buTime\b/g) ?? []).length,
      4,
      'the shader must have exactly four approved idle-time uses',
    );

    const approvedTimeUses = [
      {
        label: 'caustic drift',
        pattern: /\bfloat\s+phase\s*=\s*uTime\s*\*\s*0\.18\s*;/g,
      },
      {
        label: 'frost ridge drift',
        pattern:
          /\bfloat\s+ridgeWave\s*=\s*sin\(\s*ridgeCoordinate\s*\*\s*15\.0\s*-\s*uTime\s*\*\s*0\.42\s*\)\s*;/g,
      },
      {
        label: 'mercury sweep drift',
        pattern:
          /\bfloat\s+sweepPosition\s*=\s*fract\(\s*uTime\s*\*\s*\(\s*0\.045\s*\+\s*energy\s*\*\s*0\.025\s*\)\s*\+\s*grazing\s*\*\s*0\.22\s*\)\s*\*\s*1\.55\s*-\s*0\.25\s*;/g,
      },
      {
        label: 'membrane film drift',
        pattern:
          /\bfloat\s+film\s*=\s*0\.5\s*\+\s*0\.5\s*\*\s*sin\(\s*\(\s*sourceUv\.x\s*\*\s*0\.8\s*\+\s*sourceUv\.y\s*\)\s*\*\s*18\.0\s*\+\s*uTime\s*\*\s*0\.30\s*\)\s*;/g,
      },
    ];
    for (const approvedUse of approvedTimeUses) {
      unclaimedTimeSource = removeSinglePattern(
        unclaimedTimeSource,
        approvedUse.pattern,
        approvedUse.label,
      );
    }
    assert.doesNotMatch(
      unclaimedTimeSource,
      /\buTime\b/,
      'every uTime use must match one approved low-frequency expression',
    );

    const { membrane } = extractModeBlocks(fragmentShaderSource);
    const compactMembrane = compactGlsl(membrane);
    assert.equal(
      compactMembrane.endsWith('color=mix(membrane,PEARL,film*0.08);'),
      true,
      'membrane film must keep its approved restrained pearl weight',
    );
  });

  it('uses one clamped camera sampler pipeline', () => {
    const samplers = [
      ...fragmentShaderSource.matchAll(
        /uniform\s+sampler2D\s+([A-Za-z_]\w*)\s*;/g,
      ),
    ].map((match) => match[1]);
    assert.deepEqual(samplers, ['uVideo']);

    const safeUv = extractBracedBlock(
      fragmentShaderSource,
      /vec2\s+safeUv\s*\(\s*vec2\s+uv\s*\)/,
    ).body;
    assert.match(
      safeUv,
      /return\s+clamp\(\s*uv,\s*vec2\(0\.001\),\s*vec2\(0\.999\)\s*\)/,
    );

    const executableFragment = stripGlslComments(fragmentShaderSource);
    const sampleVideo = extractBracedBlock(
      executableFragment,
      /vec3\s+sampleVideo\s*\(\s*vec2\s+([A-Za-z_]\w*)\s*\)/,
    );
    const sampleParameter = sampleVideo.markerMatch[1];
    assert.equal(
      compactGlsl(sampleVideo.body),
      `returntexture2D(uVideo,safeUv(${sampleParameter})).rgb;`,
      'sampleVideo must contain only the approved clamped return',
    );

    let isolatedCameraSource =
      executableFragment.slice(0, sampleVideo.markerStart)
      + executableFragment.slice(sampleVideo.end);
    isolatedCameraSource = removeSinglePattern(
      isolatedCameraSource,
      /\buniform\s+sampler2D\s+uVideo\s*;/g,
      'uVideo declaration',
    );
    assert.doesNotMatch(
      isolatedCameraSource,
      /\buVideo\b/,
      'uVideo may only appear in its declaration and sampleVideo',
    );
    assert.doesNotMatch(
      isolatedCameraSource,
      /\b(?:texture[A-Za-z0-9_]*|texelFetch[A-Za-z0-9_]*)\s*\(/,
      'texture built-ins may only appear in sampleVideo',
    );
    assert.match(
      fragmentShaderSource,
      /float\s+sampleLuma\s*\(\s*vec2\s+uv\s*\)\s*\{\s*return\s+facetLuminance\(sampleVideo\(uv\)\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec2\s+opticalUv\s*=\s*safeUv\(\s*sourceUv\s*\+\s*caustic\s*\)/,
    );
    assert.match(
      fragmentShaderSource,
      /vec2\s+pixel\s*=\s*1\.0\s*\/\s*max\(\s*uViewport,\s*vec2\(1\.0\)\s*\)/,
    );
    assert.doesNotMatch(fragmentShaderSource, /,\s*\)/);
    assert.match(
      fragmentShaderSource,
      /gl_FragColor\s*=\s*vec4\(\s*color,\s*uOpacity\s*\)/,
    );
    assert.match(componentSource, /\n\s+depthWrite\n/);
  });

  it('keeps membrane direction and final color numerically bounded', () => {
    const compactFragment = compactGlsl(fragmentShaderSource);
    assert.match(
      compactFragment,
      /floatgradientMagnitude=max\(length\(gradient\),0\.0001\);/,
    );
    assert.match(
      compactFragment,
      /vec2gradientDirection=gradient\/gradientMagnitude;/,
    );
    assert.doesNotMatch(compactFragment, /normalize\(gradient/);
    assert.match(
      compactFragment,
      /color=clamp\(color\*\(faceLight\+depthLift\),OPTICAL_INK,vec3\(1\.0\)\);/,
    );
  });

  it('keeps the removed ASCII pipeline absent', () => {
    assert.doesNotMatch(shaderSource, /uAscii|ASCII|Ascii|ascii/);
    assert.doesNotMatch(componentSource, /uAscii|ASCII|Ascii|ascii/);
    assert.equal(
      existsSync(new URL('./facetedWindowVisuals.mjs', import.meta.url)),
      false,
    );
    assert.equal(
      existsSync(new URL('./facetedWindowVisuals.test.mjs', import.meta.url)),
      false,
    );
  });
});

describe('three-facet renderer contract', () => {
  it('creates three stable meshes with one shared motion uniform', () => {
    const modes = componentSource.match(
      /const FACET_MODES = \[([^\]]+)\] as const/,
    );
    assert.ok(modes);
    assert.deepEqual(
      modes[1].split(',').map((mode) => Number(mode.trim())),
      [0, 1, 2],
    );
    assert.match(componentSource, /uMotion: \{ value: number \}/);
    assert.match(componentSource, /uMotion: \{ value: 0 \}/);
    assert.match(componentSource, /material\.uniforms\.uMotion\.value = motionEnergyRef\.current/);
  });

  it('updates lifecycle state only from changed results or dimensions', () => {
    assert.match(componentSource, /motionAnchorsForCurrentHands/);
    assert.match(componentSource, /updateMotionSampleLifecycle/);
    assert.match(componentSource, /expireStaleMotionTarget/);
    assert.match(componentSource, /dampMotionEnergy/);
    assert.match(componentSource, /useFrame\(\(frameState, deltaSeconds\) =>/);
    assert.match(
      componentSource,
      /if \(resultChanged \|\| dimensionsChanged\) \{[\s\S]*?updateMotionSampleLifecycle\(/,
    );
    assert.match(
      componentSource,
      /motionTargetRef\.current = expireStaleMotionTarget\(/,
    );
    assert.match(
      componentSource,
      /motionAnchorsForCurrentHands\([\s\S]*?facetedState\.pair,[\s\S]*?motionMetrics,[\s\S]*?handInputs\.length/,
    );
    assert.doesNotMatch(
      componentSource,
      /!resultChanged \|\| handInputs\.length >= 2/,
    );
  });

  it('uses the approved pearl seam and one rendering surface', () => {
    assert.match(componentSource, /const PEARL_SEAM = '#EAF5FF'/);
    assert.doesNotMatch(componentSource, /BLUSH|#F8BCB2/);
    assert.match(
      componentSource,
      /seamMaterial\.opacity = renderOpacity \* 0\.55/,
    );
    assert.equal((componentSource.match(/new THREE\.VideoTexture/g) ?? []).length, 1);
    assert.equal((componentSource.match(/<Canvas\b/g) ?? []).length, 1);
  });
});
