// GLSL shaders for UniverseMode.
//
// Point-sprite path (dark theme): per-vertex color * alpha multiplied by a
// circular texture so each star reads as a soft luminous disc.
//
// Line-polygon path (light theme): each star is a small wireframe tetrahedron
// drawn with per-vertex color + alpha so dimmed (filter-mismatched) stars fade
// out without rebuilding geometry.

export const vertexShader = `
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
export const fragmentShader = `
  uniform sampler2D pointTexture;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 t = texture2D(pointTexture, gl_PointCoord);
    gl_FragColor = vec4(vColor, vAlpha) * t;
  }
`;

// --- Line-polygon shader (light theme) ---
// Each star becomes a small wireframe tetrahedron. Per-vertex color + alpha
// so dimmed (filter-mismatched) stars fade out without rebuilding geometry.
export const lineVertexShader = `
  attribute float alpha;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
export const lineFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;
