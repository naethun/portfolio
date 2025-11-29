'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ============================================================================
// Type Definitions
// ============================================================================

type Vec4 = [number, number, number, number];
type Vec3 = [number, number, number];
type Edge = [number, number];

// ============================================================================
// 4D Hypercube Generation
// ============================================================================

/**
 * Generates all 16 vertices of a unit tesseract (4D hypercube).
 * Each vertex is a point in 4D space with coordinates (�1, �1, �1, �1).
 */
function generateVertices(): Vec4[] {
  const vertices: Vec4[] = [];
  const scale = 1.2; // Scale factor - kept within bounds to prevent edge clipping

  // Use bit manipulation to generate all 16 combinations of ±scale
  for (let i = 0; i < 16; i++) {
    vertices.push([
      (i & 1) ? scale : -scale,   // x: bit 0
      (i & 2) ? scale : -scale,   // y: bit 1
      (i & 4) ? scale : -scale,   // z: bit 2
      (i & 8) ? scale : -scale,   // w: bit 3
    ]);
  }

  return vertices;
}

/**
 * Generates all 32 edges of a tesseract.
 * An edge connects two vertices that differ in exactly one coordinate.
 */
function generateEdges(vertices: Vec4[]): Edge[] {
  const edges: Edge[] = [];

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      // Count how many coordinates differ between the two vertices
      let diffCount = 0;
      for (let k = 0; k < 4; k++) {
        if (vertices[i][k] !== vertices[j][k]) {
          diffCount++;
        }
      }

      // If exactly one coordinate differs, they're connected by an edge
      if (diffCount === 1) {
        edges.push([i, j]);
      }
    }
  }

  return edges;
}

// Generate constant vertex and edge data
const TESSERACT_VERTICES = generateVertices();
const TESSERACT_EDGES = generateEdges(TESSERACT_VERTICES);

// ============================================================================
// 4D Rotation Functions
// ============================================================================

/**
 * Rotates a 4D point in the XW plane.
 * This rotation brings the 4th dimension (W) into view, creating the primary "4D effect".
 */
function rotateXW(point: Vec4, angle: number): Vec4 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    point[0] * cos - point[3] * sin,  // x' = x*cos - w*sin
    point[1],                          // y unchanged
    point[2],                          // z unchanged
    point[0] * sin + point[3] * cos,  // w' = x*sin + w*cos
  ];
}

/**
 * Rotates a 4D point in the YW plane.
 * This adds additional 4D complexity to the rotation.
 */
function rotateYW(point: Vec4, angle: number): Vec4 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    point[0],                          // x unchanged
    point[1] * cos - point[3] * sin,  // y' = y*cos - w*sin
    point[2],                          // z unchanged
    point[1] * sin + point[3] * cos,  // w' = y*sin + w*cos
  ];
}

/**
 * Rotates a 4D point in the ZW plane.
 * This adds additional 4D rotation complexity.
 */
function rotateZW(point: Vec4, angle: number): Vec4 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    point[0],                          // x unchanged
    point[1],                          // y unchanged
    point[2] * cos - point[3] * sin,  // z' = z*cos - w*sin
    point[2] * sin + point[3] * cos,  // w' = z*sin + w*cos
  ];
}

/**
 * Rotates a 4D point in the XY plane (traditional 3D rotation).
 * This adds familiar spinning motion.
 */
function rotateXY(point: Vec4, angle: number): Vec4 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    point[0] * cos - point[1] * sin,  // x' = x*cos - y*sin
    point[0] * sin + point[1] * cos,  // y' = x*sin + y*cos
    point[2],                          // z unchanged
    point[3],                          // w unchanged
  ];
}

// ============================================================================
// 4D to 3D Projection
// ============================================================================

/**
 * Projects a 4D point to 3D space using perspective projection.
 * Points with larger W coordinates appear closer (scaled up).
 *
 * @param point - The 4D point to project
 * @param distance - The viewing distance (default: 4.0)
 */
function project4Dto3D(point: Vec4, distance: number = 4.0): Vec3 {
  // Perspective division: scale by distance/(distance - w)
  // This makes points "closer" in 4D space appear larger in 3D
  // With distance=4.0: inner cube (w=-1) scales to 0.8x, outer cube (w=+1) scales to 1.33x
  const scale = distance / (distance - point[3]);

  return [
    point[0] * scale,
    point[1] * scale,
    point[2] * scale,
  ];
}

// ============================================================================
// TesseractMesh Component
// ============================================================================

interface TesseractMeshProps {
  reducedMotion: boolean;
}

function TesseractMesh({ reducedMotion }: TesseractMeshProps) {
  const lineRef = useRef<THREE.LineSegments>(null);

  // Rotation angles in different 4D planes
  const rotationRef = useRef({
    xw: 0,
    yw: 0,
    zw: 0,
    xy: 0,
  });

  // Create the geometry once and reuse it
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // 32 edges � 2 vertices per edge � 3 coordinates (x, y, z) = 192 floats
    const positions = new Float32Array(TESSERACT_EDGES.length * 2 * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, []);

  // Animation loop
  useFrame((_state, delta) => {
    if (!lineRef.current) return;

    // Apply speed multiplier for reduced motion (10% speed if preferred)
    const speedMultiplier = reducedMotion ? 0.1 : 1.0;

    // Update rotation angles at different speeds for non-periodic, dynamic motion
    rotationRef.current.xw += delta * 0.4 * speedMultiplier;  // Primary 4D rotation
    rotationRef.current.yw += delta * 0.3 * speedMultiplier;  // Secondary 4D rotation
    rotationRef.current.zw += delta * 0.4 * speedMultiplier;  // Tertiary 4D rotation
    rotationRef.current.xy += delta * 0.25 * speedMultiplier; // Traditional 3D spin

    // Apply rotations to all vertices and project to 3D
    const projectedVertices: Vec3[] = TESSERACT_VERTICES.map((vertex) => {
      // Apply all four rotations in sequence for complete 4D tumbling
      let rotated = rotateXW(vertex, rotationRef.current.xw);
      rotated = rotateYW(rotated, rotationRef.current.yw);
      rotated = rotateZW(rotated, rotationRef.current.zw);
      rotated = rotateXY(rotated, rotationRef.current.xy);

      // Project from 4D to 3D
      return project4Dto3D(rotated);
    });

    // Update the geometry's position buffer with edge endpoints
    const positions = geometry.attributes.position.array as Float32Array;

    TESSERACT_EDGES.forEach(([vertexA, vertexB], edgeIndex) => {
      const baseIndex = edgeIndex * 6; // 2 vertices � 3 coords per edge

      // First vertex of the edge
      positions[baseIndex + 0] = projectedVertices[vertexA][0];
      positions[baseIndex + 1] = projectedVertices[vertexA][1];
      positions[baseIndex + 2] = projectedVertices[vertexA][2];

      // Second vertex of the edge
      positions[baseIndex + 3] = projectedVertices[vertexB][0];
      positions[baseIndex + 4] = projectedVertices[vertexB][1];
      positions[baseIndex + 5] = projectedVertices[vertexB][2];
    });

    // Tell Three.js to update the geometry on the GPU
    geometry.attributes.position.needsUpdate = true;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color="#d4c5a9"
        opacity={0.9}
        transparent
        toneMapped={false}
      />
    </lineSegments>
  );
}

// ============================================================================
// Main Tesseract Component
// ============================================================================

export default function Tesseract() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: [0, 0, 7],  // Moved back from 5 to 7 for better framing
          fov: 60,              // Widened from 50 to 60 for better view
          near: 0.1,
          far: 100,
        }}
        gl={{
          alpha: true,
          antialias: true,
        }}
        style={{
          background: 'transparent',
        }}
      >
        <TesseractMesh reducedMotion={prefersReducedMotion} />
      </Canvas>
    </div>
  );
}
