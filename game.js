// ====================== LOGIC GAME + LƯU TRỮ ======================
const fs = require('fs');
const path = require('path');
const C = require('./config');

// ---------- Lưu trữ ----------
const DATA_FILE = path.join(__dirname, 'data.json');
let db = { users: {}, sects: {} };

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  db = raw.users || raw.sects ? { users: raw.users || {}, sects: raw.sects || {} } : { users: raw, sects: {} };
  // Bỏ các môn phái của phiên bản cũ (chưa có phái)
  for (const k of Object.keys(db.sects)) if (!db.sects[k].faction) delete db.sects[k];
} catch {
  /* file chưa tồn tại */
}

function saveNow() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE);
}
let saveTimer = null;
function saveDB() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, 500);
}
process.on('exit', () => {
  try { saveNow(); } catch { /* ignore */ }
});
process.on('SIGINT', () => process.exit(0));

// ---------- Tiện ích ----------
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
const bar = (cur, max, len = 10) => {
  const filled = Math.max(0, Math.min(len, Math.round((cur / max) * len)));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
};
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/_/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

const ROOT_BY_ID = Object.fromEntries(C.ROOTS.map((r) => [r.id, r]));
const REALM_COUNT = 12;

function rollRoot() {
  const total = C.ROOTS.reduce((s, r) => s + r.weight, 0);
  let x = Math.random() * total;
  for (const r of C.ROOTS) {
    x -= r.weight;
    if (x <= 0) return r;
  }
  return C.ROOTS[0];
}

// Giờ Việt Nam (UTC+7): 18h - 5h59 là ban đêm
function isNight() {
  const h = new Date(Date.now() + 7 * 3600000).getUTCHours();
  return h >= 18 || h < 6;
}

// ---------- Người chơi ----------
function getUser(id) {
  let u = db.users[id];
  if (!u) u = db.users[id] = {};
  const defaults = {
    faction: null, realm: 0, stage: 0, exp: 0, stone: 300, root: null,
    items: {}, equip: { weapon: null, armor: null },
    buff: { kiep: 0, combat: 0 }, daily: { day: 0, streak: 0 },
    sect: null, seclusion: null,
    kiepThanhCong: 0, kiepThatBai: 0, wins: 0, losses: 0, huntWins: 0,
  };
  for (const k of Object.keys(defaults)) if (u[k] === undefined) u[k] = defaults[k];
  if (u.buff.combat === undefined) u.buff.combat = 0;
  if (!ROOT_BY_ID[u.root]) u.root = rollRoot().id;
  if (u.faction && !C.FACTIONS[u.faction]) u.faction = null;
  if (u.realm >= REALM_COUNT) u.realm = REALM_COUNT - 1;
  // Dọn vật phẩm của phiên bản cũ
  for (const id of Object.keys(u.items)) if (!C.ITEMS[id]) delete u.items[id];
  for (const slot of ['weapon', 'armor']) if (u.equip[slot] && !C.ITEMS[u.equip[slot]]) u.equip[slot] = null;
  return u;
}

const F = (u) => C.FACTIONS[u.faction];
const isMaxRealm = (u) => u.realm >= REALM_COUNT - 1;
const expNeeded = (realm, stage) => Math.floor(100 * Math.pow(1.35, realm) * (1 + stage * 0.5));
const realmScale = (realm) => Math.pow(1.3, realm);
const realmOf = (faction, realm) => C.REALMS[faction][realm];
const realmName = (u) => `${realmOf(u.faction, u.realm).icon} ${realmOf(u.faction, u.realm).name} ${C.STAGES[u.stage]}`;
const money = (u, n) => `**${fmt(n)}** ${F(u).curIcon}`;

// ---------- Kho đồ ----------
const itemCount = (u, id) => u.items[id] || 0;
function addItem(u, id, n = 1) {
  u.items[id] = (u.items[id] || 0) + n;
}
function takeItem(u, id, n = 1) {
  if (itemCount(u, id) < n) return false;
  u.items[id] -= n;
  if (u.items[id] <= 0) delete u.items[id];
  return true;
}
function findItem(query, ids) {
  const q = norm(query);
  if (!q) return null;
  return (
    ids.find((id) => norm(id) === q || norm(C.ITEMS[id].name) === q) ||
    ids.find((id) => norm(C.ITEMS[id].name).includes(q)) ||
    null
  );
}
const itemLabel = (id) => `${C.ITEMS[id].emoji} ${C.ITEMS[id].name}`;

// ---------- Môn phái ----------
const sectKey = (name) => norm(name).replace(/ /g, '-');
const getSectOf = (u) => {
  const s = u.sect && db.sects[u.sect];
  return s && s.faction === u.faction ? s : null;
};
const sectExpMul = (u) => {
  const s = getSectOf(u);
  return s ? 1 + 0.05 * s.level : 1;
};
const sectMaxMembers = (s) => 10 + s.level * 5;
const SECT_MAX_LEVEL = 10;

// ---------- Chỉ số ----------
// Đạo sĩ mạnh ban ngày; ma & cương thi mạnh ban đêm
function timeMul(u) {
  if (u.faction === 'dao') return isNight() ? 1 : 1.1;
  return isNight() ? 1.15 : 0.9;
}
const expMulOf = (u) => ROOT_BY_ID[u.root].expMul * sectExpMul(u) * F(u).expMul * timeMul(u);

function baseStats(realm, stage) {
  return {
    hp: 100 + realm * 70 + stage * 18,
    atk: 12 + realm * 7 + stage * 2,
    def: 5 + realm * 4 + stage,
  };
}

function getStats(u) {
  const root = ROOT_BY_ID[u.root];
  const f = F(u);
  const b = baseStats(u.realm, u.stage);
  const w = C.ITEMS[u.equip.weapon];
  const a = C.ITEMS[u.equip.armor];
  return {
    hp: Math.round((b.hp + (a ? a.hp || 0 : 0)) * root.hpMul * f.hpMul),
    atk: Math.round((b.atk + (w ? w.atk || 0 : 0)) * root.atkMul * f.atkMul),
    def: Math.round((b.def + (a ? a.def || 0 : 0)) * root.defMul * f.defMul),
  };
}
const power = (u) => {
  const s = getStats(u);
  return Math.round(s.hp / 5 + s.atk * 3 + s.def * 2);
};

// Vòng khắc chế (PvP): Đạo Sĩ > Cương Thi > Ma > Đạo Sĩ
const BEATS = { dao: 'thi', thi: 'ma', ma: 'dao' };
const advantage = (attF, defF) => (BEATS[attF] === defF ? 1.2 : 1);

// ---------- Chiến đấu ----------
// Tạo chiến binh từ người chơi (dùng và tiêu hao Bùa/Chú tăng sát thương nếu có)
function makeFighter(u, name, { vsMonster = false, adv = 1 } = {}) {
  const f = F(u);
  const mul = (vsMonster ? f.huntBonus : 1) * adv * (1 + (u.buff.combat || 0) / 100);
  u.buff.combat = 0;
  return { name, ...getStats(u), dodge: f.dodge, verbs: f.verbs, mul };
}

function makeMonster(u, def) {
  const b = baseStats(u.realm, u.stage);
  return {
    name: `${def.emoji} ${def.name}`,
    hp: Math.round(b.hp * def.power),
    atk: Math.round(b.atk * def.power),
    def: Math.round(b.def * def.power),
    dodge: 0.06,
    verbs: ['tấn công'],
    mul: 1,
  };
}

function fight(a, b) {
  let ha = a.hp;
  let hb = b.hp;
  const log = [];
  let turnA = Math.random() < 0.5;
  let rounds = 0;
  while (ha > 0 && hb > 0 && rounds < 40) {
    rounds++;
    const att = turnA ? a : b;
    const def = turnA ? b : a;
    const crit = Math.random() < 0.12;
    const dodge = Math.random() < (def.dodge ?? 0.06);
    if (dodge) {
      log.push(`${att.name} ra đòn nhưng ${def.name} né được`);
    } else {
      const dmg = Math.max(1, Math.round(att.atk * (0.85 + Math.random() * 0.3) * (crit ? 1.6 : 1) * (att.mul || 1) - def.def * 0.5));
      if (turnA) hb -= dmg;
      else ha -= dmg;
      log.push(`${att.name} ${crit ? '💥 ' : ''}${pick(att.verbs || ['tấn công'])} ${def.name} **-${dmg}**`);
    }
    turnA = !turnA;
  }
  let winner;
  if (ha > 0 && hb <= 0) winner = 'a';
  else if (hb > 0 && ha <= 0) winner = 'b';
  else winner = ha / a.hp >= hb / b.hp ? 'a' : 'b';
  return { winner, rounds, ha: Math.max(0, ha), hb: Math.max(0, hb), log };
}

function logText(log) {
  const shown = log.length > 7 ? [...log.slice(0, 6), '…', log[log.length - 1]] : log;
  return shown.join('\n');
}

const huntsOf = (u) => C.HUNTS[u.faction];
const eligibleHunts = (u) => huntsOf(u).filter((m) => m.minRealm <= u.realm);

module.exports = {
  db, saveDB, rand, pick, fmt, bar, norm, isNight,
  ROOT_BY_ID, REALM_COUNT, getUser, F, isMaxRealm, expNeeded, realmScale, realmOf, realmName, money,
  itemCount, addItem, takeItem, findItem, itemLabel,
  sectKey, getSectOf, sectExpMul, sectMaxMembers, SECT_MAX_LEVEL,
  expMulOf, baseStats, getStats, power, advantage,
  makeFighter, makeMonster, fight, logText, huntsOf, eligibleHunts,
};
