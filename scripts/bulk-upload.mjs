#!/usr/bin/env node
/**
 * Bulk upload script for Bunny Stream
 *
 * Usage:
 *   1. Put all your .mp4 files in the ./videos folder
 *   2. Optionally create videos.csv with: filename,clientName,role,company,sector
 *   3. Run: npm run upload
 *
 * It will:
 *   - Upload each video to Bunny Stream (4 in parallel)
 *   - Merge metadata from videos.csv (if present)
 *   - Write data/manifest.json that the Next.js page consumes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env manually (compatible with Node < 20.6)
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}


// ---- Config ----
const API_KEY = process.env.BUNNY_API_KEY;
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const VIDEO_DIR = path.join(ROOT, 'videos');
const CSV_PATH = path.join(ROOT, 'videos.csv');
const MANIFEST_PATH = path.join(ROOT, 'data', 'manifest.json');
const CONCURRENCY = 4;
const BASE_URL = 'https://video.bunnycdn.com';

if (!API_KEY || !LIBRARY_ID) {
  console.error('❌  Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID. Check your .env file.');
  process.exit(1);
}

// ---- Parse CSV metadata (optional) ----
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim());
  const byFilename = {};
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
    if (row.filename) byFilename[row.filename] = row;
  }
  return byFilename;
}

// ---- Bunny API calls ----
async function createVideo(title) {
  const res = await fetch(`${BASE_URL}/library/${LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`createVideo failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function uploadFile(guid, filePath) {
  const stream = fs.createReadStream(filePath);
  const { size } = fs.statSync(filePath);
  const res = await fetch(`${BASE_URL}/library/${LIBRARY_ID}/videos/${guid}`, {
    method: 'PUT',
    headers: {
      AccessKey: API_KEY,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
    },
    body: stream,
    duplex: 'half',
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---- Helpers ----
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function pollUntilReady(guid, maxWaitMs = 5 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${BASE_URL}/library/${LIBRARY_ID}/videos/${guid}`, {
      headers: { AccessKey: API_KEY, Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      // status 4 = Finished, status 3 = Transcoding, 2 = Encoding, 0/1 = Queued
      if (data.status === 4) return data;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  return null;
}

// ---- Main ----
async function main() {
  if (!fs.existsSync(VIDEO_DIR)) {
    console.error(`❌  No videos folder found at ${VIDEO_DIR}`);
    process.exit(1);
  }

  // Recursive walk — finds videos in VIDEO_DIR and all subdirectories
  function walkVideos(dir, base = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let found = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        found = found.concat(walkVideos(path.join(dir, entry.name), entry.name));
      } else if (/\.(mp4|mov|m4v|webm|mkv)$/i.test(entry.name)) {
        found.push({ file: entry.name, subdir: base, fullPath: path.join(dir, entry.name) });
      }
    }
    return found;
  }
  const fileEntries = walkVideos(VIDEO_DIR);

  if (fileEntries.length === 0) {
    console.error('❌  No video files found. Put your .mp4 files in ./videos/ or subfolders.');
    process.exit(1);
  }

  const metadata = parseCSV(CSV_PATH);
  console.log(`📼  Found ${fileEntries.length} files, uploading ${CONCURRENCY} at a time...\n`);

  // Load existing manifest to resume if interrupted
  const existing = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : [];
  const doneFilenames = new Set(existing.map(e => e._filename));

  const limit = pLimit(CONCURRENCY);
  let completed = 0;

  const results = await Promise.all(
    fileEntries.map(({ file, subdir, fullPath }) => limit(async () => {
      // Unique key includes subdir to avoid collisions across language folders
      const uniqueKey = subdir ? `${subdir}/${file}` : file;

      if (doneFilenames.has(uniqueKey)) {
        completed++;
        console.log(`⏭   [${completed}/${fileEntries.length}] ${uniqueKey} (already uploaded, skipping)`);
        return existing.find(e => e._filename === uniqueKey);
      }

      const meta = metadata[file] || metadata[uniqueKey] || {};
      const title = meta.clientName || path.parse(file).name;

      // Auto-tag with language folder (Anglais, Français, etc.) if no CSV override
      const csvTags = meta.tags
        ? meta.tags.split(/[|,]/).map(t => t.trim()).filter(Boolean)
        : [];
      const autoTags = subdir && !csvTags.includes(subdir) ? [subdir] : [];
      const allTags = [...csvTags, ...autoTags];

      try {
        const { guid } = await createVideo(title);
        await uploadFile(guid, fullPath);
        const info = await pollUntilReady(guid);

        completed++;
        console.log(`✓  [${completed}/${fileEntries.length}] ${uniqueKey} → ${guid}`);

        return {
          guid,
          _filename: uniqueKey,
          clientName: meta.clientName || title,
          role: meta.role || null,
          company: meta.company || null,
          sector: meta.sector || null,
          year: meta.year ? Number(meta.year) : new Date().getFullYear(),
          duration: info ? formatDuration(info.length) : null,
          tags: allTags,
        };
      } catch (err) {
        completed++;
        console.error(`✗  [${completed}/${fileEntries.length}] ${uniqueKey} — ${err.message}`);
        return null;
      }
    }))
  );

  const manifest = results.filter(Boolean);

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\n✅  Done. Manifest written to ${MANIFEST_PATH}`);
  console.log(`    ${manifest.length} videos uploaded successfully.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
