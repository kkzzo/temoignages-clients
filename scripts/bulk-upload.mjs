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

  const files = fs.readdirSync(VIDEO_DIR)
    .filter(f => /\.(mp4|mov|m4v|webm|mkv)$/i.test(f));

  if (files.length === 0) {
    console.error('❌  No video files found. Put your files in ./videos/');
    process.exit(1);
  }

  const metadata = parseCSV(CSV_PATH);
  console.log(`📼  Found ${files.length} files, uploading ${CONCURRENCY} at a time...\n`);

  // Load existing manifest to resume if interrupted
  const existing = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : [];
  const doneFilenames = new Set(existing.map(e => e._filename));

  const limit = pLimit(CONCURRENCY);
  let completed = 0;

  const results = await Promise.all(
    files.map(file => limit(async () => {
      if (doneFilenames.has(file)) {
        completed++;
        console.log(`⏭   [${completed}/${files.length}] ${file} (already uploaded, skipping)`);
        return existing.find(e => e._filename === file);
      }

      const meta = metadata[file] || {};
      const title = meta.clientName || path.parse(file).name;
      const filePath = path.join(VIDEO_DIR, file);

      try {
        const { guid } = await createVideo(title);
        await uploadFile(guid, filePath);
        const info = await pollUntilReady(guid);

        completed++;
        console.log(`✓  [${completed}/${files.length}] ${file} → ${guid}`);

        return {
          guid,
          _filename: file,
          clientName: meta.clientName || title,
          role: meta.role || null,
          company: meta.company || null,
          sector: meta.sector || null,
          year: meta.year ? Number(meta.year) : new Date().getFullYear(),
          duration: info ? formatDuration(info.length) : null,
          // Tags can be comma or pipe-separated in CSV: "Success story|PME"
          tags: meta.tags
            ? meta.tags.split(/[|,]/).map(t => t.trim()).filter(Boolean)
            : [],
        };
      } catch (err) {
        completed++;
        console.error(`✗  [${completed}/${files.length}] ${file} — ${err.message}`);
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
