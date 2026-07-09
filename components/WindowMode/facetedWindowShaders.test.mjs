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

describe('faceted window print shaders', () => {
  it('preserves the approved indigo and brick print treatments', () => {
    assert.match(shaderSource, /mode 1: indigo riso cyanotype/);
    assert.match(shaderSource, /mode 3: brick elliptical stipple/);
    assert.match(shaderSource, /const vec3 INDIGO/);
    assert.match(shaderSource, /const vec3 BRICK/);
  });

  it('removes the rejected optical treatment branches', () => {
    assert.doesNotMatch(shaderSource, /restrained prism window/);
    assert.doesNotMatch(shaderSource, /four-tone contour window/);
    assert.doesNotMatch(shaderSource, /lenticular camera strips/);
  });

  it('renders a camera-reactive violet and white polka face', () => {
    assert.match(shaderSource, /mode 0: camera-reactive violet polka/);
    assert.match(shaderSource, /const vec3 POLKA_VIOLET/);
    assert.match(shaderSource, /const vec3 POLKA_WHITE/);
    assert.match(shaderSource, /float polkaAmount = clamp\(1\.0 - luma/);
    assert.match(shaderSource, /color = mix\(POLKA_WHITE, POLKA_VIOLET, dotMask\)/);
  });

  it('renders the former green face as camera-reactive liquid chrome', () => {
    assert.match(shaderSource, /mode 2: camera-reactive liquid chrome/);
    assert.match(shaderSource, /const vec3 CHROME_DARK/);
    assert.match(shaderSource, /const vec3 CHROME_SILVER/);
    assert.match(shaderSource, /const vec3 CHROME_CYAN/);
    assert.match(shaderSource, /const vec3 CHROME_VIOLET/);
    assert.match(shaderSource, /float specularSweep/);
  });

  it('removes the ASCII canvas and texture pipeline entirely', () => {
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
    assert.match(shaderSource, /gl_FragColor = vec4\(color, uOpacity\)/);
    assert.match(componentSource, /\n\s+depthWrite\n/);
  });
});
