// ☯️ ĐẠO SĨ BOT v3.0 – Bot RPG Discord lấy cảm hứng từ phim "Cương Thi Tiên Sinh"
// Mới: đồ riêng từng môn phái (vũ khí/giáp/PHÁP BẢO/BÙA HỘ THÂN), cường hóa +15 có tỉ lệ thất bại & SÉT ĐÁNH,
//      độ THIÊN KIẾP để đột phá cảnh giới, 3 tuyệt kỹ mỗi phái, phù chú dùng trong trận, 2 khu vực mới.
// Yêu cầu: Node.js 18+ và discord.js v14

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Events, MessageFlags,
} = require('discord.js');

/* ═══════════════════════════ TIỆN ÍCH ═══════════════════════════ */
const EPH = MessageFlags.Ephemeral;
const fmt = (n) => Math.floor(n).toLocaleString('vi-VN');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (x) => `${Math.round(x * 100)}%`;
const bar = (c, m, len = 10) => {
  const f = Math.max(0, Math.min(len, Math.round((c / m) * len)));
  return '▰'.repeat(f) + '▱'.repeat(len - f);
};
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const row = (...c) => new ActionRowBuilder().addComponents(...c);

const QUOTES = [
  'Cửu Thúc: Cương thi sợ gạo nếp và máu chó đen!',
  'Cửu Thúc: Cương thi hít thở là có sát khí, nín thở thì nó không thấy ngươi!',
  'Cửu Thúc: Đạo sĩ giỏi không đánh nhiều, mà biết lúc nào dùng phù.',
  'Cửu Thúc: Chu sa và giấy vàng, thiếu một thứ là phù vô dụng.',
  'Cửu Thúc: Thu Sinh, Văn Tài! Đừng có chạy lung tung!',
  'Cửu Thúc: Bình tâm tĩnh khí, linh lực tự nhiên hồi phục.',
  'Cửu Thúc: Cường hóa quá tay là bị sét đánh đó. Có Phù Bảo Hộ thì mới liều!',
  'Cửu Thúc: Thiên kiếp không đáng sợ, đáng sợ là chuẩn bị thiếu thủ!',
];
const embed = (color = 0xc0392b) => new EmbedBuilder().setColor(color).setFooter({ text: pick(QUOTES) });

/* ═══════════════════════════ DỮ LIỆU GAME ═══════════════════════════ */
const REALMS = ['Luyện Khí', 'Trúc Cơ', 'Kết Đan', 'Nguyên Anh', 'Hóa Thần', 'Phản Hư'];
const capOf = (p) => (p.realm >= 5 ? 99 : (p.realm + 1) * 10 - 1); // cấp tối đa của cảnh giới hiện tại
const expNeed = (l) => 100 + (l - 1) * 80 + l * l * 5;

// Môn phái – mỗi phái có 3 tuyệt kỹ (mở khóa ở cấp 1 / 8 / 16)
const CLASSES = {
  maoson: {
    name: 'Đạo sĩ Mao Sơn', emoji: '☯️',
    desc: 'Cân bằng công thủ, như Cửu Thúc. Chuyên Lôi pháp, hút chính khí hồi máu.',
    hp: 100, mp: 50, atk: 10, def: 5, g: { hp: 16, mp: 6, atk: 2, def: 1.2 },
    skills: [
      { name: 'Thiên Lôi Chú', lv: 1, cost: 20, mult: 2.0, heal: 0.1 },
      { name: 'Ngũ Lôi Chính Pháp', lv: 8, cost: 40, mult: 0.9, hits: 3 },
      { name: 'Thiên Sư Hàng Ma', lv: 16, cost: 80, mult: 4.5, stun: 0.5, heal: 0.2 },
    ],
  },
  phuchu: {
    name: 'Phù Chú Sư', emoji: '📜',
    desc: 'Linh lực dồi dào, phù chú xuyên giáp. Máu giấy nhưng sát thương khủng.',
    hp: 80, mp: 80, atk: 8, def: 3, g: { hp: 12, mp: 10, atk: 2.2, def: 0.8 },
    skills: [
      { name: 'Cửu Long Phù Ấn', lv: 1, cost: 25, mult: 2.6, ignoreDef: true },
      { name: 'Liệt Hỏa Phù', lv: 8, cost: 40, mult: 1.6, burn: { atkPct: 0.35, t: 3 } },
      { name: 'Vạn Phù Quy Tông', lv: 16, cost: 90, mult: 1.1, hits: 5, ignoreDef: true },
    ],
  },
  vodao: {
    name: 'Võ Đạo Sĩ', emoji: '🥋',
    desc: 'Thân thể cứng như thép, đấm là cương thi choáng váng.',
    hp: 130, mp: 30, atk: 12, def: 8, g: { hp: 20, mp: 3, atk: 2.4, def: 1.6 },
    skills: [
      { name: 'Thiết Sa Chưởng', lv: 1, cost: 15, mult: 1.8, stun: 0.4 },
      { name: 'Kim Chung Tráo', lv: 8, cost: 30, mult: 0.8, shield: { pct: 0.5, t: 3 } },
      { name: 'Long Hổ Quyền', lv: 16, cost: 60, mult: 3.8, lifesteal: 0.3, stun: 0.3 },
    ],
  },
};

/* ── Trang bị riêng từng môn phái: [id, tên, emoji, (hiệu ứng đặc biệt)] ──
   weapon: 5 bậc • armor: 4 bậc • treasure (pháp bảo): 3 bậc • charm (bùa hộ thân): 3 bậc            */
const GEAR = {
  maoson: {
    weapon: [['kiemgodao', 'Kiếm Gỗ Đào', '🗡️'], ['kiemdongtien', 'Kiếm Đồng Tiền', '🪙'], ['thatinhkiem', 'Thất Tinh Kiếm', '⚔️'], ['loikichkiem', 'Lôi Kích Mộc Kiếm', '🌩️'], ['anthiensu', 'Ấn Thiên Sư', '🔱']],
    armor: [['daobaoxanh', 'Đạo Bào Xanh', '🥋'], ['daobaobatquai', 'Đạo Bào Bát Quái', '👘'], ['daobaotamthanh', 'Đạo Bào Tam Thanh', '🎽'], ['giapthienlong', 'Giáp Thiên Long', '🛡️']],
    treasure: [['lasanphongthuy', 'La Bàn Phong Thủy', '🧭', { crit: 0.05 }], ['tamthanhchung', 'Tam Thanh Linh Chung', '🛎️', { thunder: 0.12 }], ['thienleiankinh', 'Thiên Lôi Ấn Kính', '🪞', { thunder: 0.2, crit: 0.05 }]],
    charm: [['binhanphu', 'Bình An Phù', '🧧', { dodge: 0.03 }], ['trantaphu', 'Trấn Tà Phù', '📛', { dodge: 0.05, reduce: 0.03 }], ['homenhphu', 'Thiên Sư Hộ Mệnh Phù', '🏮', { dodge: 0.07, thunder: 0.08 }]],
  },
  phuchu: {
    weapon: [['butdaophu', 'Bút Đạo Phù', '🖊️'], ['phattranlinhphu', 'Phất Trần Linh Phù', '🪶'], ['truongnguhanh', 'Ngũ Hành Pháp Trượng', '🪄'], ['ngocnhuy', 'Cửu Thiên Ngọc Như Ý', '🔮'], ['thienthuphudien', 'Thiên Thư Phù Điển', '📖']],
    armor: [['aochoangphuchu', 'Áo Choàng Phù Chú', '🧥'], ['daobaongunhanh', 'Đạo Bào Ngũ Hành', '👘'], ['linhphuphapy', 'Linh Phù Pháp Y', '🥼'], ['cuuthienhuyeny', 'Cửu Thiên Huyền Y', '🧣']],
    treasure: [['tuiphutramla', 'Túi Phù Trăm Lá', '👜', { regen: 5 }], ['chusalinhnghien', 'Chu Sa Linh Nghiễn', '🖋️', { regen: 9, crit: 0.06 }], ['vanphubaothap', 'Vạn Phù Bảo Tháp', '🗼', { regen: 14, thunder: 0.15 }]],
    charm: [['phugiayvang', 'Phù Giấy Vàng', '📃', { regen: 3 }], ['phutulinh', 'Phù Tụ Linh', '🎴', { regen: 6, crit: 0.03 }], ['cuuthienlinhphu', 'Cửu Thiên Linh Phù', '🀄', { regen: 10, crit: 0.06 }]],
  },
  vodao: {
    weapon: [['quyensatsat', 'Quyền Sáo Sắt', '🥊'], ['conthietmoc', 'Côn Thiết Mộc', '🪵'], ['langnhabong', 'Lang Nha Bổng', '🏏'], ['phucmagian', 'Phục Ma Giản', '🔨'], ['longhochienthuong', 'Long Hổ Chiến Thương', '🔱']],
    armor: [['aovailuyencong', 'Áo Vải Luyện Công', '🥋'], ['thietbosam', 'Thiết Bố Sam', '🧥'], ['kimchunggiap', 'Kim Chung Giáp', '🛡️'], ['longlanchiengiap', 'Long Lân Chiến Giáp', '🐲']],
    treasure: [['kimcangxu', 'Kim Cang Xử', '🪓', { reduce: 0.06 }], ['cuuhoanthientruong', 'Cửu Hoàn Thiền Trượng', '🦯', { reduce: 0.1, thorns: 0.12 }], ['longhodongnhan', 'Long Hổ Đồng Nhân', '🗿', { lifesteal: 0.08, reduce: 0.08, stun: 0.1 }]],
    charm: [['kimthanphu', 'Kim Thân Phù', '🟡', { reduce: 0.04 }], ['thietbophu', 'Thiết Bố Phù', '🟠', { reduce: 0.07, lifesteal: 0.03 }], ['bathoaikimthanphu', 'Bất Hoại Kim Thân Phù', '🔶', { reduce: 0.1, lifesteal: 0.05 }]],
  },
};
const WEAPON_LV = [1, 5, 10, 16, 24], WEAPON_ATK = [6, 14, 26, 42, 70];
const ARMOR_LV = [1, 5, 10, 16], ARMOR_DEF = [4, 10, 18, 30], ARMOR_HP = [15, 40, 90, 160];
const TREAS_LV = [6, 12, 20], TREAS = { atk: [5, 10, 18], def: [3, 6, 12], hp: [40, 90, 170], mp: [20, 40, 70] };
const CHARM_LV = [2, 8, 14], CHARM = { atk: [3, 6, 11], def: [2, 4, 8], hp: [30, 70, 130] };

const ITEMS = {};
const RECIPES = {};
const priceOf = (o) => Math.round(((o.atk || 0) * 10 + (o.def || 0) * 10 + (o.hp || 0) * 1.2 + (o.mp || 0) * 2) * 3 * (1 + o.lv / 8) / 10) * 10;

for (const [cls, g] of Object.entries(GEAR)) {
  g.weapon.forEach(([id, name, emoji], t) => {
    const atk = WEAPON_ATK[t];
    const o = { name, emoji, type: 'weapon', cls, tier: t, lv: WEAPON_LV[t], atk, shop: t <= 2 };
    if (cls === 'phuchu') o.mp = Math.round(atk * 1.5);
    if (cls === 'vodao') o.hp = atk * 3;
    if (cls === 'maoson') o.def = Math.round(atk * 0.3);
    ITEMS[id] = { ...o, price: priceOf(o) };
  });
  g.armor.forEach(([id, name, emoji], t) => {
    const k = cls === 'vodao' ? 1.2 : cls === 'phuchu' ? 0.85 : 1;
    const o = { name, emoji, type: 'armor', cls, tier: t, lv: ARMOR_LV[t], def: Math.round(ARMOR_DEF[t] * k), hp: Math.round(ARMOR_HP[t] * k), shop: t <= 2 };
    if (cls === 'phuchu') o.mp = 15 * (t + 1);
    ITEMS[id] = { ...o, price: priceOf(o) };
  });
  g.treasure.forEach(([id, name, emoji, perk], t) => {
    const o = { name, emoji, type: 'treasure', cls, tier: t, lv: TREAS_LV[t], atk: TREAS.atk[t], def: TREAS.def[t], hp: TREAS.hp[t], mp: TREAS.mp[t], perk, shop: t <= 1 };
    ITEMS[id] = { ...o, price: priceOf(o) };
  });
  g.charm.forEach(([id, name, emoji, perk], t) => {
    const o = { name, emoji, type: 'charm', cls, tier: t, lv: CHARM_LV[t], atk: CHARM.atk[t], def: CHARM.def[t], hp: CHARM.hp[t], perk, shop: t <= 1 };
    ITEMS[id] = { ...o, price: priceOf(o) };
  });
  // Công thức chế đồ bậc cao (cần món bậc trước + nguyên liệu)
  const rec = (arr, t, need, gold) => { RECIPES[arr[t][0]] = { need: { [arr[t - 1][0]]: 1, ...need }, out: 1, gold }; };
  rec(g.weapon, 3, { loithach: 5, xuongthi: 8, nanhholy: 5 }, 1500);
  rec(g.weapon, 4, { loithach: 12, huyetngoc: 6, nanhholy: 10 }, 6000);
  rec(g.armor, 3, { loithach: 5, xuongthi: 8, nanhholy: 5 }, 1500);
  rec(g.treasure, 2, { loithach: 6, huyetngoc: 3, chusa: 10 }, 3000);
  rec(g.charm, 2, { loithach: 4, giayvang: 15, chusa: 8 }, 1000);
}

// Vật phẩm dùng chung
Object.assign(ITEMS, {
  // Pháp khí (ô phụ kiện)
  batquaikinh:    { name: 'Bát Quái Kính',    emoji: '🪞', type: 'acc', atk: 4, def: 4, price: 1100, lv: 5, shop: true },
  chuongnhiephon: { name: 'Chuông Nhiếp Hồn', emoji: '🔔', type: 'acc', mp: 50, price: 700, lv: 3, shop: true },
  ngocphuho:      { name: 'Ngọc Hộ Mệnh',     emoji: '📿', type: 'acc', hp: 120, price: 1800, lv: 8, shop: true },
  tuhonchau:      { name: 'Tụ Hồn Châu',      emoji: '💠', type: 'acc', mp: 100, hp: 100, price: 6000, lv: 14, perk: { regen: 6 } },
  longhongocboi:  { name: 'Long Hổ Ngọc Bội', emoji: '🧿', type: 'acc', atk: 14, def: 10, hp: 150, price: 12000, lv: 20, perk: { crit: 0.05, reduce: 0.04 } },
  // Đan dược (dùng được cả trong trận)
  linhdan:     { name: 'Linh Đan',       emoji: '💊', type: 'potion', price: 50,  lv: 1,  shop: true, use: { heal: 60 } },
  dailinhdan:  { name: 'Đại Linh Đan',   emoji: '🔮', type: 'potion', price: 180, lv: 5,  shop: true, use: { heal: 200 } },
  thanlinhdan: { name: 'Thần Linh Đan',  emoji: '💎', type: 'potion', price: 650, lv: 14, shop: true, use: { heal: 600 } },
  tudan:       { name: 'Tụ Khí Đan',     emoji: '🍵', type: 'potion', price: 70,  lv: 1,  shop: true, use: { mana: 40 } },
  hoilinhdan:  { name: 'Hồi Linh Đan',   emoji: '🧪', type: 'potion', price: 300, lv: 10, shop: true, use: { mana: 150 } },
  // Phù chú dùng trong trận
  phutranthi:  { name: 'Phù Trấn Thi',   emoji: '📜', type: 'talisman', price: 80,  lv: 1,  shop: true, desc: 'Định thân quái 2 lượt (boss 1)', use: { stun: 2, bossStun: 1 } },
  phuloi:      { name: 'Phù Lôi',        emoji: '⚡', type: 'talisman', price: 150, lv: 3,  shop: true, desc: 'Sét 40+5×cấp, xuyên giáp', use: { dmg: 40, perLevel: 5 } },
  gaoep:       { name: 'Gạo Nếp',        emoji: '🌾', type: 'talisman', price: 30,  lv: 1,  shop: true, desc: 'Cực mạnh với cương thi/ma quỷ', use: { dmg: 40, perLevel: 3, undeadOnly: true, fallback: 6 } },
  phuhothan:   { name: 'Phù Hộ Thân',    emoji: '🛡️', type: 'talisman', price: 200, lv: 3,  shop: true, desc: 'Giảm 50% sát thương nhận 3 lượt', use: { shield: { pct: 0.5, t: 3 } } },
  phuliethoa:  { name: 'Phù Liệt Hỏa',   emoji: '🔥', type: 'talisman', price: 250, lv: 5,  shop: true, desc: 'Thiêu đốt 4 lượt', use: { burn: { atkPct: 0.4, t: 4 } } },
  phuthienloi: { name: 'Thiên Lôi Phù',  emoji: '🌩️', type: 'talisman', price: 600, lv: 12, shop: true, desc: 'Sét lớn = 3.5×công, xuyên giáp', use: { dmgAtk: 3.5 } },
  phudontho:   { name: 'Phù Độn Thổ',    emoji: '💨', type: 'talisman', price: 150, lv: 1,  shop: true, desc: 'Trốn thoát 100%', use: { flee: true } },
  phuchinhkhi: { name: 'Phù Chính Khí',  emoji: '🏮', type: 'talisman', cls: 'maoson', price: 400, lv: 3, shop: true, desc: 'Hồi 35% HP + giảm 30% sát thương 2 lượt', use: { healPct: 0.35, shield: { pct: 0.3, t: 2 } } },
  phuvanloi:   { name: 'Vạn Lôi Phù',    emoji: '🌀', type: 'talisman', cls: 'phuchu', price: 450, lv: 3, shop: true, desc: 'Giáng 5.5×công, xuyên giáp', use: { dmgAtk: 5.5 } },
  phukimcang:  { name: 'Kim Cang Phù',   emoji: '🔰', type: 'talisman', cls: 'vodao',  price: 400, lv: 3, shop: true, desc: 'Giảm 70% sát thương 4 lượt + hồi 15% HP', use: { shield: { pct: 0.7, t: 4 }, healPct: 0.15 } },
  // Phù hỗ trợ cường hóa & độ kiếp (không dùng trong trận)
  thienvanphu: { name: 'Thiên Vận Phù',  emoji: '🍀', type: 'talisman', price: 800,  lv: 3, shop: true, desc: 'Cường hóa: +10% tỉ lệ thành công' },
  phubaoho:    { name: 'Phù Bảo Hộ',     emoji: '🧿', type: 'talisman', price: 2500, lv: 5, shop: true, desc: 'Cường hóa: chống tụt cấp & vỡ đồ' },
  phuhokiep:   { name: 'Phù Hộ Kiếp',    emoji: '☂️', type: 'talisman', price: 1500, lv: 9, shop: true, desc: 'Độ kiếp: giảm 30% sét đánh' },
  loikiepdan:  { name: 'Lôi Kiếp Đan',   emoji: '🍯', type: 'talisman', price: 1200, lv: 9, shop: true, desc: 'Độ kiếp: hồi 10% HP sau mỗi tia sét' },
  // Nguyên liệu
  chusa:    { name: 'Chu Sa',          emoji: '🔴', type: 'material', price: 20, shop: true },
  giayvang: { name: 'Giấy Vàng',       emoji: '📄', type: 'material', price: 10, shop: true },
  maucho:   { name: 'Máu Chó Đen',     emoji: '🩸', type: 'material', price: 25, shop: true },
  linhthach:{ name: 'Linh Thạch',      emoji: '💠', type: 'material', price: 120, shop: true, desc: 'Dùng để cường hóa' },
  xuongthi: { name: 'Xương Cương Thi', emoji: '🦴', type: 'material', sell: 40 },
  nanhholy: { name: 'Nanh Hồ Ly',      emoji: '🦷', type: 'material', sell: 80 },
  loithach: { name: 'Lôi Thạch',       emoji: '🪨', type: 'material', sell: 200, desc: 'Kết tinh sét trời' },
  huyetngoc:{ name: 'Huyết Ngọc',      emoji: '💎', type: 'material', sell: 400, desc: 'Ngọc từ Huyết Hải' },
});

// Công thức chế chung
Object.assign(RECIPES, {
  phutranthi:  { need: { giayvang: 1, chusa: 1 }, out: 2, gold: 0 },
  phuloi:      { need: { giayvang: 2, chusa: 2, xuongthi: 1 }, out: 3, gold: 0 },
  phuhothan:   { need: { giayvang: 2, chusa: 1, nanhholy: 1 }, out: 2, gold: 0 },
  phuliethoa:  { need: { giayvang: 2, chusa: 2, maucho: 1 }, out: 2, gold: 0 },
  phuthienloi: { need: { phuloi: 3, loithach: 2 }, out: 1, gold: 200 },
  dailinhdan:  { need: { linhdan: 3, nanhholy: 1 }, out: 1, gold: 0 },
  thanlinhdan: { need: { dailinhdan: 3, nanhholy: 2, maucho: 2 }, out: 1, gold: 100 },
  hoilinhdan:  { need: { tudan: 3, chusa: 2 }, out: 1, gold: 0 },
  thienvanphu: { need: { giayvang: 3, chusa: 3, maucho: 2 }, out: 1, gold: 100 },
  phubaoho:    { need: { giayvang: 5, chusa: 5, loithach: 2 }, out: 1, gold: 500 },
  tuhonchau:   { need: { ngocphuho: 1, loithach: 3, huyetngoc: 2 }, out: 1, gold: 2000 },
  longhongocboi: { need: { batquaikinh: 1, loithach: 6, huyetngoc: 4 }, out: 1, gold: 5000 },
});

const TYPE_INFO = {
  weapon: ['⚔️', 'Vũ khí'], armor: ['🥋', 'Giáp / Đạo bào'], treasure: ['🔱', 'Pháp bảo'], charm: ['🧧', 'Bùa hộ thân'],
  acc: ['📿', 'Pháp khí'], potion: ['💊', 'Đan dược'], talisman: ['📜', 'Phù chú & trừ tà'], material: ['🧪', 'Nguyên liệu'],
};
const SLOT_OF = { weapon: 'weapon', armor: 'armor', treasure: 'treasure', charm: 'charm', acc: 'accessory' };
const SLOT_NAME = { weapon: '⚔️ Vũ khí', armor: '🥋 Giáp', treasure: '🔱 Pháp bảo', charm: '🧧 Bùa hộ thân', accessory: '📿 Pháp khí' };
const gearId = (cls, type, idx) => GEAR[cls]?.[type]?.[idx]?.[0];

// Bản đồ & yêu ma. drops: [id | 'loại:bậc', tỉ lệ, số lượng tối đa]
const MAPS = {
  nghiadia: {
    name: 'Nghĩa Địa Hoang', emoji: '🪦', lv: 1,
    mobs: [
      { name: 'Cương Thi Nhỏ', emoji: '🧟', hp: 40, atk: 8, def: 2, exp: 20, gold: [10, 25], undead: true, drops: [['xuongthi', 0.3], ['chusa', 0.15]] },
      { name: 'Hồn Ma Lang Thang', emoji: '👻', hp: 30, atk: 10, def: 0, exp: 18, gold: [8, 20], undead: true, drops: [['giayvang', 0.35]] },
      { name: 'Quỷ Đói', emoji: '👹', hp: 55, atk: 9, def: 3, exp: 26, gold: [12, 30], drops: [['maucho', 0.3]] },
    ],
    boss: { name: 'Cương Thi Áo Xanh', emoji: '🧟‍♂️', hp: 150, atk: 16, def: 6, exp: 100, gold: [80, 140], undead: true, drops: [['xuongthi', 1], ['dailinhdan', 0.4], ['weapon:1', 0.1], ['charm:0', 0.15]] },
  },
  rungho: {
    name: 'Rừng Hồ Ly', emoji: '🌲', lv: 5,
    mobs: [
      { name: 'Hồ Ly Tinh', emoji: '🦊', hp: 100, atk: 18, def: 6, exp: 55, gold: [30, 60], drops: [['nanhholy', 0.4]] },
      { name: 'Yêu Sói', emoji: '🐺', hp: 120, atk: 20, def: 8, exp: 60, gold: [30, 65], drops: [['maucho', 0.25], ['nanhholy', 0.15]] },
      { name: 'Thi Quỷ', emoji: '💀', hp: 110, atk: 19, def: 7, exp: 58, gold: [28, 60], undead: true, drops: [['xuongthi', 0.45], ['chusa', 0.3]] },
    ],
    boss: { name: 'Cửu Vĩ Hồ', emoji: '🦊', hp: 380, atk: 36, def: 14, exp: 280, gold: [200, 350], drops: [['nanhholy', 1], ['phuloi', 0.6], ['batquaikinh', 0.1], ['treasure:0', 0.12], ['armor:1', 0.1], ['charm:1', 0.12]] },
  },
  mieucu: {
    name: 'Miếu Cổ Âm Khí', emoji: '🏚️', lv: 10,
    mobs: [
      { name: 'Cương Thi Nghìn Năm', emoji: '🧟', hp: 230, atk: 34, def: 14, exp: 110, gold: [60, 120], undead: true, drops: [['xuongthi', 0.5], ['chusa', 0.3], ['loithach', 0.12]] },
      { name: 'Ma Nữ Áo Đỏ', emoji: '👺', hp: 200, atk: 38, def: 10, exp: 120, gold: [70, 130], undead: true, drops: [['giayvang', 0.4], ['nanhholy', 0.2], ['loithach', 0.12]] },
      { name: 'Hắc Miêu Yêu', emoji: '🐈‍⬛', hp: 180, atk: 36, def: 12, exp: 105, gold: [60, 110], drops: [['maucho', 0.35], ['nanhholy', 0.3], ['loithach', 0.12]] },
    ],
    boss: { name: 'Thi Vương', emoji: '👑', hp: 800, atk: 58, def: 24, exp: 600, gold: [500, 800], undead: true, drops: [['xuongthi', 1], ['loithach', 1, 2], ['weapon:2', 0.12], ['armor:2', 0.1], ['treasure:1', 0.12], ['charm:1', 0.15], ['tuhonchau', 0.05]] },
  },
  amphu: {
    name: 'Cổng Âm Phủ', emoji: '🔥', lv: 18,
    mobs: [
      { name: 'Quỷ Sai', emoji: '👹', hp: 450, atk: 62, def: 26, exp: 220, gold: [150, 260], undead: true, drops: [['xuongthi', 0.5], ['maucho', 0.3], ['loithach', 0.2]] },
      { name: 'Hắc Vô Thường', emoji: '⚫', hp: 520, atk: 68, def: 28, exp: 260, gold: [180, 300], undead: true, drops: [['nanhholy', 0.4], ['phuloi', 0.3], ['loithach', 0.2]] },
      { name: 'Bạch Vô Thường', emoji: '⚪', hp: 500, atk: 66, def: 30, exp: 255, gold: [180, 300], undead: true, drops: [['giayvang', 0.5], ['chusa', 0.4], ['loithach', 0.2]] },
    ],
    boss: { name: 'Quỷ Vương', emoji: '😈', hp: 2000, atk: 105, def: 45, exp: 1500, gold: [1200, 2000], undead: true, drops: [['loithach', 1, 3], ['weapon:3', 0.12], ['armor:3', 0.1], ['charm:2', 0.1], ['treasure:2', 0.05], ['phuhokiep', 0.3], ['longhongocboi', 0.03]] },
  },
  thiencoc: {
    name: 'Lôi Âm Cốc', emoji: '⛈️', lv: 24,
    mobs: [
      { name: 'Lôi Hổ', emoji: '🐯', hp: 900, atk: 118, def: 50, exp: 380, gold: [250, 420], drops: [['loithach', 0.45, 2], ['nanhholy', 0.3]] },
      { name: 'Điểu Lôi Yêu', emoji: '🦅', hp: 800, atk: 125, def: 44, exp: 360, gold: [240, 400], drops: [['loithach', 0.5], ['giayvang', 0.4]] },
      { name: 'Sét Quỷ', emoji: '🌩️', hp: 1000, atk: 112, def: 55, exp: 400, gold: [260, 440], undead: true, drops: [['loithach', 0.45], ['xuongthi', 0.5]] },
    ],
    boss: { name: 'Lôi Long', emoji: '🐉', hp: 4800, atk: 205, def: 90, exp: 2600, gold: [1500, 2500], drops: [['loithach', 1, 5], ['weapon:4', 0.12], ['treasure:2', 0.12], ['loikiepdan', 0.5], ['phuhokiep', 0.5]] },
  },
  mama: {
    name: 'Huyết Hải Ma Cung', emoji: '🌋', lv: 34,
    mobs: [
      { name: 'Huyết Ma', emoji: '🩸', hp: 1500, atk: 190, def: 80, exp: 650, gold: [500, 800], undead: true, drops: [['huyetngoc', 0.4], ['maucho', 0.5]] },
      { name: 'Ma Tướng', emoji: '👿', hp: 1800, atk: 205, def: 95, exp: 720, gold: [550, 880], drops: [['huyetngoc', 0.45], ['loithach', 0.3]] },
      { name: 'Huyết Cương Thi', emoji: '🧟', hp: 1700, atk: 195, def: 85, exp: 690, gold: [520, 840], undead: true, drops: [['huyetngoc', 0.4], ['xuongthi', 0.6]] },
    ],
    boss: { name: 'Huyết Hải Ma Tôn', emoji: '😈', hp: 13000, atk: 330, def: 150, exp: 7000, gold: [4000, 7000], undead: true, drops: [['huyetngoc', 1, 4], ['weapon:4', 0.25], ['armor:3', 0.25], ['treasure:2', 0.2], ['loikiepdan', 0.6]] },
  },
};

/* ═══════════════════════════ LƯU TRỮ ═══════════════════════════ */
const DB_FILE = path.join(__dirname, 'data.json');
let db = { players: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { /* lần chạy đầu */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), () => {}), 500);
}
function saveNow() { try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch { /* bỏ qua */ } }
process.on('SIGINT', () => { saveNow(); process.exit(0); });
process.on('SIGTERM', () => { saveNow(); process.exit(0); });

// Nâng cấp dữ liệu cũ (v2 → v3)
function migrate(p) {
  p.enh ??= {}; p.lastKiep ??= 0; p.kiepDone ??= 0;
  p.realm ??= Math.min(5, Math.floor(p.level / 10));
  p.equip.treasure ??= null; p.equip.charm ??= null;
  for (const id of Object.keys(p.inv)) if (!ITEMS[id]) delete p.inv[id];
  for (const [slot, id] of Object.entries(p.equip)) {
    if (!id) continue;
    if (!ITEMS[id]) p.equip[slot] = null;
    else if (ITEMS[id].cls && ITEMS[id].cls !== p.cls) { p.inv[id] = (p.inv[id] || 0) + 1; p.equip[slot] = null; }
  }
  return p;
}
Object.values(db.players).forEach(migrate);

/* ═══════════════════════════ NHÂN VẬT ═══════════════════════════ */
const enhOf = (p, id) => p.enh[id] || 0;
const label = (id) => `${ITEMS[id].emoji} ${ITEMS[id].name}`;
const dname = (p, id) => `${enhOf(p, id) ? `**+${enhOf(p, id)}** ` : ''}${label(id)}`;
const count = (p, id) => p.inv[id] || 0;
const addItem = (p, id, n = 1) => { p.inv[id] = count(p, id) + n; };
function removeItem(p, id, n = 1) { p.inv[id] = count(p, id) - n; if (p.inv[id] <= 0) delete p.inv[id]; }
const owns = (p, id) => count(p, id) > 0 || Object.values(p.equip).includes(id);
const canEnhance = (id) => ITEMS[id] && SLOT_OF[ITEMS[id].type];

function stats(p) {
  const c = CLASSES[p.cls], l = p.level - 1, rm = 1 + 0.1 * p.realm; // mỗi cảnh giới +10% chỉ số gốc
  const s = {
    maxHp: Math.round((c.hp + l * c.g.hp) * rm), maxMp: Math.round((c.mp + l * c.g.mp) * rm),
    atk: Math.round((c.atk + l * c.g.atk) * rm), def: Math.round((c.def + l * c.g.def) * rm),
  };
  for (const id of Object.values(p.equip)) {
    if (!id) continue;
    const it = ITEMS[id], m = 1 + 0.12 * enhOf(p, id);
    s.atk += Math.round((it.atk || 0) * m); s.def += Math.round((it.def || 0) * m);
    s.maxHp += Math.round((it.hp || 0) * m); s.maxMp += Math.round((it.mp || 0) * m);
  }
  return s;
}

// Hiệu ứng đặc biệt của pháp bảo / bùa (tăng 5% mỗi cấp cường hóa)
function perks(p) {
  const r = { crit: 0, dodge: 0, reduce: 0, lifesteal: 0, thorns: 0, stun: 0, thunder: 0, regen: 0 };
  for (const id of Object.values(p.equip)) {
    const pk = id && ITEMS[id].perk;
    if (!pk) continue;
    const k = 1 + 0.05 * enhOf(p, id);
    for (const [key, v] of Object.entries(pk)) r[key] += key === 'regen' ? Math.round(v * k) : v * k;
  }
  r.dodge = Math.min(r.dodge, 0.4); r.reduce = Math.min(r.reduce, 0.5);
  return r;
}
const PERK_TEXT = {
  crit: (v) => `+${pct(v)} chí mạng`, dodge: (v) => `+${pct(v)} né`, reduce: (v) => `giảm ${pct(v)} sát thương`,
  lifesteal: (v) => `hút ${pct(v)} máu`, thorns: (v) => `phản ${pct(v)} sát thương`, stun: (v) => `${pct(v)} gây choáng`,
  thunder: (v) => `${pct(v)} triệu thiên lôi`, regen: (v) => `+${v} LL/lượt`,
};
const perkText = (pk) => (pk ? Object.entries(pk).map(([k, v]) => PERK_TEXT[k](v)).join(', ') : '');

function statText(it, L = 0) {
  const m = 1 + 0.12 * L, parts = [];
  if (it.atk) parts.push(`+${Math.round(it.atk * m)} CÔNG`);
  if (it.def) parts.push(`+${Math.round(it.def * m)} THỦ`);
  if (it.hp) parts.push(`+${Math.round(it.hp * m)} HP`);
  if (it.mp) parts.push(`+${Math.round(it.mp * m)} LL`);
  const u = it.use || {};
  if (u.heal) parts.push(`hồi ${u.heal} HP`);
  if (u.mana) parts.push(`hồi ${u.mana} LL`);
  if (it.perk) parts.push(perkText(it.perk));
  if (it.desc) parts.push(it.desc);
  return parts.join(', ');
}

function newPlayer(cls, name) {
  const p = {
    name, cls, level: 1, exp: 0, realm: 0, gold: 200,
    inv: { linhdan: 3, phutranthi: 2, gaoep: 2 },
    equip: { weapon: null, armor: null, treasure: null, charm: null, accessory: null },
    enh: {}, hp: 0, mp: 0, kills: 0, deaths: 0, bossKills: 0, kiepDone: 0,
    streak: 0, lastDaily: 0, lastMeditate: 0, lastKiep: 0, quest: null,
  };
  const s = stats(p); p.hp = s.maxHp; p.mp = s.maxMp;
  return p;
}

// Trả về số cấp lên được. Chạm bình cảnh thì EXP dừng ở mức đầy – cần /dokiep
function gainExp(p, amt) {
  p.exp += amt;
  let ups = 0;
  while (p.level < capOf(p) && p.exp >= expNeed(p.level)) { p.exp -= expNeed(p.level); p.level++; ups++; }
  if (p.level >= capOf(p)) p.exp = Math.min(p.exp, expNeed(p.level));
  if (ups) { const s = stats(p); p.hp = s.maxHp; p.mp = s.maxMp; }
  return ups;
}
const atBottleneck = (p) => p.realm < 5 && p.level >= capOf(p) && p.exp >= expNeed(p.level);

/* ═══════════════════════════ CHIẾN ĐẤU ═══════════════════════════ */
const fights = new Map();
setInterval(() => { for (const [k, f] of fights) if (Date.now() - f.t > 15 * 60 * 1000) fights.delete(k); }, 5 * 60 * 1000).unref();

function calcDmg(atk, def, { mult = 1, ignoreDef = false, critC = 0.15 } = {}) {
  let d = atk * mult * (0.85 + Math.random() * 0.3) - (ignoreDef ? 0 : def * 0.5);
  const crit = Math.random() < critC;
  if (crit) d *= 1.6;
  return { dmg: Math.max(1, Math.round(d)), crit };
}

function beginFight(uid, p, mapId) {
  const map = MAPS[mapId];
  if (p.level < map.lv) return { error: `⛔ Khu vực **${map.name}** yêu cầu cấp **${map.lv}** trở lên!` };
  const s = stats(p);
  if (p.hp < s.maxHp * 0.15) return { error: '🩸 Bạn quá yếu! Hãy dùng đan dược hoặc `/toathien` để hồi sức trước.' };
  const boss = Math.random() < 0.1;
  const m = { ...(boss ? map.boss : pick(map.mobs)) };
  const f = { map: mapId, m, mHp: m.hp, boss, stun: 0, burn: null, shield: null, turn: 1, t: Date.now(), over: null,
    log: [`${boss ? '👑 **BOSS XUẤT HIỆN!** ' : ''}${m.emoji} **${m.name}** chặn đường bạn!`] };
  fights.set(uid, f);
  return { fight: f };
}

function fightView(uid, p, f) {
  const s = stats(p), cls = CLASSES[p.cls], m = f.m;
  const btn = (id, text, style, emoji, disabled = false) =>
    new ButtonBuilder().setCustomId(`cb:${id}:${uid}`).setLabel(text).setStyle(style).setEmoji(emoji).setDisabled(disabled);
  const skillBtns = cls.skills.map((sk, i) => btn(`s${i}`,
    p.level < sk.lv ? `Khóa (Lv${sk.lv})` : `${sk.name} (${sk.cost})`, ButtonStyle.Primary, p.level < sk.lv ? '🔒' : '✨',
    p.level < sk.lv || p.mp < sk.cost));
  const row1 = row(btn('attack', 'Chém', ButtonStyle.Danger, '⚔️'), ...skillBtns, btn('run', 'Chạy', ButtonStyle.Secondary, '🏃'));

  const usable = Object.keys(p.inv).filter((id) => ITEMS[id].use && (!ITEMS[id].cls || ITEMS[id].cls === p.cls));
  const menu = new StringSelectMenuBuilder().setCustomId(`ct:${uid}`);
  if (usable.length) {
    menu.setPlaceholder('🎒 Dùng đan dược / phù chú...').addOptions(usable.slice(0, 25).map((id) => ({
      label: `${ITEMS[id].name} x${p.inv[id]}`, value: id, emoji: ITEMS[id].emoji, description: (ITEMS[id].desc || statText(ITEMS[id])).slice(0, 100) || undefined,
    })));
  } else {
    menu.setPlaceholder('🎒 Không có đan/phù để dùng').setDisabled(true).addOptions({ label: 'Trống', value: 'none' });
  }

  const status = [f.stun > 0 ? '💫' : '', f.burn?.t > 0 ? '🔥' : ''].join('');
  const e = embed(f.boss ? 0xf1c40f : 0xc0392b)
    .setTitle(`${f.boss ? '👑 BOSS • ' : ''}${m.emoji} ${m.name} ${status}`)
    .setDescription(f.log.join('\n'))
    .addFields(
      { name: `Yêu ma • ${MAPS[f.map].emoji} ${MAPS[f.map].name}`, value: `${bar(f.mHp, m.hp)} ${fmt(Math.max(0, f.mHp))}/${fmt(m.hp)} HP`, inline: false },
      { name: `${p.name} • Lượt ${f.turn} ${f.shield?.t > 0 ? '🛡️' : ''}`, value: `❤️ ${bar(p.hp, s.maxHp)} ${fmt(p.hp)}/${fmt(s.maxHp)}\n🔷 ${bar(p.mp, s.maxMp)} ${fmt(p.mp)}/${fmt(s.maxMp)}`, inline: false },
    );
  return { content: '', embeds: [e], components: [row1, row(menu)] };
}

function resultView(uid, p, f) {
  let e;
  if (f.over === 'win') e = embed(0x2ecc71).setTitle(`🏆 Hạ gục ${f.m.emoji} ${f.m.name}!`).setDescription(`${f.log.join('\n')}\n\n${f.rewards}`);
  else if (f.over === 'lose') e = embed(0x7f8c8d).setTitle('💀 Bạn đã bại trận').setDescription(`${f.log.join('\n')}\n\n${f.rewards}`);
  else e = embed(0x3498db).setTitle('🏃 Thoát thân!').setDescription(f.log.join('\n'));
  const comps = f.over === 'lose' ? [] : [row(new ButtonBuilder().setCustomId(`again:${f.map}:${uid}`).setLabel('Săn tiếp').setEmoji('🔁').setStyle(ButtonStyle.Success))];
  return { content: '', embeds: [e], components: comps };
}

function resolveDrop(key, cls) {
  if (!key.includes(':')) return key;
  const [type, idx] = key.split(':');
  return gearId(cls, type, +idx);
}

function winRewards(p, f) {
  const m = f.m, gold = rand(m.gold[0], m.gold[1]);
  const lines = [`💰 +${fmt(gold)} vàng`, `✨ +${fmt(m.exp)} EXP`];
  p.gold += gold; p.kills++;
  if (f.boss) p.bossKills++;
  const drops = [...m.drops, ['linhthach', f.boss ? 1 : 0.12, f.boss ? 3 : 1]];
  for (const [key, chance, max = 1] of drops) {
    if (Math.random() >= chance) continue;
    const id = resolveDrop(key, p.cls);
    if (!id) continue;
    const n = max > 1 ? rand(1, max) : 1;
    addItem(p, id, n);
    lines.push(`🎁 Nhặt được ${label(id)}${n > 1 ? ` x${n}` : ''}`);
  }
  const ups = gainExp(p, m.exp);
  if (ups) lines.push(`🎉 **LÊN CẤP ${p.level}!** HP và linh lực hồi đầy.`);
  if (atBottleneck(p)) lines.push(`⚡ **Bạn đã chạm bình cảnh ${REALMS[p.realm]}!** Hãy dùng \`/dokiep\` để đột phá.`);
  if (p.quest && p.quest.done < p.quest.need) {
    p.quest.done++;
    lines.push(`📋 Nhiệm vụ: ${p.quest.done}/${p.quest.need}${p.quest.done >= p.quest.need ? ' – dùng `/nhiemvu` để nhận thưởng!' : ''}`);
  }
  return lines.join('\n');
}

function act(p, f, action) {
  const s = stats(p), pk = perks(p), m = f.m, cls = CLASSES[p.cls], log = [];
  const critC = 0.15 + pk.crit;
  const heal = (n) => { const b = p.hp; p.hp = Math.min(s.maxHp, p.hp + n); return p.hp - b; };
  const hit = (mult = 1, ignoreDef = false, ls = 0) => {
    const r = calcDmg(s.atk, m.def, { mult, ignoreDef, critC });
    f.mHp -= r.dmg;
    if (pk.lifesteal + ls > 0) heal(Math.round(r.dmg * (pk.lifesteal + ls)));
    return r;
  };
  const thunder = () => {
    if (Math.random() < pk.thunder) {
      const d = Math.round(s.atk * 1.2 + p.level * 3);
      f.mHp -= d;
      log.push(`⚡ Pháp bảo triệu **thiên lôi** giáng xuống, thêm **${d}** sát thương!`);
    }
  };
  const stunMonster = (n) => { f.stun = Math.max(f.stun, f.boss ? Math.min(n, 1) : n); };
  const winNow = () => {
    if (f.mHp > 0) return false;
    f.mHp = 0; f.over = 'win'; f.log = log; f.rewards = winRewards(p, f);
    return true;
  };

  if (action === 'attack') {
    const r = hit();
    log.push(`⚔️ Bạn chém **${m.name}**, gây **${r.dmg}** sát thương${r.crit ? ' 💥 *CHÍ MẠNG!*' : ''}`);
    thunder();
    if (pk.stun && Math.random() < pk.stun) { stunMonster(1); log.push(`💫 ${m.name} bị đánh choáng!`); }
  } else if (/^s\d$/.test(action)) {
    const sk = cls.skills[+action[1]];
    if (!sk) return { error: '❌ Tuyệt kỹ không tồn tại.' };
    if (p.level < sk.lv) return { error: `🔒 Cần cấp ${sk.lv} để dùng ${sk.name}.` };
    if (p.mp < sk.cost) return { error: '🔷 Không đủ linh lực!' };
    p.mp -= sk.cost;
    const hits = sk.hits || 1; let total = 0, crits = 0;
    for (let h = 0; h < hits; h++) { const r = hit(sk.mult, sk.ignoreDef, sk.lifesteal || 0); total += r.dmg; if (r.crit) crits++; }
    log.push(`✨ **${sk.name}**${hits > 1 ? ` (${hits} đòn)` : ''}: **${total}** sát thương${crits ? ` 💥x${crits}` : ''}`);
    thunder();
    if (sk.heal) log.push(`💚 Hồi **${heal(Math.round(s.maxHp * sk.heal))}** HP`);
    if (sk.stun && Math.random() < sk.stun) { stunMonster(1); log.push(`💫 ${m.name} choáng váng!`); }
    if (sk.burn) { f.burn = { d: Math.max(1, Math.round(s.atk * sk.burn.atkPct)), t: sk.burn.t }; log.push(`🔥 ${m.name} bốc cháy!`); }
    if (sk.shield) { f.shield = { ...sk.shield }; log.push(`🛡️ Kim quang hộ thể, giảm ${pct(sk.shield.pct)} sát thương!`); }
  } else if (action === 'run') {
    if (Math.random() < 0.5) { f.over = 'flee'; f.log = ['🏃 Bạn nín thở, lẻn đi trót lọt!']; return {}; }
    log.push('🏃 Chạy không thoát! Yêu ma đuổi sát!');
  } else if (action.startsWith('use:')) {
    const id = action.slice(4), it = ITEMS[id], u = it?.use;
    if (!u || !count(p, id)) return { error: '❌ Bạn không có vật phẩm này!' };
    if (it.cls && it.cls !== p.cls) return { error: '⛔ Vật phẩm này dành cho môn phái khác.' };
    removeItem(p, id);
    log.push(`${it.emoji} Bạn dùng **${it.name}**:`);
    if (u.heal) log.push(`💊 Hồi **${heal(u.heal)}** HP`);
    if (u.healPct) log.push(`💚 Hồi **${heal(Math.round(s.maxHp * u.healPct))}** HP`);
    if (u.mana) { const b = p.mp; p.mp = Math.min(s.maxMp, p.mp + u.mana); log.push(`🔷 Hồi **${p.mp - b}** linh lực`); }
    if (u.stun) { stunMonster(u.stun); log.push(`📜 ${m.name} bị định thân!`); }
    if (u.shield) { f.shield = { ...u.shield }; log.push(`🛡️ Giảm ${pct(u.shield.pct)} sát thương trong ${u.shield.t} lượt`); }
    if (u.burn) { f.burn = { d: Math.max(1, Math.round(s.atk * u.burn.atkPct)), t: u.burn.t }; log.push(`🔥 ${m.name} bốc cháy!`); }
    if (u.dmg || u.dmgAtk) {
      let d = u.dmgAtk ? Math.round(s.atk * u.dmgAtk) : u.dmg + (u.perLevel || 0) * p.level;
      if (u.undeadOnly && !m.undead) d = u.fallback;
      f.mHp -= d;
      log.push(`💥 ${m.name} chịu **${d}** sát thương${u.undeadOnly && m.undead ? ' (bốc khói nghi ngút!)' : ''}`);
    }
    if (u.flee) { f.over = 'flee'; f.log = [`${it.emoji} Bạn dùng **${it.name}**, độn thổ biến mất!`]; return {}; }
  }

  if (winNow()) return {};

  // Thiêu đốt
  if (f.burn?.t > 0) {
    f.mHp -= f.burn.d; f.burn.t--;
    log.push(`🔥 ${m.name} bị thiêu đốt **${f.burn.d}** sát thương`);
    if (winNow()) return {};
  }

  // Lượt yêu ma
  if (f.stun > 0) {
    f.stun--;
    log.push(`💫 ${m.name} đang bị định thân, không thể cử động!`);
  } else if (Math.random() < pk.dodge) {
    log.push(`💨 Bạn né được đòn của ${m.name}!`);
  } else {
    const crit = Math.random() < 0.1;
    let d = (m.atk * (0.85 + Math.random() * 0.3) - s.def * 0.5) * (crit ? 1.5 : 1);
    d *= 1 - pk.reduce;
    if (f.shield?.t > 0) d *= 1 - f.shield.pct;
    d = Math.max(1, Math.round(d));
    p.hp -= d;
    log.push(`${m.emoji} ${m.name} vồ trúng bạn, gây **${d}** sát thương${crit ? ' 💥' : ''}`);
    if (p.hp <= 0) {
      p.deaths++;
      const lost = Math.floor(p.gold * 0.1);
      p.gold -= lost;
      p.hp = Math.max(1, Math.ceil(s.maxHp * 0.3));
      f.over = 'lose'; f.log = [...log, '💀 Bạn ngất đi...'];
      f.rewards = `Cửu Thúc cõng bạn về miếu. Mất **${fmt(lost)}** vàng tiền thuốc, hồi lại 30% HP.`;
      return {};
    }
    if (pk.thorns) {
      const r = Math.round(d * pk.thorns);
      if (r > 0) { f.mHp -= r; log.push(`🪞 Pháp bảo phản lại **${r}** sát thương!`); if (winNow()) return {}; }
    }
  }
  if (f.shield?.t > 0) f.shield.t--;
  if (pk.regen) p.mp = Math.min(s.maxMp, p.mp + pk.regen);
  f.turn++;
  f.log = log;
  return {};
}

/* ═══════════════════════════ CỬA HÀNG ═══════════════════════════ */
function buy(p, id, qty) {
  const it = ITEMS[id];
  if (!it || !it.shop) return '❌ Cửa hàng không bán món này.';
  if (it.cls && it.cls !== p.cls) return '⛔ Món này dành cho môn phái khác.';
  if (it.lv && p.level < it.lv) return `⛔ ${label(id)} yêu cầu cấp **${it.lv}**.`;
  const total = it.price * qty;
  if (p.gold < total) return `💸 Không đủ vàng! Cần **${fmt(total)}**, bạn có **${fmt(p.gold)}**.`;
  p.gold -= total; addItem(p, id, qty); save();
  return `✅ Đã mua **${qty}x ${label(id)}** với giá **${fmt(total)}** vàng. (Còn ${fmt(p.gold)} 🪙)`;
}

function shopView(p, uid, cat = 'weapon') {
  const list = Object.entries(ITEMS).filter(([, it]) => it.shop && it.type === cat && (!it.cls || it.cls === p.cls));
  const lines = list.map(([, it]) => `${it.emoji} **${it.name}** – ${fmt(it.price)}🪙${it.lv > 1 ? ` (Lv${it.lv})` : ''}${statText(it) ? `\n┗ *${statText(it)}*` : ''}`);
  const e = embed(0xe67e22).setTitle(`🏮 Tiệm Cửu Thúc • ${TYPE_INFO[cat][0]} ${TYPE_INFO[cat][1]}`)
    .setDescription(`💰 Bạn có **${fmt(p.gold)}** vàng • Môn phái: ${CLASSES[p.cls].emoji} ${CLASSES[p.cls].name}\n*Đồ bậc cao hơn không bán – hãy săn boss hoặc \`/chetao\`.*\n\n${lines.join('\n') || '*Hết hàng*'}`);
  const catMenu = new StringSelectMenuBuilder().setCustomId(`shopcat:${uid}`).setPlaceholder('📂 Chọn danh mục')
    .addOptions(Object.entries(TYPE_INFO).map(([value, [emoji, name]]) => ({ label: name, value, emoji, default: value === cat })));
  const rows = [row(catMenu)];
  if (list.length) {
    rows.push(row(new StringSelectMenuBuilder().setCustomId(`shop:${uid}`).setPlaceholder('🛒 Chọn món để mua (1 cái)...')
      .addOptions(list.slice(0, 25).map(([value, it]) => ({ label: it.name, value, emoji: it.emoji, description: `${fmt(it.price)} vàng${it.lv > 1 ? ` • Lv${it.lv}` : ''}` })))));
  }
  return { content: '', embeds: [e], components: rows };
}

/* ═══════════════════════════ CƯỜNG HÓA (CÓ SÉT ĐÁNH) ═══════════════════════════ */
const ENH_MAX = 15;
const ENH_RATE = [0, 0.95, 0.9, 0.85, 0.75, 0.65, 0.55, 0.45, 0.38, 0.3, 0.25, 0.2, 0.15, 0.1, 0.07, 0.05];
const enhGold = (id, t) => Math.round(Math.max(100, (ITEMS[id].price || 0) * 0.12) * Math.pow(t, 1.5));
const enhStones = (t) => Math.ceil(t / 2);
const lightningChance = (t) => (t >= 5 ? Math.min(0.6, t * 0.04) : 0);
const lightningDmgPct = (t) => 0.08 + t * 0.015;
const breakChance = (t) => (t >= 10 ? 0.15 + (t - 10) * 0.05 : 0);

function enhView(p, uid, id) {
  const it = ITEMS[id], L = enhOf(p, id);
  if (L >= ENH_MAX) return { content: '', embeds: [embed(0xf1c40f).setTitle(`✨ ${label(id)} đã đạt cấp tối đa +${ENH_MAX}!`)], components: [] };
  const t = L + 1, rate = ENH_RATE[t], gold = enhGold(id, t), st = enhStones(t);
  const risks = [];
  if (t <= 4) risks.push('Thất bại: chỉ mất nguyên liệu.');
  else {
    risks.push('Thất bại: **tụt 1 cấp** (Phù Bảo Hộ chống tụt).');
    risks.push(`⚡ **Sét đánh** khi thất bại: ${pct(lightningChance(t))} – mất ${pct(lightningDmgPct(t))} HP tối đa (không chết).`);
    if (t >= 10) risks.push(`💥 **Vỡ nát** khi thất bại: ${pct(breakChance(t))} (Phù Bảo Hộ cứu được).`);
  }
  const e = embed(0x9b59b6).setTitle(`🔨 Cường hóa ${dname(p, id)}`)
    .setDescription(`**+${L} → +${t}**\n${statText(it, L)}\n⬇️\n${statText(it, t)}${it.perk ? `\n*Hiệu ứng pháp bảo cũng tăng 5% mỗi cấp.*` : ''}`)
    .addFields(
      { name: '🎯 Tỉ lệ thành công', value: `**${pct(rate)}** (Thiên Vận Phù: **${pct(Math.min(0.98, rate + 0.1))}**)`, inline: false },
      { name: '💸 Chi phí', value: `${fmt(gold)} vàng + ${st}x 💠 Linh Thạch`, inline: true },
      { name: '🎒 Bạn có', value: `${fmt(p.gold)}🪙 • ${count(p, 'linhthach')}💠 • ${count(p, 'thienvanphu')}🍀 • ${count(p, 'phubaoho')}🧿`, inline: true },
      { name: '⚠️ Rủi ro', value: risks.join('\n'), inline: false },
    );
  const b = (mode, text, emoji, style, disabled = false) => new ButtonBuilder().setCustomId(`enh:${mode}:${id}:${uid}`).setLabel(text).setEmoji(emoji).setStyle(style).setDisabled(disabled);
  const noV = !count(p, 'thienvanphu'), noB = !count(p, 'phubaoho');
  return { content: '', embeds: [e], components: [row(
    b(0, 'Cường hóa', '🔨', ButtonStyle.Primary),
    b(1, '+Thiên Vận', '🍀', ButtonStyle.Success, noV),
    b(2, '+Bảo Hộ', '🧿', ButtonStyle.Secondary, noB),
    b(3, '+Cả hai', '✨', ButtonStyle.Danger, noV || noB),
  )] };
}

// mode: bit1 = Thiên Vận Phù, bit2 = Phù Bảo Hộ
function enhanceAttempt(p, id, mode) {
  const L = enhOf(p, id), t = L + 1, useLuck = mode & 1, useShield = mode & 2;
  removeItem(p, 'linhthach', enhStones(t));
  p.gold -= enhGold(id, t);
  if (useLuck) removeItem(p, 'thienvanphu');
  const rate = Math.min(0.98, ENH_RATE[t] + (useLuck ? 0.1 : 0));
  const lines = [];
  if (Math.random() < rate) {
    p.enh[id] = t;
    lines.push(`🎉 **THÀNH CÔNG!** ${label(id)} lên **+${t}**!`);
    if (t >= 8) lines.push('🌩️ Lôi quang bao phủ, pháp khí rung lên ánh sáng chói lòa!');
    return { ok: true, lines, exists: true };
  }
  lines.push(`💔 **THẤT BẠI!** (tỉ lệ thành công ${pct(rate)})`);
  const s = stats(p);
  if (Math.random() < lightningChance(t)) {
    const d = Math.round(s.maxHp * lightningDmgPct(t));
    p.hp = Math.max(1, p.hp - d);
    lines.push(`⚡⚡ **THIÊN LÔI GIÁNG XUỐNG!** Bạn bị sét đánh mất **${fmt(d)}** HP! (còn ${fmt(p.hp)})`);
  }
  let exists = true;
  if (t >= 10 && Math.random() < breakChance(t)) {
    if (useShield) { removeItem(p, 'phubaoho'); lines.push('🧿 **Phù Bảo Hộ** vỡ tan, cứu pháp khí khỏi nát!'); }
    else {
      if (count(p, id) > 0) removeItem(p, id);
      else for (const [slot, eid] of Object.entries(p.equip)) if (eid === id) p.equip[slot] = null;
      if (!owns(p, id)) delete p.enh[id];
      exists = owns(p, id);
      lines.push(`💥 **VỠ NÁT!** ${label(id)} tan thành tro bụi...`);
      const s2 = stats(p); p.hp = Math.min(p.hp, s2.maxHp); p.mp = Math.min(p.mp, s2.maxMp);
      return { ok: false, lines, exists };
    }
  } else if (t >= 5) {
    if (useShield) { removeItem(p, 'phubaoho'); lines.push('🧿 **Phù Bảo Hộ** sáng lên, giữ nguyên cấp!'); }
    else { p.enh[id] = Math.max(0, L - 1); if (!p.enh[id]) delete p.enh[id]; lines.push(`📉 Pháp khí tụt xuống **+${L - 1}**.`); }
  } else {
    lines.push('Pháp khí vẫn giữ nguyên cấp.');
  }
  return { ok: false, lines, exists };
}

async function doEnhance(i, uid, p, id, mode) {
  if (fights.has(uid)) return i.reply({ content: '⚔️ Đang trong trận chiến, không thể cường hóa!', flags: EPH });
  if (!canEnhance(id) || !owns(p, id)) return i.reply({ content: '❌ Bạn không sở hữu món này.', flags: EPH });
  const L = enhOf(p, id), t = L + 1;
  if (L >= ENH_MAX) return i.reply({ content: '✨ Đã đạt cấp tối đa.', flags: EPH });
  if (p.gold < enhGold(id, t)) return i.reply({ content: `💸 Cần **${fmt(enhGold(id, t))}** vàng.`, flags: EPH });
  if (count(p, 'linhthach') < enhStones(t)) return i.reply({ content: `💠 Cần **${enhStones(t)}** Linh Thạch (có ${count(p, 'linhthach')}).`, flags: EPH });
  if ((mode & 1) && !count(p, 'thienvanphu')) return i.reply({ content: '🍀 Bạn hết Thiên Vận Phù.', flags: EPH });
  if ((mode & 2) && !count(p, 'phubaoho')) return i.reply({ content: '🧿 Bạn hết Phù Bảo Hộ.', flags: EPH });

  await i.update({ content: '', embeds: [embed(0x34495e).setTitle(`🔨 Đang cường hóa ${label(id)} lên +${t}...`)
    .setDescription('☁️ Mây đen kéo đến, linh khí cuộn trào...\n🔥 Lò luyện bốc cháy dữ dội...')], components: [] });
  await sleep(1800);
  const r = enhanceAttempt(p, id, mode);
  save();
  const comps = [];
  if (r.exists && enhOf(p, id) < ENH_MAX) comps.push(row(new ButtonBuilder().setCustomId(`enhv:${id}:${uid}`).setLabel('Cường hóa tiếp').setEmoji('🔨').setStyle(ButtonStyle.Primary)));
  return i.editReply({ embeds: [embed(r.ok ? 0x2ecc71 : 0xe74c3c).setTitle(`🔨 Kết quả cường hóa ${label(id)}`).setDescription(r.lines.join('\n'))], components: comps });
}

/* ═══════════════════════════ ĐỘ THIÊN KIẾP ═══════════════════════════ */
const kieps = new Set();
const KIEP_CD = 30 * 60 * 1000;
const kiepBolts = (p) => 5 + p.realm * 2;
const kiepMit = (s) => Math.min(0.5, s.def / (s.def + 300));
const KIEP_HEAL = 0.1; // Lôi Kiếp Đan hồi 10% HP tối đa sau mỗi tia
// Mỗi tia: 6–26% HP tối đa, 20% là tia "Thiên Phạt" mạnh gấp 1.6 lần
function boltDmg(s, mit, mul) {
  const crit = Math.random() < 0.2;
  return { d: Math.max(1, Math.round(s.maxHp * (0.06 + Math.random() * 0.2) * (crit ? 1.6 : 1) * (1 - mit) * mul)), crit };
}

function simKiep(p, mode, n = 2000) {
  const s = stats(p), bolts = kiepBolts(p), mit = kiepMit(s), mul = mode >= 1 ? 0.7 : 1;
  let ok = 0;
  for (let k = 0; k < n; k++) {
    let hp = p.hp, dead = false;
    for (let b = 0; b < bolts; b++) {
      hp -= boltDmg(s, mit, mul).d;
      if (hp <= 0) { dead = true; break; }
      if (mode >= 2 && b < bolts - 1) hp = Math.min(s.maxHp, hp + s.maxHp * KIEP_HEAL);
    }
    if (!dead) ok++;
  }
  return ok / n;
}

function kiepView(p, uid) {
  const e = embed(0x8e44ad).setTitle('⚡ Độ Thiên Kiếp');
  if (p.realm >= 5) return { content: '', embeds: [e.setDescription('Bạn đã đạt cảnh giới tối cao – **Phản Hư**. Không còn thiên kiếp nào cản đường!')], components: [] };
  const s = stats(p), ready = atBottleneck(p), cd = KIEP_CD - (Date.now() - p.lastKiep);
  const sims = [0, 1, 2].map((m) => pct(simKiep(p, m)));
  e.setDescription([
    `Cảnh giới: **${REALMS[p.realm]}** ➜ **${REALMS[p.realm + 1]}**`,
    `Điều kiện: cấp **${capOf(p)}** + đầy EXP ${ready ? '✅' : `❌ (hiện cấp ${p.level}, EXP ${fmt(p.exp)}/${fmt(expNeed(p.level))})`}`,
    `Hồi chiêu sau thất bại: 30 phút${cd > 0 ? ` • ⏳ còn ${Math.ceil(cd / 60000)} phút` : ''}`,
    '',
    `☁️ **${kiepBolts(p)} tia thiên lôi** – mỗi tia đánh **6–26% HP tối đa** (20% là Thiên Phạt ×1.6), giảm theo thủ (hiện giảm ${pct(kiepMit(s))}).`,
    `Thất bại: **HP còn 15%**, mất 40% EXP, phải chờ hồi chiêu.`,
    `Thành công: lên cảnh giới mới, **+10% toàn bộ chỉ số gốc**, nhận thưởng lớn!`,
    '',
    `🎯 **Tỉ lệ vượt kiếp ước tính** (theo HP hiện tại ${fmt(p.hp)}/${fmt(s.maxHp)}):`,
    `• Tay không: **${sims[0]}**`,
    `• Phù Hộ Kiếp ☂️ (−30% sét): **${sims[1]}**`,
    `• Phù Hộ Kiếp + Lôi Kiếp Đan 🍯 (hồi 10% HP/tia): **${sims[2]}**`,
    '',
    `🎒 Bạn có: ${count(p, 'phuhokiep')}x ☂️ Phù Hộ Kiếp • ${count(p, 'loikiepdan')}x 🍯 Lôi Kiếp Đan`,
  ].join('\n'));
  const off = !ready || cd > 0;
  const b = (mode, text, emoji, style, disabled) => new ButtonBuilder().setCustomId(`kiep:${mode}:${uid}`).setLabel(text).setEmoji(emoji).setStyle(style).setDisabled(off || disabled);
  return { content: '', embeds: [e], components: [row(
    b(0, 'Độ kiếp', '⚡', ButtonStyle.Danger, false),
    b(1, '+Phù Hộ Kiếp', '☂️', ButtonStyle.Primary, !count(p, 'phuhokiep')),
    b(2, '+Phù & Đan', '🍯', ButtonStyle.Success, !count(p, 'phuhokiep') || !count(p, 'loikiepdan')),
  )] };
}

async function runKiep(i, uid, p, mode) {
  if (kieps.has(uid)) return i.reply({ content: '⚡ Thiên kiếp đang giáng xuống rồi!', flags: EPH });
  if (fights.has(uid)) return i.reply({ content: '⚔️ Hãy kết thúc trận chiến trước!', flags: EPH });
  if (!atBottleneck(p)) return i.reply({ content: '❌ Bạn chưa chạm bình cảnh.', flags: EPH });
  if (Date.now() - p.lastKiep < KIEP_CD) return i.reply({ content: '⏳ Đạo tâm còn bất ổn, hãy chờ hồi chiêu.', flags: EPH });
  if (mode >= 1 && !count(p, 'phuhokiep')) return i.reply({ content: '☂️ Bạn hết Phù Hộ Kiếp.', flags: EPH });
  if (mode >= 2 && !count(p, 'loikiepdan')) return i.reply({ content: '🍯 Bạn hết Lôi Kiếp Đan.', flags: EPH });

  kieps.add(uid);
  try {
    if (mode >= 1) removeItem(p, 'phuhokiep');
    if (mode >= 2) removeItem(p, 'loikiepdan');
    const s = stats(p), bolts = kiepBolts(p), mit = kiepMit(s), mul = mode >= 1 ? 0.7 : 1;
    let hp = p.hp, dead = false;
    const lines = [];
    const show = (title, color) => embed(color).setTitle(title)
      .setDescription(`${lines.slice(-7).join('\n') || '☁️ Mây đen kéo đến che kín bầu trời...'}\n\n❤️ ${bar(hp, s.maxHp)} ${fmt(Math.max(0, hp))}/${fmt(s.maxHp)}`);

    await i.update({ content: '', embeds: [show(`⚡ ${p.name} bắt đầu độ kiếp!`, 0x2c3e50)], components: [] });
    await sleep(1800);
    for (let b = 1; b <= bolts; b++) {
      const { d, crit } = boltDmg(s, mit, mul);
      hp -= d;
      lines.push(`${crit ? '🌩️ **THIÊN PHẠT**' : '⚡ Lôi kiếp'} **${b}/${bolts}** giáng xuống! **-${fmt(d)}** HP`);
      if (hp <= 0) { dead = true; hp = 0; lines.push('💀 Thân thể không chịu nổi sét trời...'); }
      await i.editReply({ embeds: [show(`⚡ Thiên kiếp ${b}/${bolts}`, dead ? 0x7f8c8d : 0x9b59b6)] });
      if (dead) break;
      await sleep(1400);
      if (mode >= 2 && b < bolts) {
        const h = Math.min(Math.round(s.maxHp * KIEP_HEAL), s.maxHp - hp);
        hp += h; lines.push(`🍯 Lôi Kiếp Đan phát huy, hồi **${fmt(h)}** HP`);
      }
    }
    if (!dead) {
      p.realm++; p.kiepDone++;
      const gold = 1000 * p.realm * p.realm, stones = 5 * p.realm;
      p.gold += gold; addItem(p, 'linhthach', stones);
      const ns = stats(p); p.hp = ns.maxHp; p.mp = ns.maxMp;
      const ups = gainExp(p, 0);
      lines.push(`🌈 **VƯỢT KIẾP THÀNH CÔNG!**`);
      const e = embed(0xf1c40f).setTitle(`🌟 Đột phá cảnh giới ${REALMS[p.realm]}!`)
        .setDescription(`${lines.slice(-4).join('\n')}\n\n✨ Toàn bộ chỉ số gốc **+10%**\n💰 +${fmt(gold)} vàng • 💠 +${stones} Linh Thạch\n❤️ HP & linh lực hồi đầy${ups ? `\n🎉 Lên cấp ${p.level}!` : ''}\nCấp tối đa mới: **${capOf(p)}**`);
      save();
      return i.editReply({ embeds: [e], components: [] });
    }
    p.lastKiep = Date.now();
    p.exp = Math.floor(p.exp * 0.6);
    p.hp = Math.max(1, Math.ceil(s.maxHp * 0.15));
    save();
    const e = embed(0x7f8c8d).setTitle('💀 Độ kiếp thất bại')
      .setDescription(`${lines.slice(-5).join('\n')}\n\nCửu Thúc kịp thời cứu bạn khỏi hố sét. HP còn 15%, mất 40% EXP.\nHãy chuẩn bị thêm thủ, Phù Hộ Kiếp rồi thử lại sau 30 phút.`);
    return i.editReply({ embeds: [e], components: [] });
  } finally { kieps.delete(uid); }
}

/* ═══════════════════════════ ĐỊNH NGHĨA LỆNH ═══════════════════════════ */
const itemOpt = (o, desc = 'Chọn vật phẩm', req = true) => o.setName('vatpham').setDescription(desc).setRequired(req).setAutocomplete(true);
const qtyOpt = (o) => o.setName('soluong').setDescription('Số lượng (mặc định 1)').setMinValue(1).setMaxValue(99);

const commands = [
  new SlashCommandBuilder().setName('batdau').setDescription('☯️ Nhập môn, tạo nhân vật đạo sĩ')
    .addStringOption((o) => o.setName('mon_phai').setDescription('Chọn môn phái').setRequired(true)
      .addChoices(...Object.entries(CLASSES).map(([value, c]) => ({ name: `${c.emoji} ${c.name}`, value })))),
  new SlashCommandBuilder().setName('nhanvat').setDescription('👤 Xem thông tin nhân vật')
    .addUserOption((o) => o.setName('nguoi').setDescription('Xem người khác (tuỳ chọn)')),
  new SlashCommandBuilder().setName('kynang').setDescription('✨ Xem tuyệt kỹ của môn phái'),
  new SlashCommandBuilder().setName('cuahang').setDescription('🏮 Ghé tiệm của Cửu Thúc'),
  new SlashCommandBuilder().setName('mua').setDescription('🛒 Mua vật phẩm')
    .addStringOption((o) => itemOpt(o, 'Món muốn mua')).addIntegerOption(qtyOpt),
  new SlashCommandBuilder().setName('ban').setDescription('💰 Bán vật phẩm')
    .addStringOption((o) => itemOpt(o, 'Món muốn bán')).addIntegerOption(qtyOpt),
  new SlashCommandBuilder().setName('tuido').setDescription('🎒 Xem túi đồ'),
  new SlashCommandBuilder().setName('dung').setDescription('💊 Dùng đan dược')
    .addStringOption((o) => itemOpt(o, 'Đan dược muốn dùng')),
  new SlashCommandBuilder().setName('trangbi').setDescription('🥋 Mặc / cầm trang bị, pháp bảo, bùa')
    .addStringOption((o) => itemOpt(o, 'Trang bị muốn dùng')),
  new SlashCommandBuilder().setName('thao').setDescription('🧤 Tháo trang bị')
    .addStringOption((o) => o.setName('vitri').setDescription('Vị trí').setRequired(true)
      .addChoices(...Object.entries(SLOT_NAME).map(([value, name]) => ({ name, value })))),
  new SlashCommandBuilder().setName('cuonghoa').setDescription('🔨 Cường hóa trang bị (có tỉ lệ thất bại & sét đánh!)')
    .addStringOption((o) => itemOpt(o, 'Món muốn cường hóa')),
  new SlashCommandBuilder().setName('dokiep').setDescription('⚡ Độ thiên kiếp để đột phá cảnh giới'),
  new SlashCommandBuilder().setName('chetao').setDescription('🔥 Lò luyện: chế phù, đan, bảo khí')
    .addStringOption((o) => itemOpt(o, 'Món muốn chế (bỏ trống để xem công thức)', false)).addIntegerOption(qtyOpt),
  new SlashCommandBuilder().setName('sanquy').setDescription('👻 Đi săn yêu ma, trừ tà')
    .addStringOption((o) => o.setName('khu_vuc').setDescription('Chọn nơi săn').setRequired(true)
      .addChoices(...Object.entries(MAPS).map(([value, m]) => ({ name: `${m.emoji} ${m.name} (Lv ${m.lv}+)`, value })))),
  new SlashCommandBuilder().setName('diemdanh').setDescription('🗓️ Điểm danh nhận quà hằng ngày'),
  new SlashCommandBuilder().setName('toathien').setDescription('🧘 Tọa thiền hồi phục (hồi chiêu 10 phút)'),
  new SlashCommandBuilder().setName('nhiemvu').setDescription('📋 Nhận / nộp nhiệm vụ của Cửu Thúc'),
  new SlashCommandBuilder().setName('bxh').setDescription('🏆 Bảng xếp hạng đạo sĩ'),
  new SlashCommandBuilder().setName('trogiup').setDescription('📖 Hướng dẫn chơi'),
].map((c) => c.toJSON());

/* ═══════════════════════════ XỬ LÝ LỆNH ═══════════════════════════ */
function getPlayer(i) {
  const p = db.players[i.user.id];
  if (!p) { i.reply({ content: '☯️ Bạn chưa có nhân vật! Hãy dùng `/batdau` để nhập môn.', flags: EPH }); return null; }
  p.name = i.user.displayName;
  return p;
}
const inFight = (i) => fights.has(i.user.id);
const busy = (i) => i.reply({ content: '⚔️ Bạn đang trong trận chiến! Hãy kết thúc trận đấu trước (dùng `/sanquy` để quay lại).', flags: EPH });

function profileEmbed(p, user) {
  const s = stats(p), c = CLASSES[p.cls], pk = perks(p), need = expNeed(p.level);
  const eq = Object.entries(SLOT_NAME).map(([slot, nm]) => `${nm}: ${p.equip[slot] ? dname(p, p.equip[slot]) : '*trống*'}`).join('\n');
  const pkLines = Object.entries(pk).filter(([, v]) => v > 0).map(([k, v]) => PERK_TEXT[k](v)).join(' • ');
  const cap = capOf(p);
  const e = embed(0xf1c40f)
    .setTitle(`${c.emoji} ${p.name} • ${c.name}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: '🌌 Cảnh giới', value: `**${REALMS[p.realm]}** • Cấp **${p.level}/${cap}**\n${bar(p.exp, need)} ${fmt(p.exp)}/${fmt(need)}${atBottleneck(p) ? '\n⚡ **Đã chạm bình cảnh – dùng `/dokiep`!**' : ''}`, inline: false },
      { name: '❤️ HP', value: `${fmt(p.hp)}/${fmt(s.maxHp)}`, inline: true },
      { name: '🔷 Linh lực', value: `${fmt(p.mp)}/${fmt(s.maxMp)}`, inline: true },
      { name: '💰 Vàng', value: fmt(p.gold), inline: true },
      { name: '⚔️ Công', value: `${s.atk}`, inline: true },
      { name: '🛡️ Thủ', value: `${s.def}`, inline: true },
      { name: '🌩️ Độ kiếp', value: `${p.kiepDone} lần`, inline: true },
      { name: '🎽 Trang bị', value: eq, inline: false },
    );
  if (pkLines) e.addFields({ name: '🔱 Hiệu ứng pháp bảo', value: pkLines, inline: false });
  e.addFields({ name: '📊 Chiến tích', value: `Yêu ma đã diệt: **${fmt(p.kills)}** • Boss: **${p.bossKills}** • Bại trận: **${p.deaths}**`, inline: false });
  return e;
}

const handlers = {
  async batdau(i) {
    if (db.players[i.user.id]) return i.reply({ content: '☯️ Bạn đã có nhân vật rồi! Dùng `/nhanvat` để xem.', flags: EPH });
    const cls = i.options.getString('mon_phai');
    db.players[i.user.id] = newPlayer(cls, i.user.displayName); save();
    const c = CLASSES[cls];
    return i.reply({ embeds: [embed(0xf1c40f).setTitle(`${c.emoji} Chào mừng ${c.name}!`)
      .setDescription(`*"Ta là Cửu Thúc, đạo sĩ Mao Sơn. Từ nay ngươi là đệ tử của ta."*\n\n${c.desc}\n\n🎁 Quà nhập môn: **200 vàng**, 3 Linh Đan, 2 Phù Trấn Thi, 2 Gạo Nếp.\n\nGõ \`/trogiup\` để xem hướng dẫn, \`/cuahang\` để sắm đồ, \`/sanquy\` để đi trừ tà!`)] });
  },

  async nhanvat(i) {
    const user = i.options.getUser('nguoi') || i.user;
    const p = db.players[user.id];
    if (!p) return i.reply({ content: user.id === i.user.id ? '☯️ Bạn chưa có nhân vật! Dùng `/batdau`.' : 'Người này chưa nhập môn.', flags: EPH });
    return i.reply({ embeds: [profileEmbed(p, user)] });
  },

  async kynang(i) {
    const p = getPlayer(i); if (!p) return;
    const c = CLASSES[p.cls];
    const lines = c.skills.map((sk, n) => {
      const fx = [`×${sk.mult}${sk.hits ? ` x${sk.hits} đòn` : ''}`];
      if (sk.ignoreDef) fx.push('xuyên giáp');
      if (sk.heal) fx.push(`hồi ${pct(sk.heal)} HP`);
      if (sk.stun) fx.push(`${pct(sk.stun)} choáng`);
      if (sk.burn) fx.push(`thiêu đốt ${sk.burn.t} lượt`);
      if (sk.shield) fx.push(`giảm ${pct(sk.shield.pct)} sát thương ${sk.shield.t} lượt`);
      if (sk.lifesteal) fx.push(`hút ${pct(sk.lifesteal)} máu`);
      return `${p.level >= sk.lv ? '✅' : '🔒'} **${n + 1}. ${sk.name}** (Lv${sk.lv}, ${sk.cost} LL)\n┗ ${fx.join(', ')}`;
    });
    return i.reply({ embeds: [embed(0x3498db).setTitle(`✨ Tuyệt kỹ ${c.emoji} ${c.name}`).setDescription(lines.join('\n'))], flags: EPH });
  },

  async cuahang(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply(shopView(p, i.user.id, 'weapon'));
  },

  async mua(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ content: buy(p, i.options.getString('vatpham'), i.options.getInteger('soluong') || 1), flags: EPH });
  },

  async ban(i) {
    const p = getPlayer(i); if (!p) return;
    const id = i.options.getString('vatpham'), qty = i.options.getInteger('soluong') || 1;
    if (!ITEMS[id] || count(p, id) < qty) return i.reply({ content: '❌ Bạn không có đủ số lượng đó.', flags: EPH });
    const base = ITEMS[id].sell ?? Math.floor((ITEMS[id].price || 0) * 0.5);
    const each = Math.floor(base * (1 + 0.3 * enhOf(p, id)));
    removeItem(p, id, qty); p.gold += each * qty;
    if (!owns(p, id)) delete p.enh[id];
    save();
    return i.reply({ content: `💰 Đã bán **${qty}x ${label(id)}** được **${fmt(each * qty)}** vàng.`, flags: EPH });
  },

  async tuido(i) {
    const p = getPlayer(i); if (!p) return;
    const e = embed(0x9b59b6).setTitle(`🎒 Túi đồ của ${p.name}`).setDescription(`💰 ${fmt(p.gold)} vàng`);
    let any = false;
    for (const [type, [emo, nm]] of Object.entries(TYPE_INFO)) {
      const list = Object.entries(p.inv).filter(([id]) => ITEMS[id].type === type);
      if (!list.length) continue;
      any = true;
      e.addFields({ name: `${emo} ${nm}`, value: list.map(([id, n]) => `${dname(p, id)} x${n}${statText(ITEMS[id], enhOf(p, id)) ? ` – *${statText(ITEMS[id], enhOf(p, id))}*` : ''}`).join('\n').slice(0, 1020) });
    }
    if (!any) e.setDescription(`💰 ${fmt(p.gold)} vàng\n\n*Túi trống trơn...*`);
    return i.reply({ embeds: [e], flags: EPH });
  },

  async dung(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham'), it = ITEMS[id];
    if (!it || it.type !== 'potion' || !count(p, id)) return i.reply({ content: '❌ Bạn không có đan dược đó.', flags: EPH });
    const s = stats(p);
    removeItem(p, id);
    if (it.use.heal) p.hp = Math.min(s.maxHp, p.hp + it.use.heal);
    if (it.use.mana) p.mp = Math.min(s.maxMp, p.mp + it.use.mana);
    save();
    return i.reply({ content: `${it.emoji} Dùng **${it.name}** → ❤️ ${fmt(p.hp)}/${fmt(s.maxHp)} • 🔷 ${fmt(p.mp)}/${fmt(s.maxMp)}`, flags: EPH });
  },

  async trangbi(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham'), it = ITEMS[id];
    if (!it || !SLOT_OF[it.type] || !count(p, id)) return i.reply({ content: '❌ Món này không phải trang bị hoặc bạn không có.', flags: EPH });
    if (it.cls && it.cls !== p.cls) return i.reply({ content: `⛔ ${label(id)} chỉ dành cho **${CLASSES[it.cls].name}**.`, flags: EPH });
    if (it.lv && p.level < it.lv) return i.reply({ content: `⛔ Cần cấp **${it.lv}** để dùng ${label(id)}.`, flags: EPH });
    const slot = SLOT_OF[it.type];
    removeItem(p, id);
    if (p.equip[slot]) addItem(p, p.equip[slot]);
    p.equip[slot] = id;
    const s = stats(p); p.hp = Math.min(p.hp, s.maxHp); p.mp = Math.min(p.mp, s.maxMp);
    save();
    return i.reply({ content: `✅ Đã trang bị ${dname(p, id)} (${statText(it, enhOf(p, id))})`, flags: EPH });
  },

  async thao(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const slot = i.options.getString('vitri');
    if (!p.equip[slot]) return i.reply({ content: 'Vị trí này đang trống.', flags: EPH });
    const id = p.equip[slot];
    addItem(p, id); p.equip[slot] = null;
    const s = stats(p); p.hp = Math.min(p.hp, s.maxHp); p.mp = Math.min(p.mp, s.maxMp);
    save();
    return i.reply({ content: `🧤 Đã tháo ${label(id)} cất vào túi.`, flags: EPH });
  },

  async cuonghoa(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham');
    if (!canEnhance(id) || !owns(p, id)) return i.reply({ content: '❌ Bạn không sở hữu món trang bị này.', flags: EPH });
    return i.reply(enhView(p, i.user.id, id));
  },

  async dokiep(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    return i.reply(kiepView(p, i.user.id));
  },

  async chetao(i) {
    const p = getPlayer(i); if (!p) return;
    const id = i.options.getString('vatpham');
    const mine = Object.entries(RECIPES).filter(([rid]) => !ITEMS[rid].cls || ITEMS[rid].cls === p.cls);
    if (!id) {
      const text = mine.map(([rid, r]) =>
        `${label(rid)} x${r.out}${r.gold ? ` (${fmt(r.gold)}🪙)` : ''}\n┗ ${Object.entries(r.need).map(([n, q]) => `${ITEMS[n].emoji}${ITEMS[n].name} x${q}`).join(' + ')}`).join('\n\n');
      return i.reply({ embeds: [embed(0xd35400).setTitle('🔥 Lò luyện của Cửu Thúc').setDescription(text.slice(0, 4000))], flags: EPH });
    }
    const r = RECIPES[id];
    if (!r || (ITEMS[id].cls && ITEMS[id].cls !== p.cls)) return i.reply({ content: '❌ Không có công thức phù hợp. Dùng `/chetao` để xem danh sách.', flags: EPH });
    const times = i.options.getInteger('soluong') || 1;
    for (const [n, q] of Object.entries(r.need)) {
      if (count(p, n) < q * times) return i.reply({ content: `❌ Thiếu nguyên liệu: cần **${q * times}x ${label(n)}**, bạn có ${count(p, n)}.`, flags: EPH });
    }
    if (p.gold < r.gold * times) return i.reply({ content: `💸 Cần **${fmt(r.gold * times)}** vàng phí luyện.`, flags: EPH });
    for (const [n, q] of Object.entries(r.need)) removeItem(p, n, q * times);
    p.gold -= r.gold * times; addItem(p, id, r.out * times); save();
    return i.reply({ content: `🔥 Lò luyện bốc khói... Bạn chế được **${r.out * times}x ${label(id)}**!`, flags: EPH });
  },

  async sanquy(i) {
    const p = getPlayer(i); if (!p) return;
    const uid = i.user.id;
    let f = fights.get(uid);
    if (!f) {
      const r = beginFight(uid, p, i.options.getString('khu_vuc'));
      if (r.error) return i.reply({ content: r.error, flags: EPH });
      f = r.fight;
    }
    return i.reply(fightView(uid, p, f));
  },

  async diemdanh(i) {
    const p = getPlayer(i); if (!p) return;
    const now = Date.now(), gap = now - p.lastDaily;
    if (gap < 20 * 3600 * 1000) {
      const h = Math.ceil((20 * 3600 * 1000 - gap) / 3600000);
      return i.reply({ content: `⏳ Bạn đã điểm danh rồi. Quay lại sau khoảng **${h} giờ**.`, flags: EPH });
    }
    p.streak = gap < 48 * 3600 * 1000 ? p.streak + 1 : 1;
    p.lastDaily = now;
    const gold = 100 + Math.min(p.streak, 7) * 30 + p.level * 5;
    const exp = 50 + p.level * 5;
    p.gold += gold; addItem(p, 'linhdan', 2); addItem(p, 'linhthach', 1);
    const lines = [`💰 +${fmt(gold)} vàng`, `✨ +${exp} EXP`, '💊 +2 Linh Đan', '💠 +1 Linh Thạch'];
    if (p.streak % 7 === 0) { addItem(p, 'phuloi', 2); addItem(p, 'dailinhdan', 1); addItem(p, 'thienvanphu', 1); lines.push('🎁 **Thưởng chuỗi 7 ngày:** 2 Phù Lôi + 1 Đại Linh Đan + 1 Thiên Vận Phù!'); }
    if (gainExp(p, exp)) lines.push(`🎉 **LÊN CẤP ${p.level}!**`);
    if (atBottleneck(p)) lines.push('⚡ Bạn đã chạm bình cảnh – dùng `/dokiep`!');
    save();
    return i.reply({ embeds: [embed(0x1abc9c).setTitle(`🗓️ Điểm danh ngày ${p.streak}`).setDescription(lines.join('\n'))] });
  },

  async toathien(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const wait = 10 * 60 * 1000 - (Date.now() - p.lastMeditate);
    if (wait > 0) return i.reply({ content: `🧘 Tâm chưa tĩnh. Hãy đợi **${Math.ceil(wait / 60000)} phút** nữa.`, flags: EPH });
    const s = stats(p);
    p.hp = Math.min(s.maxHp, p.hp + Math.round(s.maxHp * 0.6));
    p.mp = Math.min(s.maxMp, p.mp + Math.round(s.maxMp * 0.6));
    p.lastMeditate = Date.now();
    const exp = 10 + p.level * 3;
    const up = gainExp(p, exp);
    save();
    return i.reply({ content: `🧘 Bạn nhập định, khí huyết lưu chuyển...\n❤️ ${fmt(p.hp)}/${fmt(s.maxHp)} • 🔷 ${fmt(p.mp)}/${fmt(s.maxMp)} • ✨ +${exp} EXP${up ? `\n🎉 **LÊN CẤP ${p.level}!**` : ''}` });
  },

  async nhiemvu(i) {
    const p = getPlayer(i); if (!p) return;
    if (!p.quest) {
      const need = rand(3, 8);
      p.quest = { need, done: 0, gold: need * 40 + p.level * 10, exp: need * 30 + p.level * 10 };
      save();
      return i.reply({ embeds: [embed(0x3498db).setTitle('📋 Nhiệm vụ mới từ Cửu Thúc')
        .setDescription(`*"Gần đây yêu khí nổi lên khắp nơi. Hãy diệt giúp ta **${need}** yêu ma!"*\n\n🎁 Thưởng: **${fmt(p.quest.gold)}** vàng + **${fmt(p.quest.exp)}** EXP`)] });
    }
    const q = p.quest;
    if (q.done < q.need) return i.reply({ content: `📋 Tiến độ: **${q.done}/${q.need}** yêu ma ${bar(q.done, q.need)}\n🎁 Thưởng: ${fmt(q.gold)} vàng + ${fmt(q.exp)} EXP`, flags: EPH });
    p.gold += q.gold;
    const up = gainExp(p, q.exp);
    p.quest = null; save();
    return i.reply({ embeds: [embed(0x2ecc71).setTitle('✅ Hoàn thành nhiệm vụ!')
      .setDescription(`💰 +${fmt(q.gold)} vàng\n✨ +${fmt(q.exp)} EXP${up ? `\n🎉 **LÊN CẤP ${p.level}!**` : ''}\n\nDùng \`/nhiemvu\` để nhận nhiệm vụ mới.`)] });
  },

  async bxh(i) {
    const top = Object.values(db.players).sort((a, b) => b.realm - a.realm || b.level - a.level || b.exp - a.exp).slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const text = top.map((p, n) => `${medals[n] || `**${n + 1}.**`} ${CLASSES[p.cls].emoji} **${p.name}** – ${REALMS[p.realm]} Cấp ${p.level} • ${fmt(p.kills)} yêu ma`).join('\n') || '*Chưa có ai*';
    return i.reply({ embeds: [embed(0xf1c40f).setTitle('🏆 Bảng xếp hạng đạo sĩ').setDescription(text)] });
  },

  async trogiup(i) {
    const mapList = Object.values(MAPS).map((m) => `${m.emoji} ${m.name} – Lv ${m.lv}+`).join('\n');
    return i.reply({ embeds: [embed(0x95a5a6).setTitle('📖 Hướng dẫn Đạo Sĩ Bot v3')
      .setDescription([
        '**Bắt đầu:** `/batdau` chọn môn phái (Mao Sơn, Phù Chú Sư, Võ Đạo Sĩ). Xem tuyệt kỹ: `/kynang`.',
        '**Săn yêu ma:** `/sanquy` – đánh theo lượt bằng nút bấm; menu bên dưới để dùng đan/phù. 10% gặp BOSS!',
        '**Sắm đồ:** `/cuahang` (menu danh mục), `/mua`, `/ban`, `/tuido`, `/trangbi`, `/thao`, `/dung`.',
        '**Mỗi phái có đồ riêng:** vũ khí, giáp, 🔱 pháp bảo, 🧧 bùa hộ thân với hiệu ứng đặc biệt (chí mạng, né, phản đòn, hút máu, triệu thiên lôi...).',
        '**Cường hóa:** `/cuonghoa` – lên đến +15, tỉ lệ giảm dần. Thất bại có thể **tụt cấp, bị sét đánh, vỡ đồ**! Dùng 🍀 Thiên Vận Phù (+10%) và 🧿 Phù Bảo Hộ để an toàn.',
        '**Độ kiếp:** mỗi 10 cấp bạn chạm bình cảnh. Dùng `/dokiep` để chịu thiên lôi, vượt qua sẽ đột phá cảnh giới (+10% chỉ số gốc).',
        '**Chế tạo:** `/chetao` – nguyên liệu rớt từ yêu ma (Lôi Thạch, Huyết Ngọc...) để chế đồ bậc cao.',
        '**Hằng ngày:** `/diemdanh`, `/nhiemvu`, `/toathien`. Xếp hạng: `/bxh`.',
        '', '**Khu vực săn:**', mapList,
      ].join('\n'))] });
  },
};

/* ═══════════════════════════ TƯƠNG TÁC ═══════════════════════════ */
async function handleAuto(i) {
  const q = norm(i.options.getFocused());
  const p = db.players[i.user.id];
  const inv = Object.keys(p?.inv || {});
  const mineCls = (id) => !ITEMS[id].cls || ITEMS[id].cls === p?.cls;
  let ids = [];
  switch (i.commandName) {
    case 'mua': ids = Object.keys(ITEMS).filter((id) => ITEMS[id].shop && mineCls(id)); break;
    case 'ban': ids = inv; break;
    case 'dung': ids = inv.filter((id) => ITEMS[id].type === 'potion'); break;
    case 'trangbi': ids = inv.filter((id) => SLOT_OF[ITEMS[id].type] && mineCls(id)); break;
    case 'cuonghoa': ids = [...new Set([...inv, ...Object.values(p?.equip || {})])].filter((id) => id && canEnhance(id)); break;
    case 'chetao': ids = Object.keys(RECIPES).filter(mineCls); break;
  }
  const showQty = ['ban', 'dung', 'trangbi'].includes(i.commandName);
  return i.respond(ids
    .filter((id) => norm(ITEMS[id].name).includes(q) || id.toLowerCase().includes(q))
    .slice(0, 25)
    .map((id) => ({
      name: `${ITEMS[id].emoji} ${p && enhOf(p, id) ? `+${enhOf(p, id)} ` : ''}${ITEMS[id].name}${showQty ? ` (x${p.inv[id]})` : ''}`.slice(0, 100),
      value: id,
    })));
}

async function runCombatAction(i, uid, p, action) {
  const f = fights.get(uid);
  if (!f) return i.update({ content: '⌛ Trận đấu này đã kết thúc.', embeds: [], components: [] });
  f.t = Date.now();
  const res = act(p, f, action);
  if (res.error) return i.reply({ content: res.error, flags: EPH });
  save();
  if (f.over) { fights.delete(uid); return i.update(resultView(uid, p, f)); }
  return i.update(fightView(uid, p, f));
}

async function handleButton(i) {
  const parts = i.customId.split(':');
  const kind = parts[0], uid = parts[parts.length - 1];
  if (uid !== i.user.id) return i.reply({ content: '🚫 Đây không phải của bạn!', flags: EPH });
  const p = db.players[uid];
  if (!p) return i.reply({ content: 'Bạn chưa có nhân vật.', flags: EPH });

  switch (kind) {
    case 'again': {
      const r = beginFight(uid, p, parts[1]);
      if (r.error) return i.reply({ content: r.error, flags: EPH });
      return i.update(fightView(uid, p, r.fight));
    }
    case 'cb': return runCombatAction(i, uid, p, parts[1]);
    case 'enh': return doEnhance(i, uid, p, parts[2], +parts[1]);
    case 'enhv':
      if (!owns(p, parts[1])) return i.update({ content: '❌ Món này không còn nữa.', embeds: [], components: [] });
      return i.update(enhView(p, uid, parts[1]));
    case 'kiep': return runKiep(i, uid, p, +parts[1]);
  }
}

async function handleSelect(i) {
  const [kind, uid] = i.customId.split(':');
  if (uid !== i.user.id) return i.reply({ content: '🚫 Đây không phải của bạn!', flags: EPH });
  const p = db.players[uid];
  if (!p) return i.reply({ content: 'Bạn chưa có nhân vật.', flags: EPH });
  const v = i.values[0];
  if (kind === 'shopcat') return i.update(shopView(p, uid, v));
  if (kind === 'shop') return i.reply({ content: buy(p, v, 1), flags: EPH });
  if (kind === 'ct') return v === 'none' ? i.deferUpdate() : runCombatAction(i, uid, p, `use:${v}`);
}

/* ═══════════════════════════ KHỞI ĐỘNG ═══════════════════════════ */
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`☯️ Đạo Sĩ Bot v3 đã sẵn sàng: ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID)
      : Routes.applicationCommands(c.user.id);
    await rest.put(route, { body: commands });
    console.log(`✅ Đã đăng ký ${commands.length} lệnh (${process.env.GUILD_ID ? 'server' : 'toàn cầu'}).`);
  } catch (e) { console.error('Lỗi đăng ký lệnh:', e); }
  c.user.setActivity('trừ tà diệt cương thi 🧟', { type: 0 });
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isAutocomplete()) return await handleAuto(i);
    if (i.isChatInputCommand()) return await handlers[i.commandName]?.(i);
    if (i.isButton()) return await handleButton(i);
    if (i.isStringSelectMenu()) return await handleSelect(i);
  } catch (e) {
    console.error(e);
    const msg = { content: '⚠️ Có lỗi xảy ra, thử lại sau nhé!', flags: EPH };
    try { (i.deferred || i.replied) ? await i.followUp(msg) : await i.reply(msg); } catch { /* bỏ qua */ }
  }
});

if (require.main === module) {
  if (!process.env.DISCORD_TOKEN) { console.error('❌ Thiếu DISCORD_TOKEN trong file .env'); process.exit(1); }
  client.login(process.env.DISCORD_TOKEN);
} else {
  module.exports = { ITEMS, RECIPES, GEAR, CLASSES, MAPS, newPlayer, stats, perks, beginFight, act, fightView, enhanceAttempt, enhView, shopView, simKiep, kiepView, gainExp, migrate, buy, fights, capOf, atBottleneck, expNeed, ENH_RATE, handlers };
}
