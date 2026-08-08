import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const apiKey = process.env.ROOKIE_IMAGE_API_KEY;
const baseUrl = (process.env.ROOKIE_IMAGE_BASE_URL || "https://magic666.top").replace(/\/$/, "");
const model = process.env.ROOKIE_IMAGE_MODEL || "gemini-3.1-flash-lite-image";
const root = process.cwd();
const sourceDir = path.resolve(root, "output/character-avatars-source");
const outputDir = path.resolve(root, "assets/images/Player/ai-avatars");
const chromaHelper = "C:\\Users\\46676\\.codex\\skills\\.system\\imagegen\\scripts\\remove_chroma_key.py";
const resizeHelper = path.resolve(root, "tools/resize-transparent-headshot.py");

if (!apiKey) throw new Error("ROOKIE_IMAGE_API_KEY is required");

const specs = [
  { group:"亚洲", appearance:"Chinese male, warm light skin, long angular face, narrow focused eyes", hair:"short spiky textured crop with a sharp low fade", mood:"quiet floor-general confidence", jersey:"deep navy with white piping" },
  { group:"亚洲", appearance:"Korean male, fair skin, soft oval face, defined cheekbones", hair:"medium-length wavy curtain hair parted in the center", mood:"polished star scorer charisma", jersey:"white with royal-blue piping" },
  { group:"亚洲", appearance:"Japanese male, light-medium skin, square jaw, strong brow", hair:"very short athletic buzz cut", mood:"disciplined defensive intensity", jersey:"black with red piping" },
  { group:"亚洲", appearance:"Filipino male, warm tan skin, broad face, full eyebrows and subtle dimples", hair:"thick short curls with tapered sides", mood:"energetic slashing-guard smile", jersey:"burgundy with cream piping" },
  { group:"亚洲", appearance:"Vietnamese male, warm medium skin, lean face and pronounced cheekbones", hair:"straight undercut swept dramatically to one side", mood:"fearless young wing confidence", jersey:"purple with gold piping" },
  { group:"亚洲", appearance:"Indian male, medium brown skin, strong nose, full beard shadow and expressive eyes", hair:"voluminous wavy quiff with clean tapered sides", mood:"mature playmaking leadership", jersey:"orange with black piping" },
  { group:"白人", appearance:"Scandinavian white male, very fair skin, blue eyes, long face and clean jaw", hair:"short platinum-blond crop with textured fringe", mood:"calm sharpshooter focus", jersey:"royal blue with silver piping" },
  { group:"白人", appearance:"Mediterranean white male, olive skin, thick eyebrows, broad jaw", hair:"dense dark curly top with a skin fade", mood:"physical two-way wing intensity", jersey:"black with gold piping" },
  { group:"白人", appearance:"Irish white male, pale freckled skin, green eyes and narrow face", hair:"bright red messy curls", mood:"friendly high-energy point guard smile", jersey:"deep green avoided; use white with orange piping" },
  { group:"白人", appearance:"Eastern European white male, fair skin, powerful square jaw and deep-set eyes", hair:"close military buzz cut", mood:"serious interior enforcer presence", jersey:"charcoal with electric-blue piping" },
  { group:"白人", appearance:"Southern European white male, warm light skin, aquiline nose and high cheekbones", hair:"shoulder-length dark wavy hair held by a thin black headband", mood:"creative veteran-like poise", jersey:"burgundy with white piping" },
  { group:"白人", appearance:"American white male, lightly tanned skin, round face and visible dimples", hair:"blond modern mullet with short sides", mood:"bold athletic showman confidence", jersey:"purple with cream piping" },
  { group:"黑人", appearance:"West African black male, very deep brown skin, broad nose, full lips and angular jaw", hair:"tall sculpted high-top fade", mood:"explosive franchise-player confidence", jersey:"orange with black piping" },
  { group:"黑人", appearance:"African American black male, rich dark skin, oval face and high cheekbones", hair:"six neat medium cornrow braids pulled straight back", mood:"cool composed combo-guard gaze", jersey:"white with navy piping" },
  { group:"黑人", appearance:"Sudanese black male, ebony skin, very lean long face and striking cheekbones", hair:"completely shaved head", mood:"quiet elite rim-protector intensity", jersey:"deep navy with silver piping" },
  { group:"黑人", appearance:"Afro-Caribbean black male, deep warm brown skin, broad smiling face and strong chin", hair:"large rounded natural afro", mood:"magnetic fan-favorite warmth", jersey:"burgundy with gold piping" },
  { group:"黑人", appearance:"African American black male, medium-dark skin, narrow eyes, sharp jaw and trimmed goatee", hair:"short freeform dreadlocks with varied tips", mood:"edgy fearless scoring-wing attitude", jersey:"black with red piping" },
  { group:"黑人", appearance:"Nigerian black male, dark brown skin, rectangular face and thick eyebrows", hair:"very short 360 waves with a precise line-up", mood:"disciplined defensive-leader authority", jersey:"royal blue with white piping" }
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio:["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => (stdout += chunk));
    child.stderr.on("data", chunk => (stderr += chunk));
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${command} exited ${code}: ${stderr || stdout}`)));
  });
}

function promptFor(spec, id) {
  return `Use case: photorealistic-natural. Asset type: selectable protagonist portrait for a basketball career web game. Create protagonist avatar ${String(id).padStart(2,"0")}: a completely fictional 20-to-25-year-old ${spec.appearance}, elite professional basketball athlete with realistic athletic neck and shoulders. Hair: ${spec.hair}. Character mood: ${spec.mood}. Composition: centered symmetrical chest-up media-day portrait, looking directly into camera, full head and every part of the hairstyle visible, both shoulders inside frame, generous padding, square image. Clothing: sleeveless modern basketball jersey ${spec.jersey}; absolutely no team name, number, letters, league mark, sponsor, badge, or logo. Rendering: premium photorealistic sports portrait, natural skin pores, realistic hair strands, sharp eyes, soft even frontal studio light, no beauty-filter plastic skin. Background-removal requirement: perfectly flat solid #00ff00 chroma-key background, one uniform color with no shadow, gradient, texture, reflection, floor plane, halo, or lighting variation. Keep the subject fully separated from the background with crisp edges. Do not use #00ff00 on the subject. Constraints: unique fictional identity, visually distinct from all other avatars, do not resemble a real basketball player or celebrity, one person only, no text, no watermark, no hat, no hands, no ball, no jewelry, no props.`;
}

async function requestImage(spec, id) {
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method:"POST",
    headers:{ Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json" },
    body:JSON.stringify({ model, prompt:promptFor(spec, id), n:1, size:"1024x1024", response_format:"b64_json" })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0,600)}`);
  const payload = JSON.parse(text);
  const image = payload?.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) {
    const download = await fetch(image.url);
    if (!download.ok) throw new Error(`Image download HTTP ${download.status}`);
    return Buffer.from(await download.arrayBuffer());
  }
  throw new Error(`No image in response: ${text.slice(0,600)}`);
}

async function generate(spec, index) {
  const id = index + 1;
  const stem = `avatar-${String(id).padStart(2,"0")}`;
  const rawPath = path.join(sourceDir, `${stem}.png`);
  const mattePath = path.join(sourceDir, `${stem}-alpha.png`);
  const finalPath = path.join(outputDir, `${stem}.png`);
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await writeFile(rawPath, await requestImage(spec, id));
      await run("python", [chromaHelper, "--input", rawPath, "--out", mattePath, "--auto-key", "border", "--soft-matte", "--transparent-threshold", "12", "--opaque-threshold", "220", "--despill", "--edge-contract", "2"]);
      const validation = JSON.parse(await run("python", [resizeHelper, "--input", mattePath, "--output", finalPath, "--size", "512"]));
      await rm(mattePath, { force:true });
      console.log(JSON.stringify({ id, group:spec.group, status:"ok", validation }));
      return;
    } catch (error) {
      lastError = error;
      console.error(JSON.stringify({ id, group:spec.group, status:"retry", attempt, error:String(error.message).slice(0,800) }));
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, attempt * 5000));
    }
  }
  throw new Error(`${stem} failed: ${lastError?.message}`);
}

await mkdir(sourceDir, { recursive:true });
await mkdir(outputDir, { recursive:true });
const queue = specs.map((spec, index) => ({ spec, index }));
const failures = [];
async function worker() {
  while (queue.length) {
    const job = queue.shift();
    try { await generate(job.spec, job.index); }
    catch (error) { failures.push({ id:job.index + 1, error:error.message }); }
  }
}
await Promise.all([worker(), worker()]);
if (failures.length) {
  console.error(JSON.stringify({ status:"incomplete", failures }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status:"complete", count:specs.length, outputDir }));
}
