import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const apiKey = process.env.ROOKIE_IMAGE_API_KEY;
const baseUrl = (process.env.ROOKIE_IMAGE_BASE_URL || "https://magic666.top").replace(/\/$/, "");
const model = process.env.ROOKIE_IMAGE_MODEL || "gemini-3.1-flash-lite-image";
const appearanceOverride = String(process.env.ROOKIE_IMAGE_APPEARANCE_OVERRIDE || "").trim();
const start = Number(args.get("--start") || 1);
const count = Number(args.get("--count") || 1);
const concurrency = Math.max(1, Number(args.get("--concurrency") || 2));
const root = process.cwd();
const sourceDir = path.resolve(root, args.get("--source-dir") || "output/generated-rookies-source");
const outputDir = path.resolve(root, args.get("--output-dir") || "assets/images/Player/generated-rookies");
const chromaHelper = "C:\\Users\\46676\\.codex\\skills\\.system\\imagegen\\scripts\\remove_chroma_key.py";
const resizeHelper = path.resolve(root, "tools/resize-transparent-headshot.py");

if (!apiKey) throw new Error("ROOKIE_IMAGE_API_KEY is required");
if (!Number.isInteger(start) || !Number.isInteger(count) || count < 1) throw new Error("Invalid --start/--count");

const groups = [
  "Black African-descended with deep brown skin",
  "White European-descended with fair skin",
  "Black African-descended with rich dark skin",
  "White European-descended with light olive skin",
  "Latino with warm tan skin",
  "Black African-descended with medium-dark skin",
  "White European-descended with fair skin and faint freckles",
];
const faces = [
  "angular jaw, high cheekbones, and focused eyes",
  "broad jaw, full lips, and strong brow",
  "long oval face, straight nose, and defined chin",
  "square face, thick eyebrows, and subtle dimples",
  "balanced oval face, pronounced cheekbones, and expressive eyes",
  "lean face, strong chin, and calm eyes",
  "broad face, defined jawline, and a gentle smile",
  "heart-shaped face, strong brow, and sharp cheekbones",
  "round-oval face, wide-set eyes, and a confident expression",
  "narrow face, straight brows, and a composed gaze",
];
const hair = [
  "short tight curls with a clean low fade",
  "close buzz cut with a sharp line-up",
  "short natural coils with tapered sides",
  "short wavy hair brushed forward",
  "medium curly top with a low fade",
  "neat short side part",
  "short textured crop with tapered sides",
  "close-cropped curls",
  "short tousled hair",
  "small neat twists kept above the ears",
];
const jerseys = [
  "deep navy with white piping",
  "royal blue with silver piping",
  "black with red piping",
  "burgundy with cream piping",
  "purple with gold piping",
  "charcoal with electric-blue piping",
  "orange with black piping",
  "white with navy piping",
];
const expressions = ["calm confidence", "focused neutrality", "a reserved half-smile", "a friendly slight smile", "composed seriousness"];

function promptFor(id) {
  const n = id - 1;
  const group = appearanceOverride || groups[n % groups.length];
  return `Use case: photorealistic-natural. Asset type: reusable web-game basketball rookie headshot cutout. Create fictional rookie portrait ${String(id).padStart(3, "0")}: a completely fictional ${18 + (id % 5)}-year-old male elite professional basketball prospect, ${group}, athletic build, ${faces[n % faces.length]}, ${hair[(n * 3) % hair.length]}, showing ${expressions[(n * 7) % expressions.length]}. Composition: centered symmetrical chest-up media-day portrait, direct eye contact, full head and hair visible, both shoulders fully inside frame, square image, generous padding. Clothing: sleeveless modern basketball jersey ${jerseys[(n * 5) % jerseys.length]}; absolutely no team name, league mark, sponsor, number, letters, text, badge, or logo. Rendering: highly photorealistic, natural skin texture, sharp eyes, realistic hair, soft even frontal studio lighting, no cast shadow. Background-removal requirement: perfectly flat solid #00ff00 chroma-key background. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, halo, or lighting variation. Keep the subject fully separated from the background with crisp edges. Do not use #00ff00 anywhere in the subject. Constraints: unique fictional identity, not Asian, do not resemble any real basketball player or celebrity, one person only, no text, no watermark, no hat, no hands, no basketball, no props.`;
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${command} exited ${code}: ${stderr || stdout}`)));
  });
}

async function requestImage(id) {
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: promptFor(id), n: 1, size: "1024x1024", response_format: "b64_json" }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 600)}`);
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text.slice(0, 300)}`); }
  const image = payload?.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) {
    const download = await fetch(image.url);
    if (!download.ok) throw new Error(`Image download HTTP ${download.status}`);
    return Buffer.from(await download.arrayBuffer());
  }
  throw new Error(`No image in response: ${text.slice(0, 600)}`);
}

async function generate(id) {
  const stem = `generated-rookie-${String(id).padStart(3, "0")}`;
  const rawPath = path.join(sourceDir, `${stem}.png`);
  const mattePath = path.join(sourceDir, `${stem}-alpha.png`);
  const finalPath = path.join(outputDir, `${stem}.png`);
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const bytes = await requestImage(id);
      await writeFile(rawPath, bytes);
      await run("python", [chromaHelper, "--input", rawPath, "--out", mattePath, "--auto-key", "border", "--soft-matte", "--transparent-threshold", "12", "--opaque-threshold", "220", "--despill", "--edge-contract", "2"]);
      const validation = await run("python", [resizeHelper, "--input", mattePath, "--output", finalPath, "--size", "216"]);
      await rm(mattePath, { force: true });
      console.log(JSON.stringify({ id, status: "ok", validation: JSON.parse(validation) }));
      return;
    } catch (error) {
      lastError = error;
      console.error(JSON.stringify({ id, status: "retry", attempt, error: String(error.message).slice(0, 800) }));
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 4000));
    }
  }
  throw new Error(`${stem} failed: ${lastError?.message}`);
}

await mkdir(sourceDir, { recursive: true });
await mkdir(outputDir, { recursive: true });
const queue = Array.from({ length: count }, (_, index) => start + index);
const failures = [];
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    try { await generate(id); } catch (error) {
      failures.push({ id, error: error.message });
      console.error(JSON.stringify({ id, status: "failed", error: error.message }));
    }
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, count) }, () => worker()));
if (failures.length) {
  console.error(JSON.stringify({ status: "incomplete", failures }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "complete", start, count, outputDir }));
}
