import { execFile } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const publicDir = path.join(root, 'public');
const imageDir = path.join(publicDir, 'images');
const optimizedDir = path.join(imageDir, 'optimized');
const converter = process.env.IMAGEMAGICK_BIN || 'convert';

const directoryJobs = [
  { directory: 'accessory', widths: [480, 720] },
  { directory: 'bag', widths: [480, 720] },
  { directory: 'clothing', widths: [480, 720] },
  { directory: 'glasses', widths: [480, 720] },
  { directory: 'pants', widths: [480, 720] },
  { directory: 'watch', widths: [480, 720] },
  { directory: 'categories', widths: [480, 720] },
];

const fileJobs = [
  { file: 'blog-1.jpg', widths: [640, 960] },
  { file: 'blog-2.jpg', widths: [640, 960] },
  { file: 'blog-3.jpg', widths: [640, 960] },
  { file: 'modara-story-4k.jpg', widths: [720, 1080] },
];

async function isFresh(source, destination) {
  try {
    const [sourceStat, destinationStat] = await Promise.all([stat(source), stat(destination)]);
    return destinationStat.mtimeMs >= sourceStat.mtimeMs;
  } catch {
    return false;
  }
}

async function convert({ source, width, alpha = false }) {
  const relative = path.relative(imageDir, source);
  const parsed = path.parse(relative);
  const destination = path.join(optimizedDir, parsed.dir, `${parsed.name}-${width}.webp`);

  if (await isFresh(source, destination)) {
    return { destination, skipped: true };
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const args = [
    source,
    '-auto-orient',
    '-strip',
    '-resize',
    `${width}x>`,
    '-quality',
    alpha ? '82' : '78',
    '-define',
    'webp:method=6',
  ];
  if (alpha) args.push('-define', 'webp:alpha-quality=95');
  args.push(destination);

  await execFileAsync(converter, args, { maxBuffer: 1024 * 1024 * 8 });
  return { destination, skipped: false };
}

async function collectJobs() {
  const jobs = [];

  for (const { directory, widths } of directoryJobs) {
    const absoluteDirectory = path.join(imageDir, directory);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(jpe?g|png)$/i.test(entry.name)) continue;
      const source = path.join(absoluteDirectory, entry.name);
      for (const width of widths) jobs.push({ source, width });
    }
  }

  for (const { file, widths, alpha } of fileJobs) {
    const source = path.join(imageDir, file);
    for (const width of widths) jobs.push({ source, width, alpha });
  }

  return jobs;
}

const jobs = await collectJobs();
let created = 0;
let skipped = 0;
let outputBytes = 0;

for (const job of jobs) {
  const result = await convert(job);
  const { size } = await stat(result.destination);
  outputBytes += size;
  if (result.skipped) skipped += 1;
  else created += 1;
}

console.log(
  `Optimized images ready: ${created} created, ${skipped} skipped, ${(outputBytes / 1024 / 1024).toFixed(2)} MB total.`,
);
