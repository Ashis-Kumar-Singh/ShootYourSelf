'use strict';
const { db } = require('../db');

db.exec(`CREATE TABLE IF NOT EXISTS offline_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  device TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  pack_type TEXT NOT NULL DEFAULT 'repair_tree',
  size_bytes INTEGER DEFAULT 0,
  content_json TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  downloads INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_offline_packs_device ON offline_packs(device)`);

function generateId() {
  return 'off_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// Generate an offline repair pack from existing data
function generatePack(device, brand, model, packType) {
  const id = generateId();
  const now = Date.now();
  const content = {};

  if (packType === 'repair_tree' || packType === 'all') {
    const trees = require('../diagnostic/failure-trees');
    const deviceTrees = {};
    const treeList = trees.getAllTreeCategories(device);
    for (const t of treeList) {
      deviceTrees[t.id] = trees.getTree(device, t.id);
    }
    content.repairTrees = deviceTrees;
  }

  if (packType === 'guides' || packType === 'all') {
    const { CURATED } = require('../search/curated');
    content.curatedGuides = CURATED[device] || {};
  }

  if (packType === 'common_fixes' || packType === 'all') {
    const fixes = db.prepare(`SELECT * FROM community_fixes WHERE device = ? AND brand = ? AND model = ? AND status = 'approved'`).all(device, brand, model);
    content.communityFixes = fixes.map(f => ({ ...f, steps: JSON.parse(f.steps), symptoms: JSON.parse(f.symptoms) }));
  }

  if (packType === 'diagnostic_flows' || packType === 'all') {
    const paths = db.prepare(`SELECT * FROM diagnostic_paths WHERE device = ? AND brand = ? AND model = ? ORDER BY count DESC LIMIT 50`).all(device, brand, model);
    content.diagnosticPaths = paths.map(p => ({ ...p, path: JSON.parse(p.path) }));
  }

  const contentStr = JSON.stringify(content);
  const name = `${device} ${brand || ''} ${model || ''} ${packType} pack`.trim();

  db.prepare(`INSERT INTO offline_packs (id, name, device, brand, model, pack_type, size_bytes, content_json, version, downloads, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1.0', 0, ?)`).run(id, name, device, brand || null, model || null, packType, Buffer.byteLength(contentStr, 'utf8'), contentStr, now);

  return { id, name, packType, sizeBytes: Buffer.byteLength(contentStr, 'utf8'), treeCount: Object.keys(content.repairTrees || {}).length, fixCount: (content.communityFixes || []).length };
}

function getPack(packId) {
  const row = db.prepare(`SELECT * FROM offline_packs WHERE id = ?`).get(packId);
  if (!row) return null;
  db.prepare(`UPDATE offline_packs SET downloads = downloads + 1 WHERE id = ?`).run(packId);
  return { ...row, content: JSON.parse(row.content_json) };
}

function listPacks(device, brand, model, limit = 20) {
  let packs;
  if (device) {
    packs = db.prepare(`SELECT id, name, device, brand, model, pack_type, size_bytes, version, downloads, created_at FROM offline_packs WHERE device = ? ORDER BY created_at DESC LIMIT ?`).all(device, limit);
  } else {
    packs = db.prepare(`SELECT id, name, device, brand, model, pack_type, size_bytes, version, downloads, created_at FROM offline_packs ORDER BY created_at DESC LIMIT ?`).all(limit);
  }
  return packs;
}

function generateAllPacksForDevice(device, brand, model) {
  const types = ['repair_tree', 'guides', 'common_fixes', 'diagnostic_flows'];
  const results = [];
  for (const type of types) {
    results.push(generatePack(device, brand, model, type));
  }
  results.push(generatePack(device, brand, model, 'all'));
  return results;
}

module.exports = {
  generatePack,
  getPack,
  listPacks,
  generateAllPacksForDevice,
};
