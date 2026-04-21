#!/usr/bin/env node
/**
 * Frame.io V4 → Local download script
 *
 * Télécharge récursivement toutes les vidéos d'un projet Frame.io V4
 * dans ./videos/ avec reprise automatique si interrompu.
 *
 * Prérequis — dans .env :
 *   FRAMEIO_TOKEN=ton_bearer_token
 *   FRAMEIO_ACCOUNT_ID=xxx
 *   FRAMEIO_PROJECT_ID=xxx  (ou FRAMEIO_FOLDER_ID pour un dossier spécifique)
 *
 * Comment récupérer ces valeurs : voir la section "Script Frame.io" du README.
 *
 * Usage:
 *   node scripts/download-from-frameio.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import pLimit from 'p-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---- Config ----
const TOKEN = process.env.FRAMEIO_TOKEN;
const ACCOUNT_ID = process.env.FRAMEIO_ACCOUNT_ID;
const PROJECT_ID = process.env.FRAMEIO_PROJECT_ID;
const FOLDER_ID = process.env.FRAMEIO_FOLDER_ID; // optionnel
const OUTPUT_DIR = path.join(ROOT, 'videos');
const METADATA_PATH = path.join(ROOT, 'frameio-metadata.json');
const CONCURRENCY = 3; // 3 téléchargements en parallèle (safe)
const API_BASE = 'https://api.frame.io/v4';

if (!TOKEN || !ACCOUNT_ID || (!PROJECT_ID && !FOLDER_ID)) {
  console.error('❌  Variables manquantes. Vérifie ton .env : FRAMEIO_TOKEN, FRAMEIO_ACCOUNT_ID, FRAMEIO_PROJECT_ID (ou FRAMEIO_FOLDER_ID).');
  process.exit(1);
}

// ---- API helpers ----
async function apiGet(pathOrUrl, params = {}) {
  const url = pathOrUrl.startsWith('http')
    ? new URL(pathOrUrl)
    : new URL(`${API_BASE}${pathOrUrl}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} on ${url.pathname}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function getRootFolderId() {
  if (FOLDER_ID) return FOLDER_ID;
  const project = await apiGet(`/accounts/${ACCOUNT_ID}/projects/${PROJECT_ID}`);
  return project.root_folder_id;
}

/**
 * Récupère récursivement tous les fichiers d'un dossier et ses sous-dossiers.
 * La V4 utilise une pagination cursor-based.
 */
async function listAllFiles(folderId, pathSoFar = '') {
  const files = [];
  let nextUrl = null;

  do {
    const response = nextUrl
      ? await apiGet(nextUrl)
      : await apiGet(`/accounts/${ACCOUNT_ID}/folders/${folderId}/children`, {
          page_size: 100,
          include: 'media_links.original',
        });

    for (const item of response.data || []) {
      if (item.type === 'folder') {
        const subFiles = await listAllFiles(item.id, `${pathSoFar}${item.name}/`);
        files.push(...subFiles);
      } else if (item.type === 'file' || item.type === 'version_stack') {
        // Une version_stack contient une liste ordonnée — on prend le plus récent
        // Pour simplifier, on traite les deux comme des files
        files.push({
          id: item.id,
          name: item.name,
          type: item.media_type || item.type,
          relativePath: pathSoFar,
          size: item.file_size,
          // media_links peut être présent ou non selon ce que retourne l'API
          downloadUrl: item.media_links?.original?.download_url || null,
        });
      }
    }

    nextUrl = response.links?.next
      ? `https://api.frame.io${response.links.next}`
      : null;
  } while (nextUrl);

  return files;
}

/**
 * Si media_links n'est pas inclus dans la liste, on refait un appel unitaire
 */
async function getDownloadUrl(fileId) {
  const response = await apiGet(`/accounts/${ACCOUNT_ID}/files/${fileId}`, {
    include: 'media_links.original',
  });
  return response.media_links?.original?.download_url
    || response.data?.media_links?.original?.download_url
    || null;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const tmpPath = `${destPath}.part`;
  await pipeline(res.body, fs.createWriteStream(tmpPath));
  fs.renameSync(tmpPath, destPath);
}

function sanitizeFilename(name) {
  return name
    .replace(/[\/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '-')
    .slice(0, 200);
}

function formatBytes(bytes) {
  if (!bytes) return '?';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

// ---- Main ----
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🔍  Récupération de la liste des fichiers...\n');
  const folderId = await getRootFolderId();
  const allFiles = await listAllFiles(folderId);

  // On ne garde que les vidéos
  const videoFiles = allFiles.filter(f =>
    /^video\//i.test(f.type) ||
    /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name)
  );

  console.log(`📼  ${videoFiles.length} vidéos trouvées (sur ${allFiles.length} fichiers totaux).\n`);

  if (videoFiles.length === 0) {
    console.log('Rien à télécharger.');
    return;
  }

  // Sauvegarde la liste des métadonnées (utile pour construire le CSV ensuite)
  fs.writeFileSync(METADATA_PATH, JSON.stringify(videoFiles, null, 2));
  console.log(`💾  Métadonnées sauvées dans ${METADATA_PATH}\n`);

  const limit = pLimit(CONCURRENCY);
  let done = 0;
  let skipped = 0;
  let failed = 0;

  await Promise.all(videoFiles.map(file => limit(async () => {
    const filename = sanitizeFilename(file.name);
    const destPath = path.join(OUTPUT_DIR, filename);

    // Skip si déjà téléchargé avec la bonne taille
    if (fs.existsSync(destPath)) {
      const existingSize = fs.statSync(destPath).size;
      if (!file.size || existingSize === file.size) {
        skipped++;
        done++;
        console.log(`⏭   [${done}/${videoFiles.length}] ${filename} (déjà téléchargé)`);
        return;
      }
    }

    try {
      // Récupère l'URL de DL si pas déjà présente (ou si elle a expiré)
      const url = file.downloadUrl || await getDownloadUrl(file.id);
      if (!url) throw new Error('Pas d\'URL de téléchargement');

      await downloadFile(url, destPath);
      done++;
      console.log(`✓  [${done}/${videoFiles.length}] ${filename} (${formatBytes(file.size)})`);
    } catch (err) {
      failed++;
      done++;
      console.error(`✗  [${done}/${videoFiles.length}] ${filename} — ${err.message}`);
    }
  })));

  console.log(`\n✅  Terminé.`);
  console.log(`    Téléchargés : ${videoFiles.length - skipped - failed}`);
  console.log(`    Déjà présents : ${skipped}`);
  if (failed > 0) console.log(`    Échecs : ${failed} (relance le script pour retenter)`);

  console.log(`\n💡  Prochaine étape : créer videos.csv avec les métadonnées, puis npm run upload`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
