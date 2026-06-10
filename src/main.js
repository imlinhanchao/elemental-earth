const WORLD_SIZE = 100000;
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 1000;
const DISPLAY_SIZE = 920;

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
  const n = Math.sin((x * 127.1 + y * 311.7 + seed * 74.7) * 0.0174533) * 43758.5453;
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
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * freq, y * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / norm;
}

function getRiverDistance(nx, ny, seed) {
  let minDistance = 1;
  for (let i = 0; i < 3; i += 1) {
    const p = i + 1;
    const amplitude = 0.08 + hash2D(p, seed, seed + p) * 0.09;
    const frequency = 2.2 + hash2D(seed, p, seed) * 1.3;
    const phase = hash2D(seed + p, p * 7, seed + 39) * Math.PI * 2;
    const centerX = 0.45 + (p - 2) * 0.15 + amplitude * Math.sin((ny * frequency + phase) * Math.PI);
    const distance = Math.abs(nx - centerX);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

function selectBiome(nx, ny, elevation, riverDistance, edgeDistance, seed) {
  const volcanicNoise = fbm(nx * 5, ny * 5, seed + 501, 3);
  const adjacencyNoise = fbm(nx * 8, ny * 8, seed + 777, 2);

  if (riverDistance < 0.018) return BIOMES.RIVER_PLAIN;
  if (edgeDistance < 0.07 && volcanicNoise > 0.55) return BIOMES.VOLCANIC;
  if (riverDistance > 0.12 && elevation < 0.42) return BIOMES.ARID_BASIN;
  if (elevation > 0.76) return BIOMES.CRYSTAL_BELT;
  if (elevation > 0.48) return adjacencyNoise > 0.5 ? BIOMES.LIMESTONE : BIOMES.OXIDIZED;

  return riverDistance > 0.09 ? BIOMES.ARID_BASIN : BIOMES.OXIDIZED;
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

      const low = fbm(worldX / 52000, worldY / 52000, seed + 11, 5);
      const high = fbm(worldX / 9000, worldY / 9000, seed + 23, 4);
      const ridge = Math.abs(fbm(worldX / 17000, worldY / 17000, seed + 37, 4) * 2 - 1);
      const elevation = Math.min(1, low * 0.52 + high * 0.32 + ridge * 0.16);

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
  if (mapSprite.texture) mapSprite.texture.destroy(true);
  mapSprite.texture = texture;
}

function nextSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

function regenerate() {
  const seed = nextSeed();
  seedLabel.textContent = `Seed: ${seed} | 世界尺寸: ${WORLD_SIZE}x${WORLD_SIZE}`;
  generate(seed);
}

buildLegend();
regenerate();
document.getElementById("regen").addEventListener("click", regenerate);
