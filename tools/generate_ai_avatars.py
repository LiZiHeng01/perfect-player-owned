"""生成完美球员模式的真人风格球员大头照。

默认使用阿里云百炼 DashScope 的 wan2.2-t2i-plus 异步文生图接口：
POST /api/v1/services/aigc/text2image/image-synthesis
GET  /api/v1/tasks/{task_id}

可选环境变量：
- DASHSCOPE_API_KEY：百炼 API Key（必需）
- DASHSCOPE_BASE_URL：完整 API 根地址，优先级最高
- DASHSCOPE_WORKSPACE_ID + DASHSCOPE_REGION：使用北京/新加坡业务空间域名
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "images" / "Player" / "ai-avatars"
DEFAULT_BASE = "https://dashscope.aliyuncs.com/api/v1"


def load_base_url():
    explicit = os.environ.get("DASHSCOPE_BASE_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    workspace = os.environ.get("DASHSCOPE_WORKSPACE_ID", "").strip()
    region = os.environ.get("DASHSCOPE_REGION", "beijing").strip().lower()
    hosts = {
        "beijing": f"https://{workspace}.cn-beijing.maas.aliyuncs.com/api/v1",
        "singapore": f"https://{workspace}.ap-southeast-1.maas.aliyuncs.com/api/v1",
    }
    return hosts.get(region, DEFAULT_BASE) if workspace else DEFAULT_BASE


BASE = load_base_url()


def load_key():
    env_path = Path(os.environ.get("CODEX_HOME", "C:/Users/46676/.codex")) / "skills" / "claude-vision-skill" / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("DASHSCOPE_API_KEY="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("DASHSCOPE_API_KEY", "")


def api(method, path, body=None, headers=None, timeout=90):
    req = urllib.request.Request(BASE + path, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{path} -> {e.code}: {e.read().decode('utf-8', 'ignore')[:500]}") from e


PROMPTS = [
    ("avatar-01", "Photorealistic media-day headshot of an adult Asian male professional basketball player, calm point guard presence, short black hair, subtle confident smile, athletic shoulders, plain navy basketball jersey without logos, dark arena tunnel background with soft orange rim light, square crop, head and shoulders, realistic skin texture, natural eyes, studio photography, no text, no watermark, not an illustration"),
    ("avatar-02", "Photorealistic media-day headshot of an adult Asian male professional basketball player, composed athletic wing, neat textured black hair, focused expression, athletic shoulders, cream and orange basketball jersey without logos, softly blurred hardwood court background, warm arena lighting, square crop, head and shoulders, realistic skin texture, natural eyes, studio photography, no text, no watermark, not an illustration"),
    ("avatar-03", "Photorealistic media-day headshot of an adult white male professional basketball player, scoring guard, light brown wavy hair, light stubble, relaxed focused expression, athletic shoulders, navy and cream basketball jersey without logos, dark arena background with warm key light, square crop, head and shoulders, realistic skin texture, natural eyes, professional sports photography, no text, no watermark, not an illustration"),
    ("avatar-04", "Photorealistic media-day headshot of an adult white male professional basketball player, strong power forward build, short blond hair, clean-shaven, serious game-ready expression, athletic shoulders, deep green and gold basketball jersey without logos, softly blurred indoor court background, dramatic but natural studio light, square crop, head and shoulders, realistic skin texture, natural eyes, professional sports photography, no text, no watermark, not an illustration"),
    ("avatar-05", "Photorealistic media-day headshot of an adult Black male professional basketball player, explosive two-way wing, close-cropped hair, trimmed beard, confident expression, athletic shoulders, burnt orange and navy basketball jersey without logos, dark arena background with orange rim light, square crop, head and shoulders, realistic skin texture, natural eyes, professional sports photography, no text, no watermark, not an illustration"),
    ("avatar-06", "Photorealistic media-day headshot of an adult Black male professional basketball player, powerful center build, shaved head, short beard, calm intimidating focus, broad athletic shoulders, red and black basketball jersey without logos, softly blurred hardwood court background with neutral arena lighting, square crop, head and shoulders, realistic skin texture, natural eyes, professional sports photography, no text, no watermark, not an illustration"),
]

NEGATIVE_PROMPT = "cartoon, anime, illustration, 3d render, painted face, plastic skin, distorted eyes, asymmetrical face, extra fingers, duplicate person, logo, brand mark, text, watermark, full body, action pose"


def poll_task(task_id, timeout_s=240):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            data = api("GET", f"/tasks/{task_id}", headers={"Authorization": f"Bearer {KEY}"})
        except Exception:
            time.sleep(5)
            continue
        status = data.get("output", {}).get("task_status", "")
        if status in ("SUCCEEDED", "SUCCESS"):
            return data
        if status in ("FAILED", "CANCELED", "UNKNOWN"):
            raise RuntimeError(f"task failed: {data.get('output', {}).get('message', status)}")
        time.sleep(4)
    raise TimeoutError(f"task {task_id} timeout")


def download(url, target: Path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(target, "wb") as f:
        f.write(resp.read())


def main():
    global KEY
    KEY = load_key()
    if not KEY:
        print("DASHSCOPE_API_KEY 未配置")
        sys.exit(1)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results = {}
    for name, prompt in PROMPTS:
        target = OUT_DIR / f"{name}.png"
        if target.exists() and target.stat().st_size > 10000:
            print(f"skip {name} (exists)")
            results[name] = str(target.relative_to(ROOT))
            continue
        body = {
            "model": "wan2.2-t2i-plus",
            "input": {"prompt": prompt, "negative_prompt": NEGATIVE_PROMPT},
            "parameters": {"size": "1024*1024", "n": 1, "prompt_extend": False, "watermark": False},
        }
        data = api(
            "POST",
            "/services/aigc/text2image/image-synthesis",
            body,
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "X-DashScope-Async": "enable"},
        )
        task_id = data["output"]["task_id"]
        print(f"{name}: submitted {task_id}")
        done = poll_task(task_id)
        urls = done["output"].get("results") or []
        if not urls:
            raise RuntimeError(f"{name}: no result url")
        download(urls[0]["url"], target)
        results[name] = str(target.relative_to(ROOT))
        print(f"{name}: ok -> {results[name]}")
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
