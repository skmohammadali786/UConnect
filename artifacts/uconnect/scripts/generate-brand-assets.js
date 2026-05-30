const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const projectRoot = path.resolve(__dirname, "..");
const defaultOutputDir = path.join(projectRoot, ".generated-brand", "images");

const SIZE = 1024;
const SCALE = 3;
const CANVAS_SIZE = SIZE * SCALE;

const COLORS = {
  white: [255, 255, 255, 255],
  black: [18, 19, 20, 255],
  pureBlack: [0, 0, 0, 255],
  greenStart: [132, 245, 0, 255],
  greenEnd: [162, 255, 24, 255],
};

const U_MARK_COMMANDS = [
  ["M", 176, 342],
  ["L", 247, 342],
  ["L", 247, 529],
  ["C", 247, 579, 284, 615, 330, 615],
  ["L", 392, 615],
  ["C", 416, 615, 432, 604, 446, 583],
  ["L", 472, 531],
  ["L", 511, 597],
  ["L", 468, 653],
  ["C", 449, 672, 425, 682, 397, 685],
  ["L", 326, 685],
  ["C", 243, 685, 176, 620, 176, 531],
  ["L", 176, 342],
];

const C_MARK_COMMANDS = [
  ["M", 823, 379],
  ["L", 823, 449],
  ["L", 647, 449],
  ["C", 604, 449, 576, 471, 568, 508],
  ["C", 576, 545, 604, 582, 647, 582],
  ["L", 823, 582],
  ["L", 823, 653],
  ["L", 643, 653],
  ["C", 594, 653, 552, 628, 524, 591],
  ["L", 488, 508],
  ["L", 524, 441],
  ["C", 552, 405, 594, 379, 643, 379],
  ["L", 823, 379],
];

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0],
    u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1],
  ];
}

function commandsToPoints(commands) {
  const points = [];
  let current = [0, 0];

  for (const command of commands) {
    if (command[0] === "M" || command[0] === "L") {
      current = [command[1] * SCALE, command[2] * SCALE];
      points.push(current);
      continue;
    }

    if (command[0] === "C") {
      const p0 = current;
      const p1 = [command[1] * SCALE, command[2] * SCALE];
      const p2 = [command[3] * SCALE, command[4] * SCALE];
      const p3 = [command[5] * SCALE, command[6] * SCALE];
      for (let step = 1; step <= 28; step += 1) {
        points.push(cubicPoint(p0, p1, p2, p3, step / 28));
      }
      current = p3;
    }
  }

  return points;
}

function interpolateColor(start, end, amount) {
  const t = Math.max(0, Math.min(1, amount));
  return start.map((channel, index) => Math.round(channel * (1 - t) + end[index] * t));
}

function createCanvas(background) {
  return Array.from({ length: CANVAS_SIZE }, () =>
    Array.from({ length: CANVAS_SIZE }, () => background),
  );
}

function fillPolygon(canvas, points, color) {
  const yValues = points.map(([, y]) => y);
  const minY = Math.max(0, Math.floor(Math.min(...yValues)));
  const maxY = Math.min(CANVAS_SIZE - 1, Math.ceil(Math.max(...yValues)));

  for (let y = minY; y <= maxY; y += 1) {
    const intersections = [];
    const scanY = y + 0.5;
    let previousIndex = points.length - 1;

    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[previousIndex];
      if ((y1 > scanY) !== (y2 > scanY)) {
        intersections.push(x1 + ((scanY - y1) * (x2 - x1)) / (y2 - y1));
      }
      previousIndex = index;
    }

    intersections.sort((a, b) => a - b);
    for (let index = 0; index < intersections.length; index += 2) {
      const startX = Math.max(0, Math.floor(intersections[index]));
      const endX = Math.min(CANVAS_SIZE - 1, Math.ceil(intersections[index + 1]));
      for (let x = startX; x <= endX; x += 1) {
        canvas[y][x] = typeof color === "function" ? color(x / SCALE, y / SCALE) : color;
      }
    }
  }
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(Buffer.concat([typeBuffer, data])) : crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePng(outputPath, canvas) {
  const raw = [];
  const sampleArea = SCALE * SCALE;

  for (let y = 0; y < SIZE; y += 1) {
    raw.push(0);
    for (let x = 0; x < SIZE; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sampleY = y * SCALE; sampleY < (y + 1) * SCALE; sampleY += 1) {
        for (let sampleX = x * SCALE; sampleX < (x + 1) * SCALE; sampleX += 1) {
          const pixel = canvas[sampleY][sampleX];
          totals[0] += pixel[0];
          totals[1] += pixel[1];
          totals[2] += pixel[2];
          totals[3] += pixel[3];
        }
      }
      raw.push(...totals.map((total) => Math.round(total / sampleArea)));
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8;
  header[9] = 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(Buffer.from(raw), { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  fs.writeFileSync(outputPath, png);
}

function renderLogo({ background, uColor, outputPath }) {
  const canvas = createCanvas(background);
  fillPolygon(canvas, commandsToPoints(U_MARK_COMMANDS), uColor);
  fillPolygon(canvas, commandsToPoints(C_MARK_COMMANDS), (x) =>
    interpolateColor(COLORS.greenStart, COLORS.greenEnd, (x - 488) / (823 - 488)),
  );
  writePng(outputPath, canvas);
}

function generateBrandAssets(outputDir = defaultOutputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const lightLogoPath = path.join(outputDir, "logo.png");
  const darkLogoPath = path.join(outputDir, "logo-dark.png");
  const iconPath = path.join(outputDir, "icon.png");

  renderLogo({
    background: COLORS.white,
    uColor: COLORS.black,
    outputPath: lightLogoPath,
  });

  renderLogo({
    background: COLORS.pureBlack,
    uColor: COLORS.white,
    outputPath: darkLogoPath,
  });

  fs.copyFileSync(lightLogoPath, iconPath);

  return {
    icon: iconPath,
    lightLogo: lightLogoPath,
    darkLogo: darkLogoPath,
  };
}

if (require.main === module) {
  generateBrandAssets();
  console.log("Generated UC logo assets for icon and splash screens.");
}

module.exports = { generateBrandAssets };
