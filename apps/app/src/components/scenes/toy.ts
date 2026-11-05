/**
 * The toy kit: what every diorama on the home page is drawn with.
 *
 * Parts are flat-shaded in three tones of one brand colour (a lit top, the colour itself and
 * a shade), and every part gets a black ink outline (an inverted hull), so a model reads
 * like the rest of the site: thick ink and flat colour. The camera is orthographic, so the
 * outline is the same width everywhere. Colours come from the CSS tokens on the page.
 */
import {
  BackSide,
  BufferGeometry,
  Matrix4,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  CylinderGeometry,
  Group,
  Mesh,
  Object3D,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export type RGB = [number, number, number];

/** Brand colours a part can be painted in, read from the page's CSS tokens. */
export type Swatch =
  "panel" | "primary" | "sky" | "lead" | "mat" | "grass" | "ink" | "muted" | "steel" | "page";

const TOKEN: Record<Swatch, string> = {
  panel: "--panel",
  primary: "--primary",
  sky: "--sky",
  lead: "--lead",
  mat: "--mat",
  grass: "--mat-grid",
  ink: "--foreground",
  muted: "--muted",
  steel: "--muted-foreground",
  page: "--background",
};

/** How much lighter a part's top is, and how much darker its shaded side. */
const LIFT: Partial<Record<Swatch, number>> = { ink: 0.2, steel: 0.22, mat: 0.18 };
const SINK: Partial<Record<Swatch, number>> = { ink: 0, panel: 0.14, muted: 0.16 };

function parse(value: string, context: CanvasRenderingContext2D): RGB {
  context.fillStyle = "#000";
  context.fillStyle = value.trim();
  const hex = context.fillStyle; // the canvas normalises any CSS colour to #rrggbb
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;
}

export function readPalette(element: Element): Record<Swatch, RGB> {
  const style = getComputedStyle(element);
  const context = document.createElement("canvas").getContext("2d");
  if (!context) throw new Error("No 2D canvas to read colours with");
  const palette = {} as Record<Swatch, RGB>;
  for (const swatch of Object.keys(TOKEN) as Swatch[]) {
    palette[swatch] = parse(style.getPropertyValue(TOKEN[swatch]), context);
  }
  return palette;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/* ----------------------------------------------------------------- shaders */

// World-space normal: three's normalMatrix is in view space, and the view is a pure rotation.
const TOON_VERTEX = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = (vec4(normalMatrix * normal, 0.0) * viewMatrix).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Three flat tones by facing, with the band edges antialiased on curved surfaces.
const TOON_FRAGMENT = /* glsl */ `
uniform vec3 uLit;
uniform vec3 uBase;
uniform vec3 uShade;
uniform vec3 uLight;
uniform float uOpacity;
varying vec3 vNormal;
void main() {
  float d = dot(normalize(vNormal), uLight);
  float aa = fwidth(d) * 0.8;
  vec3 c = mix(uShade, uBase, smoothstep(0.3 - aa, 0.3 + aa, d));
  c = mix(c, uLit, smoothstep(0.74 - aa, 0.74 + aa, d));
  gl_FragColor = vec4(c, uOpacity);
}`;

const INK_VERTEX = /* glsl */ `
uniform float uWidth;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  mv.xyz += normalize(normalMatrix * normal) * uWidth;
  gl_Position = projectionMatrix * mv;
}`;

const INK_FRAGMENT = /* glsl */ `
uniform vec3 uInk;
void main() {
  gl_FragColor = vec4(uInk, 1.0);
}`;

/* --------------------------------------------------------------------- kit */

export interface PartOptions {
  /** Draw the ink outline (default true). Off for markings painted on a surface. */
  ink?: boolean;
  /** For see-through parts such as a prop disc: no outline, drawn after the solids. */
  opacity?: number;
  /** Paint every face in one of the three tones, for shadows and flat markings. */
  tone?: "lit" | "base" | "shade";
}

export interface Kit {
  palette: Record<Swatch, RGB>;
  /** A mesh in one swatch, with its ink outline. */
  part(geometry: BufferGeometry, swatch: Swatch, options?: PartOptions): Mesh;
  /** A rounded box centred on the origin. */
  box(w: number, h: number, d: number, r?: number): BufferGeometry;
  /** A cylinder along Y, centred on the origin. */
  cylinder(rTop: number, rBottom: number, h: number, segments?: number): BufferGeometry;
  sphere(r: number, segments?: number): BufferGeometry;
  /**
   * A flat, see-through ink shadow. Its pieces are blended once per pixel (a stencil), so
   * where two of them overlap the shadow doesn't get darker.
   */
  shadow: Material;
  /**
   * Merges every solid under `group` into one mesh per colour plus one for all the ink, so
   * a scene draws in a handful of calls. Anything marked `live(object)` (and everything
   * under it) is left alone to move, and so is anything see-through.
   */
  bake(group: Object3D): void;
}

/** Marks a part as moving, so `bake` leaves it out. */
export function live<T extends Object3D>(object: T): T {
  object.userData.live = true;
  return object;
}

/** One unit of light: from above, a little left and in front, as on the rest of the site. */
const LIGHT = new Vector3(-0.35, 1, 0.55).normalize();

export function createKit(palette: Record<Swatch, RGB>, width: { value: number }): Kit {
  const light = { value: LIGHT };
  const ink = { value: palette.ink };
  const materials = new Map<string, Material>();
  const hulls = new WeakMap<BufferGeometry, BufferGeometry>();

  const toon = (swatch: Swatch, opacity = 1, tone?: PartOptions["tone"]) => {
    const key = `${swatch}:${opacity}:${tone}`;
    let material = materials.get(key);
    if (!material) {
      const base = palette[swatch];
      const tones = {
        lit: mix(base, [1, 1, 1], LIFT[swatch] ?? 0.3),
        base,
        shade: mix(base, palette.ink, SINK[swatch] ?? 0.24),
      };
      material = new ShaderMaterial({
        vertexShader: TOON_VERTEX,
        fragmentShader: TOON_FRAGMENT,
        uniforms: {
          uLit: { value: tone ? tones[tone] : tones.lit },
          uBase: { value: tone ? tones[tone] : tones.base },
          uShade: { value: tone ? tones[tone] : tones.shade },
          uLight: light,
          uOpacity: { value: opacity },
        },
        transparent: opacity < 1,
        depthWrite: opacity >= 1,
      });
      materials.set(key, material);
    }
    return material;
  };

  const outline = new ShaderMaterial({
    vertexShader: INK_VERTEX,
    fragmentShader: INK_FRAGMENT,
    uniforms: { uWidth: width, uInk: ink },
    side: BackSide,
  });

  const shadow = new ShaderMaterial({
    vertexShader: TOON_VERTEX,
    fragmentShader: TOON_FRAGMENT,
    uniforms: {
      uLit: ink,
      uBase: ink,
      uShade: ink,
      uLight: light,
      uOpacity: { value: 0.2 },
    },
    transparent: true,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: NotEqualStencilFunc,
    stencilZPass: ReplaceStencilOp,
  });

  // The hull needs one normal per corner, averaged across the faces that meet there, or it
  // splits open at hard edges.
  const hullOf = (geometry: BufferGeometry) => {
    let hull = hulls.get(geometry);
    if (!hull) {
      const bare = new BufferGeometry();
      bare.setAttribute("position", geometry.getAttribute("position"));
      if (geometry.index) bare.setIndex(geometry.index);
      hull = mergeVertices(bare, 1e-3);
      hull.computeVertexNormals();
      hulls.set(geometry, hull);
    }
    return hull;
  };

  return {
    palette,
    part(geometry, swatch, options = {}) {
      const opacity = options.opacity ?? 1;
      const mesh = new Mesh(geometry, toon(swatch, opacity, options.tone));
      if (opacity < 1) mesh.renderOrder = 2;
      else if (options.ink !== false) {
        const hull = new Mesh(hullOf(geometry), outline);
        hull.userData.ink = true;
        mesh.add(hull);
      }
      return mesh;
    },
    box(w, h, d, r = 0.04) {
      return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
    },
    cylinder(rTop, rBottom, h, segments = 24) {
      return new CylinderGeometry(rTop, rBottom, h, segments);
    },
    sphere(r, segments = 20) {
      return new SphereGeometry(r, segments, Math.round(segments * 0.75));
    },
    shadow,
    bake(group) {
      group.updateMatrixWorld(true);
      const local = new Matrix4().copy(group.matrixWorld).invert();
      const solids = new Map<Material, BufferGeometry[]>();
      const ink: BufferGeometry[] = [];
      const baked: Mesh[] = [];
      const visit = (object: Object3D) => {
        if (object !== group && object.userData.live) return;
        if (object instanceof Mesh && !(object.material as Material).transparent) {
          // Copies, so geometry shared with other parts isn't moved too.
          const source = object.geometry;
          let geometry = new BufferGeometry();
          geometry.setAttribute("position", source.getAttribute("position").clone());
          geometry.setAttribute("normal", source.getAttribute("normal").clone());
          if (source.index) geometry.setIndex(source.index.clone());
          // Ink is always indexed (welded for its normals); solids are merged unindexed.
          if (!object.userData.ink && geometry.index) geometry = geometry.toNonIndexed();
          const placed = geometry.applyMatrix4(
            new Matrix4().multiplyMatrices(local, object.matrixWorld),
          );
          if (object.userData.ink) ink.push(placed);
          else {
            const material = object.material as Material;
            solids.set(material, [...(solids.get(material) ?? []), placed]);
          }
          baked.push(object);
        }
        for (const child of object.children) visit(child);
      };
      visit(group);
      for (const mesh of baked) mesh.removeFromParent();
      for (const [material, geometries] of solids) {
        const merged = mergeGeometries(geometries);
        if (merged) group.add(new Mesh(merged, material));
      }
      const outlines = ink.length ? mergeGeometries(ink) : null;
      if (outlines) group.add(new Mesh(outlines, outline));
    },
  };
}

/* ------------------------------------------------------------------- stage */

export interface Diorama {
  root: Object3D;
  /**
   * Where the camera looks, and how much of the world must fit: `height` units top to
   * bottom and `width` across, whichever needs more room on the stage's shape.
   */
  view: {
    target: [number, number, number];
    height: number;
    width: number;
    azimuth: number;
    elevation: number;
  };
  /** Moves everything to time `t` (seconds). */
  tick(t: number): void;
  /** A moment that reads well as a still picture, for reduced motion. */
  still: number;
}

export type Build = (kit: Kit) => Diorama;

/** Ink width in CSS pixels. */
const INK_PX = 2.6;

/** Puts a diorama on a canvas. Returns controls to draw a frame, resize and clean up. */
export function stage(canvas: HTMLCanvasElement, build: Build) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const width = { value: 0.02 };
  const kit = createKit(readPalette(canvas), width);
  const diorama = build(kit);
  const scene = new Scene();
  scene.add(diorama.root);

  const { target, azimuth, elevation } = diorama.view;
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  const distance = 60;
  camera.position.set(
    target[0] + distance * Math.cos(e) * Math.sin(a),
    target[1] + distance * Math.sin(e),
    target[2] + distance * Math.cos(e) * Math.cos(a),
  );
  camera.lookAt(new Vector3(...target));

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    const height = Math.max(diorama.view.height, (diorama.view.width * h) / w);
    const half = height / 2;
    camera.top = half;
    camera.bottom = -half;
    camera.left = (-half * w) / h;
    camera.right = (half * w) / h;
    camera.updateProjectionMatrix();
    width.value = (INK_PX * height) / h;
  }

  function draw(t: number) {
    diorama.tick(t);
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        (object.material as Material).dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  }

  resize();
  return { draw, resize, dispose, still: diorama.still };
}

/* ----------------------------------------------------------------- helpers */

/** A group placed at a point, for building hierarchies in one expression. */
export function at(x: number, y: number, z: number, ...children: Object3D[]) {
  const group = new Group();
  group.position.set(x, y, z);
  if (children.length) group.add(...children);
  return group;
}

/** A round rod from `a` to `b`: struts, legs, axles, booms. */
export function rod(
  kit: Kit,
  a: [number, number, number],
  b: [number, number, number],
  radius: number,
  swatch: Swatch,
) {
  const from = new Vector3(...a);
  const to = new Vector3(...b);
  const mesh = kit.part(kit.cylinder(radius, radius, from.distanceTo(to), 10), swatch);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.sub(from).normalize());
  return mesh;
}

/**
 * The shadow `object` casts straight down onto the ground at height `y`: a copy of its solids,
 * flattened. Keep it in step with `follow(shadow, object)` after moving the object.
 */
export function castShadow(kit: Kit, object: Object3D, y: number, skip: Object3D[] = []) {
  const ghost = object.clone(true);
  const drop: Object3D[] = [];
  ghost.traverse((child) => {
    if (child.userData.ink || skip.some((s) => s.name && s.name === child.name)) drop.push(child);
    else if (child instanceof Mesh) {
      child.material = kit.shadow;
      child.renderOrder = 1;
    }
  });
  for (const child of drop) child.removeFromParent();
  const flat = new Group();
  flat.position.y = y;
  flat.scale.y = 0.0001;
  flat.add(ghost);
  return { flat, ghost };
}

/** Moves a shadow's ghost to its object's place and pose (on the ground below it). */
export function follow(ghost: Object3D, object: Object3D) {
  ghost.position.set(object.position.x, 0, object.position.z);
  ghost.quaternion.copy(object.quaternion);
  ghost.scale.copy(object.scale);
}

/** Positions an object and returns it. */
export function place<T extends Object3D>(
  object: T,
  x: number,
  y: number,
  z: number,
  rotation?: [number, number, number],
): T {
  object.position.set(x, y, z);
  if (rotation) object.rotation.set(...rotation);
  return object;
}

/** A sine wave from -1 to 1 over `period` seconds, for gentle loops. */
export const wave = (t: number, period: number, phase = 0) =>
  Math.sin(((t / period + phase) % 1) * Math.PI * 2);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

export type Stage = ReturnType<typeof stage>;
