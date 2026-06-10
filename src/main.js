const WORLD_SIZE = 100000;
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 1000;
const DISPLAY_SIZE = 920;
const RIVER_COUNT = 3;
const RIVER_MIN_AMPLITUDE = 0.08;
const RIVER_AMPLITUDE_RANGE = 0.09;
const RIVER_BASE_FREQUENCY = 2.2;
const RIVER_FREQUENCY_RANGE = 1.3;
const RIVER_CENTER_BASE = 0.45;
const RIVER_CENTER_OFFSET = 0.15;
const HASH_X_FACTOR = 127.1;
const HASH_Y_FACTOR = 311.7;
const HASH_SEED_FACTOR = 74.7;
const HASH_SINE_SCALE = 0.0174533;
const HASH_SCALE = 43758.5453;
const OCTAVE_SEED_OFFSET = 101;
const SEED_SPACE = 1_000_000;
const UINT32_RANGE = 0x1_0000_0000;

const ELEVATION_LOW_SCALE = 52000;
const ELEVATION_HIGH_SCALE = 9000;
const ELEVATION_RIDGE_SCALE = 17000;
const ELEVATION_LOW_SEED = 11;
const ELEVATION_HIGH_SEED = 23;
const ELEVATION_RIDGE_SEED = 37;
const ELEVATION_LOW_WEIGHT = 0.52;
const ELEVATION_HIGH_WEIGHT = 0.32;
const ELEVATION_RIDGE_WEIGHT = 0.16;

const BIOME_RULES = {
  riverThreshold: 0.018,
  volcanicEdgeThreshold: 0.07,
  volcanicNoiseThreshold: 0.55,
  aridRiverDistance: 0.12,
  aridElevationThreshold: 0.42,
  crystalElevationThreshold: 0.76,
  midElevationThreshold: 0.48,
  limestoneNoiseThreshold: 0.5,
  lowlandAridDistance: 0.09,
};

const BIOMES = {
  RIVER_PLAIN: { key: "河滩平原", color: [210, 186, 133] },
  LIMESTONE: { key: "石灰岩山地", color: [186, 193, 198] },
  OXIDIZED: { key: "氧化山地", color: [183, 96, 70] },
  VOLCANIC: { key: "火山地热", color: [59, 47, 51] },
  ARID_BASIN: { key: "干旱盆地", color: [220, 202, 154] },
  CRYSTAL_BELT: { key: "深层结晶带", color: [130, 108, 187] },
};

const legendElement = document.getElementById("legend");
const seedLabel = document.getElementById("seedLabel");
const { PIXI } = window;

if (!PIXI) {
  seedLabel.textContent = "PixiJS 加载失败，请刷新页面后重试。";
  throw new Error("PixiJS failed to load.");
}

const app = new PIXI.Application();
await app.init({
  width: DISPLAY_SIZE,
  height: DISPLAY_SIZE,
  background: "#0e1118",
  antialias: false,
});
document.getElementById("stage").appendChild(app.canvas);

const mapSprite = new PIXI.Sprite();
mapSprite.width = DISPLAY_SIZE;
mapSprite.height = DISPLAY_SIZE;
app.stage.addChild(mapSprite);

function hash2D(x, y, seed) {
  // Deterministic 2D pseudo-random hash for terrain sampling.
  const n =
    Math.sin((x * HASH_X_FACTOR + y * HASH_Y_FACTOR + seed * HASH_SEED_FACTOR) * HASH_SINE_SCALE) * HASH_SCALE;
  return n - Math.floor(n);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);

  const a = hash2D(x0, y0, seed);
  const b = hash2D(x1, y0, seed);
  const c = hash2D(x0, y1, seed);
  const d = hash2D(x1, y1, seed);

  const xTop = a + (b - a) * fx;
  const xBottom = c + (d - c) * fx;
  return xTop + (xBottom - xTop) * fy;
}

function fbm(x, y, seed, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, y * frequency, seed + i * OCTAVE_SEED_OFFSET) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / normalization;
}

function getRiverDistance(nx, ny, seed) {
  let minDistance = 1;
  for (let i = 0; i < RIVER_COUNT; i += 1) {
    const p = i + 1;
    const amplitude = RIVER_MIN_AMPLITUDE + hash2D(p, seed, seed + p) * RIVER_AMPLITUDE_RANGE;
    const frequency = RIVER_BASE_FREQUENCY + hash2D(seed, p, seed) * RIVER_FREQUENCY_RANGE;
    const phase = hash2D(seed + p, p * 7, seed + 39) * Math.PI * 2;
    const centerX =
      RIVER_CENTER_BASE +
      (p - 2) * RIVER_CENTER_OFFSET +
      amplitude * Math.sin((ny * frequency + phase) * Math.PI);
    const distance = Math.abs(nx - centerX);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

function selectBiome(nx, ny, elevation, riverDistance, edgeDistance, seed) {
  const volcanicNoise = fbm(nx * 5, ny * 5, seed + 501, 3);
  const adjacencyNoise = fbm(nx * 8, ny * 8, seed + 777, 2);

  if (riverDistance < BIOME_RULES.riverThreshold) return BIOMES.RIVER_PLAIN;
  if (
    edgeDistance < BIOME_RULES.volcanicEdgeThreshold &&
    volcanicNoise > BIOME_RULES.volcanicNoiseThreshold
  ) {
    return BIOMES.VOLCANIC;
  }
  if (riverDistance > BIOME_RULES.aridRiverDistance && elevation < BIOME_RULES.aridElevationThreshold) {
    return BIOMES.ARID_BASIN;
  }
  if (elevation > BIOME_RULES.crystalElevationThreshold) return BIOMES.CRYSTAL_BELT;
  if (elevation > BIOME_RULES.midElevationThreshold) {
    return adjacencyNoise > BIOME_RULES.limestoneNoiseThreshold ? BIOMES.LIMESTONE : BIOMES.OXIDIZED;
  }

  return riverDistance > BIOME_RULES.lowlandAridDistance ? BIOMES.ARID_BASIN : BIOMES.OXIDIZED;
}

function shadeColor([r, g, b], elevation) {
  const shade = 0.72 + elevation * 0.58;
  return [
    Math.min(255, Math.floor(r * shade)),
    Math.min(255, Math.floor(g * shade)),
    Math.min(255, Math.floor(b * shade)),
  ];
}

function buildLegend() {
  legendElement.innerHTML = "";
  Object.values(BIOMES).forEach((biome) => {
    const item = document.createElement("div");
    item.className = "item";
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = `rgb(${biome.color.join(",")})`;
    const label = document.createElement("span");
    label.textContent = biome.key;
    item.appendChild(swatch);
    item.appendChild(label);
    legendElement.appendChild(item);
  });
}

function generate(seed) {
  const canvas = document.createElement("canvas");
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(VIEW_WIDTH, VIEW_HEIGHT);

  for (let y = 0; y < VIEW_HEIGHT; y += 1) {
    const ny = y / VIEW_HEIGHT;
    for (let x = 0; x < VIEW_WIDTH; x += 1) {
      const nx = x / VIEW_WIDTH;
      const worldX = nx * WORLD_SIZE;
      const worldY = ny * WORLD_SIZE;

      const low = fbm(worldX / ELEVATION_LOW_SCALE, worldY / ELEVATION_LOW_SCALE, seed + ELEVATION_LOW_SEED, 5);
      const high = fbm(
        worldX / ELEVATION_HIGH_SCALE,
        worldY / ELEVATION_HIGH_SCALE,
        seed + ELEVATION_HIGH_SEED,
        4
      );
      const ridge = Math.abs(
        fbm(worldX / ELEVATION_RIDGE_SCALE, worldY / ELEVATION_RIDGE_SCALE, seed + ELEVATION_RIDGE_SEED, 4) * 2 -
          1
      );
      const elevation = Math.min(
        1,
        low * ELEVATION_LOW_WEIGHT + high * ELEVATION_HIGH_WEIGHT + ridge * ELEVATION_RIDGE_WEIGHT
      );

      const riverDistance = getRiverDistance(nx, ny, seed);
      const edgeDistance = Math.min(nx, ny, 1 - nx, 1 - ny);
      const biome = selectBiome(nx, ny, elevation, riverDistance, edgeDistance, seed);
      const [r, g, b] = shadeColor(biome.color, elevation);

      const i = (y * VIEW_WIDTH + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = PIXI.Texture.from(canvas);
  // Destroy previous texture and its base texture to avoid memory growth when regenerating.
  if (mapSprite.texture) mapSprite.texture.destroy(true);
  mapSprite.texture = texture;
}

function nextSeed() {
  // Rejection sampling keeps seed distribution uniform in [0, SEED_SPACE).
  const limit = Math.floor(UINT32_RANGE / SEED_SPACE) * SEED_SPACE;
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= limit);
  return random[0] % SEED_SPACE;
}

function regenerate() {
  const seed = nextSeed();
  seedLabel.textContent = `Seed: ${seed} | 世界尺寸: ${WORLD_SIZE}x${WORLD_SIZE}`;
  generate(seed);
}

buildLegend();
regenerate();
document.getElementById("regen").addEventListener("click", regenerate);
