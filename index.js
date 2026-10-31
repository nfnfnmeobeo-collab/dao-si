// ☯️ ĐẠO SĨ BOT v4.4 – Bot RPG Discord lấy cảm hứng từ phim "Cương Thi Tiên Sinh"
// Nhân vật: 18 môn phái, 3 phe, VIP/Nguyên Bảo • Đồ: riêng từng phái, pháp bảo, bùa, lệnh bài phe
// Nâng cấp: cường hóa +15 (sét đánh), luyện tuyệt kỹ, thăng phẩm, tinh luyện, khảm ngọc, công pháp, độ thiên kiếp, tiến hóa đệ tử
// Hoạt động: săn 6 khu vực, Trấn Yêu Tháp, boss thế giới, võ đài PvP, tông môn, chợ, 16 cửa hàng, rương, bùa phúc, nhiệm vụ theo phái & cảnh giới, thành tựu
// Dữ liệu: tự lưu + ghi nguyên tử + sao lưu 30 phút/lần + tự khôi phục khi file hỏng
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
    hp: 108, mp: 50, atk: 11, def: 5, g: { hp: 15, mp: 6, atk: 1.9, def: 1.2 },
    skills: [
      { name: 'Thiên Lôi Chú', lv: 1, cost: 20, mult: 2.0, heal: 0.1 },
      { name: 'Ngũ Lôi Chính Pháp', lv: 8, cost: 40, mult: 0.9, hits: 3 },
      { name: 'Thiên Sư Hàng Ma', lv: 16, cost: 80, mult: 4.5, stun: 0.35, heal: 0.12 },
    ],
  },
  phuchu: {
    name: 'Phù Chú Sư', emoji: '📜',
    desc: 'Linh lực dồi dào, phù chú xuyên giáp. Máu giấy nhưng sát thương khủng.',
    hp: 96, mp: 80, atk: 9, def: 4, g: { hp: 16, mp: 10, atk: 2.5, def: 1.2 },
    skills: [
      { name: 'Cửu Long Phù Ấn', lv: 1, cost: 25, mult: 2.6, ignoreDef: true },
      { name: 'Liệt Hỏa Phù', lv: 8, cost: 40, mult: 1.6, burn: { atkPct: 0.35, t: 3 } },
      { name: 'Vạn Phù Quy Tông', lv: 16, cost: 90, mult: 1.1, hits: 5, ignoreDef: true },
    ],
  },
  vodao: {
    name: 'Võ Đạo Sĩ', emoji: '🥋',
    desc: 'Thân thể cứng như thép, đấm là cương thi choáng váng.',
    hp: 118, mp: 30, atk: 12, def: 7, g: { hp: 20, mp: 3, atk: 2.4, def: 1.5 },
    skills: [
      { name: 'Thiết Sa Chưởng', lv: 1, cost: 15, mult: 1.8, stun: 0.25 },
      { name: 'Kim Chung Tráo', lv: 8, cost: 30, mult: 0.8, shield: { pct: 0.4, t: 3 } },
      { name: 'Long Hổ Quyền', lv: 16, cost: 60, mult: 3.8, lifesteal: 0.3, stun: 0.3 },
    ],
  },
  thieulam: {
    name: 'Thiếu Lâm Võ Tăng', emoji: '🧘',
    desc: 'Thân kim cang, phật quang trừ tà. Cực bền, hồi máu, đặc biệt khắc cương thi và ma quỷ.',
    hp: 120, mp: 40, atk: 9, def: 9, g: { hp: 18, mp: 4, atk: 1.9, def: 1.8 },
    skills: [
      { name: 'Kim Cang Hộ Thể', lv: 1, cost: 15, mult: 1.2, shield: { pct: 0.4, t: 2 } },
      { name: 'Phật Quang Phổ Chiếu', lv: 8, cost: 40, mult: 1.5, heal: 0.15, vsUndead: 1.6 },
      { name: 'La Hán Phục Ma', lv: 16, cost: 80, mult: 3.8, stun: 0.4, shield: { pct: 0.5, t: 3 }, vsUndead: 1.3 },
    ],
  },
  thucson: {
    name: 'Thục Sơn Kiếm Tu', emoji: '🗡️',
    desc: 'Ngự kiếm phi thiên, sát thương và chí mạng cao nhất nhưng thân thể mỏng manh.',
    hp: 90, mp: 55, atk: 12, def: 4, g: { hp: 14, mp: 6, atk: 2.6, def: 0.9 },
    skills: [
      { name: 'Ngự Kiếm Thuật', lv: 1, cost: 18, mult: 2.4 },
      { name: 'Vạn Kiếm Quy Tông', lv: 8, cost: 45, mult: 0.8, hits: 5 },
      { name: 'Thiên Kiếm Nhất Kích', lv: 16, cost: 90, mult: 5.5, ignoreDef: true },
    ],
  },
  nguthi: {
    name: 'Ngự Thi Sư', emoji: '🧟',
    desc: 'Điều khiển cương thi như trong phim. Đệ tử mạnh hơn 25%, khởi đầu có sẵn Tiểu Cương Thi, nguyền rủa làm quái yếu đi.',
    hp: 105, mp: 60, atk: 9, def: 5, g: { hp: 15, mp: 7, atk: 2.1, def: 1.1 }, petBoost: 1.25,
    skills: [
      { name: 'Thi Khí Xâm Nhập', lv: 1, cost: 18, mult: 1.8, curse: { pct: 0.15, t: 2 } },
      { name: 'Vạn Thi Triều', lv: 8, cost: 45, mult: 0.9, hits: 4 },
      { name: 'Thi Vương Giáng Thế', lv: 16, cost: 95, mult: 4.2, lifesteal: 0.2, curse: { pct: 0.2, t: 3 } },
    ],
  },
  quydao: {
    name: 'Quỷ Đạo Sư', emoji: '👺',
    desc: 'Tà thuật hút máu, thiêu đốt và nguyền rủa. Càng đánh càng khỏe, hợp với Ma Đạo.',
    hp: 94, mp: 75, atk: 10, def: 4, g: { hp: 13, mp: 9, atk: 2.4, def: 0.9 },
    skills: [
      { name: 'Huyết Chú', lv: 1, cost: 20, mult: 2.2, lifesteal: 0.3 },
      { name: 'U Minh Hỏa', lv: 8, cost: 40, mult: 1.4, burn: { atkPct: 0.5, t: 3 }, curse: { pct: 0.15, t: 2 } },
      { name: 'Vạn Quỷ Phệ Hồn', lv: 16, cost: 90, mult: 4.0, ignoreDef: true, lifesteal: 0.35 },
    ],
  },
  caibang: {
    name: 'Cái Bang Hiệp Cái', emoji: '🍶',
    desc: 'Lang bạt giang hồ, ăn mày mà võ công cái thế. Say quyền khó đoán, hay né đòn và kiếm được nhiều vàng hơn.',
    hp: 104, mp: 40, atk: 10, def: 5, g: { hp: 17, mp: 4, atk: 2.1, def: 1.4 }, goldBonus: 0.12, perk: { dodge: 0.03 },
    skills: [
      { name: 'Đả Cẩu Bổng Pháp', lv: 1, cost: 16, mult: 1.0, hits: 2 },
      { name: 'Say Quyền', lv: 8, cost: 35, mult: 1.8, heal: 0.08, stun: 0.25 },
      { name: 'Hàng Long Thập Bát Chưởng', lv: 16, cost: 85, mult: 5.0, stun: 0.35 },
    ],
  },
  duocvuong: {
    name: 'Dược Vương Y Sư', emoji: '🌿',
    desc: 'Thầy thuốc độc lập thiên hạ. Đan dược hồi máu mạnh hơn 35%, độc châm thiêu đốt và nguyền rủa kẻ địch.',
    hp: 90, mp: 70, atk: 9, def: 4, g: { hp: 14, mp: 8, atk: 2.4, def: 1.0 }, potBoost: 1.35, perk: { regen: 3 },
    skills: [
      { name: 'Độc Châm', lv: 1, cost: 18, mult: 1.7, burn: { atkPct: 0.28, t: 3 } },
      { name: 'Hồi Xuân Thuật', lv: 8, cost: 40, mult: 1.2, heal: 0.08, shield: { pct: 0.15, t: 2 } },
      { name: 'Vạn Độc Tán', lv: 16, cost: 90, mult: 3.3, burn: { atkPct: 0.6, t: 4 }, curse: { pct: 0.25, t: 3 } },
    ],
  },
  duongmon: {
    name: 'Đường Môn Ám Khí Sư', emoji: '🎯',
    desc: 'Ám khí tẩm độc, tập kích bất ngờ. Chí mạng và né tránh cao, thân thể mong manh.',
    hp: 94, mp: 60, atk: 12, def: 4, g: { hp: 14, mp: 6, atk: 2.5, def: 0.9 }, perk: { crit: 0.08, dodge: 0.03 },
    skills: [
      { name: 'Mưa Hoa Lê', lv: 1, cost: 18, mult: 0.7, hits: 3 },
      { name: 'Độc Tiêu Truy Mệnh', lv: 8, cost: 38, mult: 1.8, burn: { atkPct: 0.45, t: 3 } },
      { name: 'Truy Hồn Đoạt Mệnh', lv: 16, cost: 88, mult: 5.2, ignoreDef: true },
    ],
  },
  phongthuy: {
    name: 'Phong Thủy Sư', emoji: '🧭',
    desc: 'Thông hiểu âm dương bát quái, bày trận bảo hộ và làm loạn khí vận kẻ địch.',
    hp: 100, mp: 65, atk: 9, def: 6, g: { hp: 15, mp: 7, atk: 2.0, def: 1.3 }, perk: { regen: 3 },
    skills: [
      { name: 'Bát Quái Trận', lv: 1, cost: 20, mult: 1.6, shield: { pct: 0.25, t: 2 } },
      { name: 'Âm Dương Đảo Loạn', lv: 8, cost: 42, mult: 1.8, curse: { pct: 0.25, t: 2 }, stun: 0.2 },
      { name: 'Càn Khôn Nhất Kích', lv: 16, cost: 90, mult: 4.4, ignoreDef: true, stun: 0.25, shield: { pct: 0.15, t: 2 } },
    ],
  },
  cosu: {
    name: 'Cổ Sư Miêu Cương', emoji: '🐛',
    desc: 'Nuôi cổ trùng độc địa, hút máu địch. Đệ tử mạnh hơn 15%, tự hút một ít sinh lực mỗi đòn.',
    hp: 94, mp: 65, atk: 9, def: 4, g: { hp: 15, mp: 7, atk: 2.2, def: 1.0 }, petBoost: 1.15, perk: { lifesteal: 0.02 },
    skills: [
      { name: 'Phệ Tâm Cổ', lv: 1, cost: 18, mult: 1.6, burn: { atkPct: 0.35, t: 3 }, lifesteal: 0.07 },
      { name: 'Vạn Cổ Quy Tông', lv: 8, cost: 45, mult: 0.8, hits: 4, curse: { pct: 0.15, t: 2 } },
      { name: 'Kim Tàm Cổ Vương', lv: 16, cost: 92, mult: 4.3, lifesteal: 0.3, burn: { atkPct: 0.5, t: 3 } },
    ],
  },
  vodang: {
    name: 'Võ Đang Đạo Trưởng', emoji: '🌀',
    desc: 'Lấy nhu thắng cương, thái cực vòng tròn. Chịu đòn giỏi và phản lại sát thương, càng đánh càng bền.',
    hp: 108, mp: 55, atk: 9, def: 6, g: { hp: 16, mp: 6, atk: 2.0, def: 1.4 }, perk: { thorns: 0.02 },
    skills: [
      { name: 'Thái Cực Quyền', lv: 1, cost: 16, mult: 1.6, shield: { pct: 0.3, t: 2 } },
      { name: 'Tứ Lạng Bạt Thiên Cân', lv: 8, cost: 40, mult: 1.0, hits: 3, curse: { pct: 0.15, t: 2 } },
      { name: 'Vô Cực Thái Cực', lv: 16, cost: 85, mult: 3.6, heal: 0.08, shield: { pct: 0.35, t: 3 } },
    ],
  },
  ngami: {
    name: 'Nga Mi Nữ Hiệp', emoji: '🌸',
    desc: 'Kiếm pháp thanh tao kèm y thuật cứu người. Hồi máu giỏi, tu luyện nhanh hơn (+8% EXP).',
    hp: 95, mp: 70, atk: 9, def: 4, g: { hp: 14, mp: 8, atk: 2.1, def: 1.0 }, expBonus: 0.08, perk: { regen: 1 },
    skills: [
      { name: 'Nga Mi Kiếm Pháp', lv: 1, cost: 18, mult: 1.9, heal: 0.05 },
      { name: 'Thanh Liên Hộ Thể', lv: 8, cost: 40, mult: 1.0, heal: 0.09, shield: { pct: 0.2, t: 2 } },
      { name: 'Phổ Độ Chúng Sinh', lv: 16, cost: 85, mult: 3.9, heal: 0.15, vsUndead: 1.4 },
    ],
  },
  hoason: {
    name: 'Hoa Sơn Kiếm Khách', emoji: '🏔️',
    desc: 'Kiếm tông Hoa Sơn: tốc độ và chí mạng. Sát thương bùng nổ nhưng thân thể mỏng manh.',
    hp: 88, mp: 55, atk: 12, def: 3, g: { hp: 13, mp: 6, atk: 2.6, def: 0.8 }, perk: { crit: 0.05, dodge: 0.02 },
    skills: [
      { name: 'Hoa Sơn Kiếm Pháp', lv: 1, cost: 17, mult: 2.2 },
      { name: 'Tử Hà Thần Công', lv: 8, cost: 45, mult: 0.7, hits: 4, ignoreDef: true },
      { name: 'Độc Cô Cửu Kiếm', lv: 16, cost: 90, mult: 5.2, ignoreDef: true },
    ],
  },
  minhgiao: {
    name: 'Minh Giáo Thánh Hỏa Sứ', emoji: '🔥',
    desc: 'Thánh hỏa thiêu rụi tà ma. Đốt cháy kẻ địch, hút sinh lực, đặc biệt mạnh khi đánh ma quỷ.',
    hp: 104, mp: 62, atk: 10, def: 5, g: { hp: 15, mp: 7, atk: 2.3, def: 1.1 }, perk: { lifesteal: 0.02 },
    skills: [
      { name: 'Thánh Hỏa Lệnh', lv: 1, cost: 18, mult: 2.0, burn: { atkPct: 0.4, t: 3 } },
      { name: 'Liệt Hỏa Kỳ', lv: 8, cost: 42, mult: 1.8, burn: { atkPct: 0.5, t: 3 }, vsUndead: 1.3 },
      { name: 'Thánh Hỏa Thiêu Thiên', lv: 16, cost: 90, mult: 4.3, burn: { atkPct: 0.7, t: 4 }, lifesteal: 0.15, vsUndead: 1.3 },
    ],
  },
  conlon: {
    name: 'Côn Lôn Băng Tiên', emoji: '❄️',
    desc: 'Hàn băng đóng băng kẻ địch, khóa hành động và làm yếu sức mạnh. Khống chế mạnh, bền bỉ.',
    hp: 102, mp: 70, atk: 10, def: 5, g: { hp: 15, mp: 8, atk: 2.2, def: 1.2 }, perk: { reduce: 0.015 },
    skills: [
      { name: 'Hàn Băng Chưởng', lv: 1, cost: 18, mult: 1.9, stun: 0.25 },
      { name: 'Tuyết Phong Hộ Thể', lv: 8, cost: 42, mult: 1.4, shield: { pct: 0.35, t: 3 }, curse: { pct: 0.15, t: 2 } },
      { name: 'Vạn Lý Băng Phong', lv: 16, cost: 92, mult: 4.1, stun: 0.4, curse: { pct: 0.2, t: 3 } },
    ],
  },
  thiencogac: {
    name: 'Thiên Cơ Các Quái Sĩ', emoji: '🔮',
    desc: 'Bói toán kinh thiên, đoán trước vận mệnh. May mắn: +12% tỉ lệ vật phẩm rơi, +6% vàng, chí mạng cao.',
    hp: 92, mp: 72, atk: 10, def: 4, g: { hp: 14, mp: 8, atk: 2.3, def: 0.9 }, dropBonus: 0.12, goldBonus: 0.06, perk: { crit: 0.03 },
    skills: [
      { name: 'Chiêm Tinh', lv: 1, cost: 18, mult: 1.7 },
      { name: 'Thiên Cơ Diệu Toán', lv: 8, cost: 42, mult: 1.0, hits: 3, curse: { pct: 0.15, t: 2 } },
      { name: 'Nghịch Thiên Cải Mệnh', lv: 16, cost: 90, mult: 4.6, ignoreDef: true, heal: 0.1 },
    ],
  },
};

/* ── Trang bị riêng từng môn phái: [id, tên, emoji, (hiệu ứng đặc biệt)] ──
   weapon: 5 bậc • armor: 4 bậc • treasure (pháp bảo): 3 bậc • charm (bùa hộ thân): 3 bậc            */
const GEAR = {
  maoson: {
    weapon: [['kiemgodao', 'Kiếm Gỗ Đào', '🗡️'], ['kiemdongtien', 'Kiếm Đồng Tiền', '🪙'], ['thatinhkiem', 'Thất Tinh Kiếm', '⚔️'], ['loikichkiem', 'Lôi Kích Mộc Kiếm', '🌩️'], ['anthiensu', 'Ấn Thiên Sư', '🔱']],
    armor: [['daobaoxanh', 'Đạo Bào Xanh', '🥋'], ['daobaobatquai', 'Đạo Bào Bát Quái', '👘'], ['daobaotamthanh', 'Đạo Bào Tam Thanh', '🎽'], ['giapthienlong', 'Giáp Thiên Long', '🛡️']],
    treasure: [['lasanphongthuy', 'La Bàn Phong Thủy', '🧭', { crit: 0.05 }], ['tamthanhchung', 'Tam Thanh Linh Chung', '🛎️', { thunder: 0.09 }], ['thienleiankinh', 'Thiên Lôi Ấn Kính', '🪞', { thunder: 0.15, crit: 0.05 }]],
    charm: [['binhanphu', 'Bình An Phù', '🧧', { dodge: 0.03 }], ['trantaphu', 'Trấn Tà Phù', '📛', { dodge: 0.05, reduce: 0.03 }], ['homenhphu', 'Thiên Sư Hộ Mệnh Phù', '🏮', { dodge: 0.07, thunder: 0.05 }]],
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
    treasure: [['kimcangxu', 'Kim Cang Xử', '🪓', { reduce: 0.045 }], ['cuuhoanthientruong', 'Cửu Hoàn Thiền Trượng', '🦯', { reduce: 0.08, thorns: 0.12 }], ['longhodongnhan', 'Long Hổ Đồng Nhân', '🗿', { lifesteal: 0.08, reduce: 0.08, stun: 0.1 }]],
    charm: [['kimthanphu', 'Kim Thân Phù', '🟡', { reduce: 0.03 }], ['thietbophu', 'Thiết Bố Phù', '🟠', { reduce: 0.055, lifesteal: 0.03 }], ['bathoaikimthanphu', 'Bất Hoại Kim Thân Phù', '🔶', { reduce: 0.1, lifesteal: 0.05 }]],
  },
  thieulam: {
    weapon: [['thientruonggo', 'Thiền Trượng Gỗ', '🪵'], ['thietthientruong', 'Thiết Thiền Trượng', '🦯'], ['tichtruongcuuhoan', 'Tích Trượng Cửu Hoàn', '🔱'], ['hangmagioidao', 'Hàng Ma Giới Đao', '🗡️'], ['longtuongbatnha', 'Long Tượng Bát Nhã Trượng', '🪄']],
    armor: [['aocasavai', 'Áo Cà Sa Vải', '🥻'], ['casaphatquang', 'Cà Sa Phật Quang', '🧣'], ['kimcangcasa', 'Kim Cang Cà Sa', '🛡️'], ['lahanchiengiap', 'La Hán Chiến Giáp', '🐘']],
    treasure: [['chuoihatbode', 'Chuỗi Hạt Bồ Đề', '📿', { reduce: 0.05, regen: 3 }], ['mogothienam', 'Mõ Gỗ Thiền Âm', '🥁', { reduce: 0.07, stun: 0.08 }], ['phatnhanxalo', 'Phật Nhãn Xá Lợi', '🔮', { reduce: 0.1, lifesteal: 0.06, stun: 0.1 }]],
    charm: [['binhanthienphu', 'Bình An Thiền Phù', '🧧', { reduce: 0.03 }], ['hophapphu', 'Hộ Pháp Phù', '🔰', { reduce: 0.05, dodge: 0.03 }], ['phatquanghomenh', 'Phật Quang Hộ Mệnh', '☸️', { reduce: 0.1, dodge: 0.05, regen: 4 }]],
  },
  thucson: {
    weapon: [['thanhphongkiem', 'Thanh Phong Kiếm', '🗡️'], ['tudienkiem', 'Tử Điện Kiếm', '⚡'], ['huyenthiettrongkiem', 'Huyền Thiết Trọng Kiếm', '⚔️'], ['thienhakiem', 'Thiên Hà Kiếm', '🌌'], ['thucsontienkiem', 'Thục Sơn Tiên Kiếm', '🌠']],
    armor: [['kiemtubao', 'Kiếm Tu Bào', '👘'], ['vanthuongy', 'Vân Thường Y', '🥼'], ['hanbanggiap', 'Hàn Băng Giáp', '🧊'], ['tiencotphapy', 'Tiên Cốt Pháp Y', '✨']],
    treasure: [['kiemhaptre', 'Kiếm Hạp Tre', '🎋', { crit: 0.06 }], ['phikiemhoLo', 'Phi Kiếm Hồ Lô', '🏺', { crit: 0.08, thunder: 0.06 }], ['thienkiemansilver', 'Thiên Kiếm Ấn', '🔰', { crit: 0.12, thunder: 0.1, lifesteal: 0.03 }]],
    charm: [['kiemyphu', 'Kiếm Ý Phù', '🌿', { crit: 0.03 }], ['thanhphongphu', 'Thanh Phong Phù', '🍃', { crit: 0.04, dodge: 0.04 }], ['tiennhanhophu', 'Tiên Nhân Hộ Phù', '🌸', { crit: 0.07, dodge: 0.05 }]],
  },
  nguthi: {
    weapon: [['lucladanthi', 'Lục Lạc Dẫn Thi', '🔔'], ['phuonchieuhon', 'Phướn Chiêu Hồn', '🚩'], ['cauhonphien', 'Câu Hồn Phiên', '🏴'], ['thivuongphien', 'Thi Vương Phiên', '🏳️'], ['vanthiquyentruong', 'Vạn Thi Quyền Trượng', '💀']],
    armor: [['aochoangthisu', 'Áo Choàng Thi Sư', '🧥'], ['thibaoamkhi', 'Thi Bào Âm Khí', '🥷'], ['hacydanhon', 'Hắc Y Dẫn Hồn', '🦇'], ['thivuongchienbao', 'Thi Vương Chiến Bào', '👹']],
    treasure: [['binhthikhi', 'Bình Thi Khí', '🏺', { regen: 4, reduce: 0.04 }], ['honphiencolenh', 'Hồn Phiên Cờ Lệnh', '🎌', { lifesteal: 0.04, regen: 4 }], ['quantailinhbao', 'Quan Tài Linh Bảo', '⚰️', { lifesteal: 0.06, reduce: 0.08, regen: 6 }]],
    charm: [['buadanthi', 'Bùa Dẫn Thi', '🔖', { regen: 3 }], ['thiphuhothe', 'Thi Phù Hộ Thể', '📑', { regen: 4, lifesteal: 0.03 }], ['thienthimenhphu', 'Thiên Thi Mệnh Phù', '🪬', { regen: 6, lifesteal: 0.04, dodge: 0.04 }]],
  },
  quydao: {
    weapon: [['xuongtruongden', 'Xương Trượng Đen', '🦴'], ['huyetnguyetdao', 'Huyết Nguyệt Đao', '🌙'], ['quydaudao', 'Quỷ Đầu Đao', '☠️'], ['uminhquytruong', 'U Minh Quỷ Trượng', '👻'], ['cuuumakiem', 'Cửu U Ma Kiếm', '🌑']],
    armor: [['hacbaoquydao', 'Hắc Bào Quỷ Đạo', '🧥'], ['huyety', 'Huyết Y', '🩸'], ['quydiengiap', 'Quỷ Diện Giáp', '👺'], ['cuuumay', 'Cửu U Ma Y', '😈']],
    treasure: [['daulauchenmau', 'Đầu Lâu Chén Máu', '🍷', { lifesteal: 0.06 }], ['quynhanchau', 'Quỷ Nhãn Châu', '👁️', { lifesteal: 0.08, crit: 0.05 }], ['vanhonphienma', 'Vạn Hồn Phiên Ma', '🏴‍☠️', { lifesteal: 0.12, thunder: 0.1, crit: 0.06 }]],
    charm: [['huyetphu', 'Huyết Phù', '🩸', { lifesteal: 0.03 }], ['quymauphu', 'Quỷ Mẫu Phù', '🎭', { lifesteal: 0.05, crit: 0.03 }], ['uminhhophu', 'U Minh Hộ Phù', '🕯️', { lifesteal: 0.08, crit: 0.05, dodge: 0.03 }]],
  },
  caibang: {
    weapon: [['gaytruc', 'Gậy Trúc', '🎋'], ['dacubong', 'Đả Cẩu Bổng', '🏑'], ['batbaohoLotruong', 'Bát Bảo Hồ Lô Trượng', '🪄'], ['luctruc', 'Lục Ngọc Trượng', '🦯'], ['hangronglinhtruong', 'Hàng Long Linh Trượng', '🐉']],
    armor: [['aovachang', 'Áo Vá Chằng Chịt', '🧥'], ['bodycaibang', 'Bố Y Cái Bang', '👘'], ['thapdaibaodaiy', 'Thập Đại Bố Đại Y', '🥋'], ['cuudaitruonglaobao', 'Cửu Đại Trưởng Lão Bào', '🛡️']],
    treasure: [['batsanhvo', 'Bát Sành Vỡ', '🥣', { dodge: 0.04, regen: 3 }], ['holoruousay', 'Hồ Lô Rượu Say', '🍶', { dodge: 0.06, lifesteal: 0.04 }], ['nonlatruonglao', 'Nón Lá Trưởng Lão', '👒', { dodge: 0.08, reduce: 0.05, lifesteal: 0.05 }]],
    charm: [['phuxinan', 'Bùa Xin Ăn', '🍚', { dodge: 0.03 }], ['batcomhomenh', 'Bát Cơm Hộ Mệnh', '🍜', { dodge: 0.04, regen: 3 }], ['caibanglenhbai', 'Cái Bang Lệnh Bài', '🏮', { dodge: 0.06, reduce: 0.04, regen: 4 }]],
  },
  duocvuong: {
    weapon: [['kimchamdoc', 'Kim Châm Độc', '🪡'], ['ngancham', 'Ngân Châm Thần Y', '💉'], ['bachthaotruong', 'Bách Thảo Pháp Trượng', '🌿'], ['thannongdinh', 'Thần Nông Dược Đỉnh', '⚗️'], ['duocvuongthantruong', 'Dược Vương Thần Trượng', '🌳']],
    armor: [['aothaythuoc', 'Áo Thầy Thuốc', '🥼'], ['ybaohoduoc', 'Y Bào Hộ Dược', '👘'], ['aobachthao', 'Bách Thảo Y', '🧥'], ['aothannongchieny', 'Thần Nông Chiến Y', '🍃']],
    treasure: [['tuithuoccotruyen', 'Túi Thuốc Cổ Truyền', '👜', { regen: 3, reduce: 0.02 }], ['binhdocduoc', 'Bình Độc Dược', '🧪', { lifesteal: 0.04, regen: 5 }], ['linhchingannam', 'Linh Chi Ngàn Năm', '🍄', { lifesteal: 0.06, regen: 8, reduce: 0.05 }]],
    charm: [['phuthaoduoc', 'Phù Thảo Dược', '🌱', { regen: 3 }], ['phubachdoc', 'Bách Độc Bất Xâm Phù', '☘️', { reduce: 0.04, regen: 4 }], ['phulinhchi', 'Linh Chi Hộ Mệnh', '🍀', { reduce: 0.06, regen: 6, dodge: 0.03 }]],
  },
  duongmon: {
    weapon: [['phitieusat', 'Phi Tiêu Sắt', '🎯'], ['tuutien', 'Tụ Tiễn Ống', '🏹'], ['phidaoban', 'Bàn Nguyệt Phi Đao', '🔪'], ['maihoacham', 'Mai Hoa Châm', '🌺'], ['baovulehoacham', 'Bạo Vũ Lê Hoa Châm', '🌧️']],
    armor: [['aodahanh', 'Dạ Hành Y', '🥷'], ['aohacdiep', 'Hắc Điệp Y', '🦋'], ['aoamkhigiap', 'Ám Khí Giáp', '🧥'], ['aoduongmonbiy', 'Đường Môn Bí Y', '🕶️']],
    treasure: [['ongtientre', 'Ống Tiễn Tre', '🎋', { crit: 0.06 }], ['tuiamkhibitruyen', 'Túi Ám Khí Bí Truyền', '👝', { crit: 0.08, dodge: 0.04 }], ['hapcoquan', 'Hạp Cơ Quan Tụ Kiếm', '🧰', { crit: 0.12, dodge: 0.05, thunder: 0.05 }]],
    charm: [['phuamkhi', 'Ám Khí Phù', '📌', { crit: 0.03 }], ['phudahanh', 'Dạ Hành Phù', '🌑', { crit: 0.04, dodge: 0.04 }], ['phuduongmon', 'Đường Môn Mệnh Phù', '🔖', { crit: 0.07, dodge: 0.05 }]],
  },
  phongthuy: {
    weapon: [['lasango', 'La Bàn Gỗ', '🧭'], ['dialythuoc', 'Địa Lý Thước', '📏'], ['batquaikiem', 'Bát Quái Kiếm', '🔯'], ['kimlasan', 'Kim La Bàn Tông Sư', '🧿'], ['cankhonphaplenh', 'Càn Khôn Pháp Lệnh', '☯️']],
    armor: [['aophongthuy', 'Áo Phong Thủy', '👘'], ['batquaiy', 'Bát Quái Y', '🔯'], ['tamtaiphapy', 'Tam Tài Pháp Y', '🥼'], ['cankhondaobao', 'Càn Khôn Đạo Bào', '🌌']],
    treasure: [['thuocloban', 'Thước Lỗ Ban', '📐', { reduce: 0.05, regen: 3 }], ['guongphongthuy', 'Gương Phong Thủy', '🪞', { reduce: 0.07, dodge: 0.04 }], ['tranbancuucung', 'Trận Bàn Cửu Cung', '🔶', { reduce: 0.1, dodge: 0.05, regen: 6 }]],
    charm: [['trantrachphu', 'Trấn Trạch Phù', '🏠', { reduce: 0.03 }], ['tranhsatphu', 'Tránh Sát Phù', '🛡️', { reduce: 0.05, dodge: 0.03 }], ['cankhonhophu', 'Càn Khôn Hộ Phù', '🌌', { reduce: 0.08, dodge: 0.04, regen: 4 }]],
  },
  cosu: {
    weapon: [['saogoico', 'Sáo Gọi Cổ', '🪈'], ['kentrungco', 'Kèn Trùng Cổ', '📯'], ['binhnuoico', 'Bình Nuôi Cổ', '🏺'], ['cotruongmieucuong', 'Cổ Trượng Miêu Cương', '🪱'], ['covuongquyentruong', 'Cổ Vương Quyền Trượng', '👑']],
    armor: [['aomieucuong', 'Áo Choàng Miêu Cương', '🧥'], ['yphucbachco', 'Y Phục Bách Cổ', '👘'], ['cotrunggiap', 'Cổ Trùng Giáp', '🪲'], ['covuongchieny', 'Cổ Vương Chiến Y', '🦂']],
    treasure: [['hucotrung', 'Hũ Cổ Trùng', '🫙', { lifesteal: 0.04, regen: 3 }], ['ranlinhhophap', 'Rắn Linh Hộ Pháp', '🐍', { lifesteal: 0.06, reduce: 0.04 }], ['nhenvuongngannam', 'Nhện Vương Ngàn Năm', '🕷️', { lifesteal: 0.09, thunder: 0.06, regen: 5 }]],
    charm: [['cophu', 'Cổ Phù', '🦠', { lifesteal: 0.03 }], ['bachcophu', 'Bách Cổ Phù', '🦎', { lifesteal: 0.04, regen: 4 }], ['covuongmenhphu', 'Cổ Vương Mệnh Phù', '🕸️', { lifesteal: 0.06, regen: 5, dodge: 0.03 }]],
  },
  vodang: {
    weapon: [['vd_kiemgo', 'Kiếm Gỗ Võ Đang', '🗡️'], ['vd_phattran', 'Phất Trần Võ Đang', '🪶'], ['vd_chanvu', 'Chân Vũ Kiếm', '⚔️'], ['vd_tamphong', 'Tam Phong Kiếm', '🌪️'], ['vd_thaicuctien', 'Thái Cực Tiên Kiếm', '☯️']],
    armor: [['vd_daobao', 'Đạo Bào Võ Đang', '👘'], ['vd_batquaibao', 'Bát Quái Bào', '🧥'], ['vd_chanvuy', 'Chân Vũ Pháp Y', '🥼'], ['vd_vocuctien', 'Vô Cực Tiên Y', '✨']],
    treasure: [['vd_batquaiban', 'Bát Quái Bàn', '🧭', { reduce: 0.04, thorns: 0.02 }], ['vd_thaicucdo', 'Thái Cực Đồ', '☯️', { reduce: 0.05, thorns: 0.06 }], ['vd_chanvuan', 'Chân Vũ Ấn', '🔰', { reduce: 0.07, thorns: 0.09, dodge: 0.03 }]],
    charm: [['vd_binhan', 'Bình An Đạo Phù', '🧧', { reduce: 0.02 }], ['vd_thaicucphu', 'Thái Cực Hộ Phù', '🔵', { reduce: 0.04, thorns: 0.05 }], ['vd_vocucphu', 'Vô Cực Hộ Mệnh', '⚪', { reduce: 0.06, thorns: 0.07, dodge: 0.02 }]],
  },
  ngami: {
    weapon: [['nm_truongkiem', 'Trường Kiếm Nga Mi', '🗡️'], ['nm_thanhlien', 'Thanh Liên Kiếm', '🌸'], ['nm_ythien', 'Ỷ Thiên Kiếm', '⚔️'], ['nm_phatquang', 'Phật Quang Kiếm', '🌟'], ['nm_tientu', 'Nga Mi Tiên Kiếm', '🌠']],
    armor: [['nm_ao', 'Áo Nga Mi', '👘'], ['nm_thanhy', 'Thanh Y Tu Nữ', '🥻'], ['nm_lienhoay', 'Liên Hoa Pháp Y', '🌺'], ['nm_tienbao', 'Nga Mi Tiên Bào', '✨']],
    treasure: [['nm_tuiduoc', 'Túi Dược Nga Mi', '👜', { regen: 4, reduce: 0.03 }], ['nm_ngocbinh', 'Ngọc Lưu Ly Bình', '🍶', { regen: 4, reduce: 0.04, lifesteal: 0.02 }], ['nm_phatchau', 'Phật Châu Thánh Liên', '📿', { regen: 6, reduce: 0.06, lifesteal: 0.03 }]],
    charm: [['nm_thanhtam', 'Phù Thanh Tâm', '🌿', { regen: 2 }], ['nm_lienhoaphu', 'Liên Hoa Phù', '🌸', { regen: 4, dodge: 0.03 }], ['nm_tuebi', 'Từ Bi Hộ Phù', '☸️', { regen: 6, dodge: 0.03, reduce: 0.03 }]],
  },
  hoason: {
    weapon: [['hs_kiemsat', 'Kiếm Sắt Hoa Sơn', '🗡️'], ['hs_phongthanh', 'Phong Thanh Kiếm', '🌬️'], ['hs_tuha', 'Tử Hà Kiếm', '⚡'], ['hs_ngunhac', 'Ngũ Nhạc Kiếm', '🏔️'], ['hs_doccocuu', 'Độc Cô Thần Kiếm', '🌠']],
    armor: [['hs_ao', 'Áo Hoa Sơn', '🥋'], ['hs_thanhsam', 'Thanh Sam Kiếm Khách', '🧥'], ['hs_phongy', 'Phong Vân Y', '🥼'], ['hs_ngunhacy', 'Ngũ Nhạc Chiến Y', '✨']],
    treasure: [['hs_kiemhap', 'Kiếm Hạp Hoa Sơn', '🧰', { crit: 0.06 }], ['hs_phongthanhan', 'Phong Thanh Ấn', '🔰', { crit: 0.08, dodge: 0.03 }], ['hs_cuukiemdo', 'Cửu Kiếm Đồ', '📜', { crit: 0.12, dodge: 0.05, thunder: 0.05 }]],
    charm: [['hs_kiemy', 'Kiếm Ý Phù', '🌿', { crit: 0.03 }], ['hs_phongphu', 'Phong Phù', '🍃', { crit: 0.04, dodge: 0.04 }], ['hs_kiemphu', 'Hoa Sơn Kiếm Phù', '🌸', { crit: 0.07, dodge: 0.05 }]],
  },
  minhgiao: {
    weapon: [['mg_bokiem', 'Thánh Hỏa Đoản Kiếm', '🗡️'], ['mg_liethoa', 'Liệt Hỏa Kiếm', '🔥'], ['mg_thanhhoa', 'Thánh Hỏa Lệnh Kiếm', '⚔️'], ['mg_dinhthien', 'Ỷ Thiên Hỏa Kiếm', '☀️'], ['mg_minhton', 'Minh Tôn Thánh Kiếm', '🌟']],
    armor: [['mg_ao', 'Áo Minh Giáo', '🥋'], ['mg_hoay', 'Hỏa Vân Y', '🧥'], ['mg_thanhhoay', 'Thánh Hỏa Pháp Y', '🥼'], ['mg_minhtonbao', 'Minh Tôn Chiến Bào', '✨']],
    treasure: [['mg_hoadang', 'Hỏa Đăng Thánh', '🪔', { lifesteal: 0.04, thunder: 0.03 }], ['mg_hoalenh', 'Thánh Hỏa Lệnh', '🔥', { lifesteal: 0.06, thunder: 0.06 }], ['mg_hoaky', 'Liệt Hỏa Kỳ', '🚩', { lifesteal: 0.09, thunder: 0.1, crit: 0.04 }]],
    charm: [['mg_hoaphu', 'Hỏa Phù', '🧧', { lifesteal: 0.02 }], ['mg_thanhphu', 'Thánh Hỏa Hộ Phù', '🔥', { lifesteal: 0.04, crit: 0.03 }], ['mg_minhphu', 'Minh Tôn Hộ Phù', '☀️', { lifesteal: 0.06, crit: 0.05, dodge: 0.02 }]],
  },
  conlon: {
    weapon: [['cl_bangkiem', 'Băng Tinh Kiếm', '🗡️'], ['cl_tuyetphong', 'Tuyết Phong Kiếm', '🌨️'], ['cl_hanbang', 'Hàn Băng Kiếm', '🧊'], ['cl_tuyetson', 'Tuyết Sơn Tiên Kiếm', '🏔️'], ['cl_conlontien', 'Côn Lôn Thần Kiếm', '❄️']],
    armor: [['cl_ao', 'Áo Tuyết Côn Lôn', '🥼'], ['cl_bangy', 'Băng Vân Y', '🧥'], ['cl_hanbangy', 'Hàn Băng Giáp', '🧊'], ['cl_tienbao', 'Côn Lôn Tiên Y', '✨']],
    treasure: [['cl_bangchau', 'Băng Tâm Châu', '💎', { reduce: 0.05, stun: 0.05 }], ['cl_tuyetngoc', 'Tuyết Liên Ngọc', '❄️', { reduce: 0.07, stun: 0.08, regen: 3 }], ['cl_hanvuong', 'Hàn Vương Ấn', '🔰', { reduce: 0.1, stun: 0.12, regen: 5 }]],
    charm: [['cl_bangphu', 'Băng Phù', '🧿', { reduce: 0.03 }], ['cl_tuyetphu', 'Tuyết Phong Phù', '🌨️', { reduce: 0.05, dodge: 0.03 }], ['cl_hanphu', 'Hàn Băng Hộ Phù', '❄️', { reduce: 0.07, dodge: 0.04, stun: 0.05 }]],
  },
  thiencogac: {
    weapon: [['tc_quemoc', 'Quẻ Mộc', '🪵'], ['tc_thientruong', 'Thiên Cơ Trượng', '🔮'], ['tc_banlap', 'Bát Quái Trượng', '🪄'], ['tc_cokiem', 'Cổ Tinh Kiếm', '⚔️'], ['tc_thiencocac', 'Thiên Cơ Thần Khí', '🌠']],
    armor: [['tc_ao', 'Áo Thầy Bói', '🥻'], ['tc_phapbao', 'Pháp Bào Chiêm Tinh', '🧥'], ['tc_thientuong', 'Thiên Tượng Y', '🥼'], ['tc_cacchu', 'Các Chủ Pháp Y', '✨']],
    treasure: [['tc_laban', 'La Bàn Thiên Cơ', '🧭', { crit: 0.04, regen: 2 }], ['tc_quebua', 'Bộ Quẻ Đồng', '🪙', { crit: 0.06, regen: 4, dodge: 0.03 }], ['tc_thienkinh', 'Thiên Cơ Kính', '🪞', { crit: 0.08, regen: 5, dodge: 0.04 }]],
    charm: [['tc_phuque', 'Phù Quẻ', '🧧', { crit: 0.03 }], ['tc_phumay', 'Phù May Mắn', '🍀', { crit: 0.04, dodge: 0.03 }], ['tc_phuthien', 'Thiên Cơ Hộ Phù', '🔮', { crit: 0.06, dodge: 0.04, regen: 4 }]],
  },
};
const WEAPON_LV = [1, 5, 10, 16, 24], WEAPON_ATK = [6, 14, 26, 42, 70];
const ARMOR_LV = [1, 5, 10, 16], ARMOR_DEF = [4, 10, 18, 30], ARMOR_HP = [15, 40, 90, 160];
const TREAS_LV = [6, 12, 20], TREAS = { atk: [5, 10, 18], def: [3, 6, 12], hp: [40, 90, 170], mp: [20, 40, 70] };
const CHARM_LV = [2, 8, 14], CHARM = { atk: [3, 6, 11], def: [2, 4, 8], hp: [30, 70, 130] };

const ITEMS = {};
const RECIPES = {};
// Hệ số riêng của từng phái cho vũ khí (wAtk/wMp/wHp/wDef) và giáp (aK, aMp)
const CLASS_GEAR_MOD = {
  maoson: { wDef: 0.2 }, phuchu: { wMp: 1.5, aK: 0.9, aMp: 15 }, vodao: { wHp: 2, aK: 1.1 },
  thieulam: { wHp: 2, wDef: 0.2, aK: 1.15 }, thucson: { wAtk: 1.08, aK: 0.8 },
  nguthi: { wMp: 1, aK: 0.95 }, quydao: { wMp: 1.2, aK: 0.85, aMp: 10 },
  caibang: { wHp: 1.5, aK: 1.1 }, duocvuong: { wMp: 1.3, aK: 0.9, aMp: 12 }, duongmon: { wAtk: 1.05, aK: 0.8 },
  phongthuy: { wDef: 0.25, wMp: 0.6 }, cosu: { wMp: 1, aK: 0.95 },
  vodang: { wDef: 0.15, aK: 1.0 }, ngami: { wMp: 1, aK: 0.85, aMp: 10 }, hoason: { wAtk: 1.08, aK: 0.8 },
  minhgiao: { wMp: 0.8, aK: 0.9, aMp: 6 }, conlon: { wDef: 0.2, wMp: 0.6, aK: 1.0 }, thiencogac: { wMp: 1.2, aK: 0.85, aMp: 10 },
};
const priceOf = (o) => Math.round(((o.atk || 0) * 10 + (o.def || 0) * 10 + (o.hp || 0) * 1.2 + (o.mp || 0) * 2) * 3 * (1 + o.lv / 8) / 10) * 10;

for (const [cls, g] of Object.entries(GEAR)) {
  const mod = CLASS_GEAR_MOD[cls] || {};
  g.weapon.forEach(([id, name, emoji], t) => {
    const atk = Math.round(WEAPON_ATK[t] * (mod.wAtk || 1));
    const o = { name, emoji, type: 'weapon', cls, tier: t, lv: WEAPON_LV[t], atk, shop: t <= 3 };
    if (mod.wMp) o.mp = Math.round(atk * mod.wMp);
    if (mod.wHp) o.hp = Math.round(atk * mod.wHp);
    if (mod.wDef) o.def = Math.round(atk * mod.wDef);
    ITEMS[id] = { ...o, price: priceOf(o) };
  });
  g.armor.forEach(([id, name, emoji], t) => {
    const k = mod.aK || 1;
    const o = { name, emoji, type: 'armor', cls, tier: t, lv: ARMOR_LV[t], def: Math.round(ARMOR_DEF[t] * k), hp: Math.round(ARMOR_HP[t] * k), shop: t <= 3 };
    if (mod.aMp) o.mp = mod.aMp * (t + 1);
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

// ── Lệnh bài phe (ô riêng, mỗi phe 3 bậc) ──
const FAC_GEAR = {
  chinh: [['thanhvanlenh', 'Thanh Vân Lệnh', '☁️', { reduce: 0.03 }], ['chinhkhilenh', 'Chính Khí Lệnh', '⚜️', { reduce: 0.05, regen: 4 }], ['thiendaolenh', 'Thiên Đạo Lệnh', '🌅', { reduce: 0.08, thunder: 0.08, regen: 6 }]],
  ma: [['huyetanhlenh', 'Huyết Ảnh Lệnh', '🩸', { lifesteal: 0.03 }], ['uminhlenh', 'U Minh Lệnh', '🌘', { lifesteal: 0.05, crit: 0.04 }], ['diethelenh', 'Diệt Thế Lệnh', '🌋', { lifesteal: 0.08, crit: 0.07, thunder: 0.06 }]],
  tieudao: [['thanhphonglenh', 'Thanh Phong Lệnh', '🍃', { dodge: 0.03 }], ['vandulenh', 'Vân Du Lệnh', '🌤️', { dodge: 0.05, regen: 4 }], ['tieudaotienlenh', 'Tiêu Dao Tiên Lệnh', '🕊️', { dodge: 0.08, regen: 6, crit: 0.05 }]],
};
const BADGE = { lv: [5, 15, 25], atk: [4, 9, 16], def: [4, 9, 16], hp: [50, 120, 240], mp: [10, 25, 50] };
for (const [fac, list] of Object.entries(FAC_GEAR)) {
  list.forEach(([id, name, emoji, perk], t) => {
    const o = { name, emoji, type: 'badge', fac, tier: t, lv: BADGE.lv[t], atk: BADGE.atk[t], def: BADGE.def[t], hp: BADGE.hp[t], mp: BADGE.mp[t], perk, shop: t <= 1 };
    ITEMS[id] = { ...o, price: priceOf(o) };
  });
  RECIPES[list[2][0]] = { need: { [list[1][0]]: 1, loithach: 8, huyetngoc: 4, linhthach: 20 }, out: 1, gold: 8000 };
}

// Vật phẩm dùng chung
Object.assign(ITEMS, {
  // Pháp khí thêm
  binhngocbich:   { name: 'Bình Ngọc Bội',        emoji: '🪬', type: 'acc', hp: 60, price: 500, lv: 2, shop: true },
  huyenthietgioi: { name: 'Huyền Thiết Giới Chỉ', emoji: '💍', type: 'acc', atk: 8, def: 6, hp: 40, price: 3000, lv: 10, shop: true },
  longnhangioi:   { name: 'Long Nhãn Giới',       emoji: '🔶', type: 'acc', atk: 6, perk: { crit: 0.06 }, price: 9000, lv: 18, shop: true },
  thientinhchau:  { name: 'Thiên Tinh Châu',      emoji: '🌟', type: 'acc', mp: 150, hp: 150, perk: { regen: 8 }, price: 16000, lv: 22 },
  phuonghoangvu:  { name: 'Phượng Hoàng Linh Vũ', emoji: '🪶', type: 'acc', hp: 200, mp: 60, perk: { lifesteal: 0.05 }, price: 25000, lv: 26 },
  // Đan tăng EXP & đan cao cấp
  tuvi1: { name: 'Tụ Linh Đan',    emoji: '🟤', type: 'potion', price: 800,   lv: 5,  shop: true, use: { exp: 500 },   desc: '+500 EXP' },
  tuvi2: { name: 'Bồi Nguyên Đan', emoji: '🟠', type: 'potion', price: 4500,  lv: 15, shop: true, use: { exp: 3000 },  desc: '+3.000 EXP' },
  tuvi3: { name: 'Thiên Nguyên Đan', emoji: '🔴', type: 'potion', price: 20000, lv: 25, shop: true, use: { exp: 15000 }, desc: '+15.000 EXP' },
  tiendan:      { name: 'Tiên Đan',      emoji: '🌟', type: 'potion', price: 3000, lv: 25, shop: true, use: { heal: 2000 } },
  huyenlinhdan: { name: 'Huyền Linh Đan', emoji: '🧿', type: 'potion', price: 1500, lv: 20, shop: true, use: { mana: 400 } },
  // Phù đặc biệt
  hoanmenhphu: { name: 'Hoàn Mệnh Phù', emoji: '💫', type: 'talisman', price: 1500, lv: 10, shop: true, desc: 'Tự động hồi sinh 40% HP khi tử trận (dùng 1 lần)' },
  thedoiphe:   { name: 'Thẻ Đổi Phe',   emoji: '🎫', type: 'talisman', desc: 'Đổi phe miễn phí (dùng trong /phe doi)' },
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
  tiendan:       { need: { thanlinhdan: 3, huyetngoc: 2, nanhholy: 5 }, out: 1, gold: 500 },
  hoanmenhphu:   { need: { giayvang: 5, chusa: 5, nanhholy: 3 }, out: 1, gold: 300 },
  thientinhchau: { need: { tuhonchau: 1, loithach: 8, huyetngoc: 4 }, out: 1, gold: 5000 },
  phuonghoangvu: { need: { longnhangioi: 1, loithach: 6, huyetngoc: 5, nanhholy: 10 }, out: 1, gold: 6000 },
});

// ── Bảo ngọc (khảm vào trang bị) ──
const GEM_KINDS = {
  hong:  ['Hồng Ngọc', '🔴', 'atk', [6, 14, 28]], lam: ['Lam Ngọc', '🔵', 'hp', [40, 100, 220]],
  luc:   ['Lục Ngọc', '🟢', 'def', [4, 10, 20]],  tu:  ['Tử Ngọc', '🟣', 'mp', [20, 50, 110]],
  hoang: ['Hoàng Ngọc', '🟡', 'crit', [0.02, 0.04, 0.07]], loi: ['Lôi Ngọc', '⚡', 'thunder', [0.04, 0.08, 0.14]],
};
const GRADES = ['Sơ cấp', 'Trung cấp', 'Thượng cấp'];
for (const [k, [name, emoji, stat, vals]] of Object.entries(GEM_KINDS)) {
  vals.forEach((v, g) => {
    ITEMS[`${k}${g + 1}`] = { name: `${name} (${GRADES[g]})`, emoji, type: 'gem', gem: { [stat]: v }, grade: g + 1, price: [400, 1500, 5000][g], lv: 1, shop: g === 0 };
    if (g < 2) RECIPES[`${k}${g + 2}`] = { need: { [`${k}${g + 1}`]: 3 }, out: 1, gold: [200, 800][g] };
  });
}

// ── Đệ tử (nhân vật trong phim) ──
const PETS = {
  vantai:       { name: 'Văn Tài', emoji: '🧑‍🌾', rar: 'R', desc: 'Hậu đậu nhưng 30% lao ra đỡ đòn thay bạn', guard: 0.3 },
  thusinh:      { name: 'Thu Sinh', emoji: '🧑‍🎓', rar: 'R', desc: 'Ra đòn phụ mỗi lượt (50% công)', atk: 0.5 },
  dinhdinh:     { name: 'Nhậm Đình Đình', emoji: '👩', rar: 'SR', desc: 'Hồi 6% HP mỗi lượt', heal: 0.06 },
  tieucuongthi: { name: 'Tiểu Cương Thi', emoji: '🧟', rar: 'SR', desc: 'Cắn 70% công, 15% gây choáng', atk: 0.7, stun: 0.15 },
  cuuvihoco:    { name: 'Cửu Vĩ Hồ Con', emoji: '🦊', rar: 'SSR', desc: 'Hồ hỏa 90% công xuyên giáp, hồi 5 LL/lượt', atk: 0.9, pierce: true, mana: 5 },
  loilongtu:    { name: 'Lôi Long Tử', emoji: '🐲', rar: 'SSR', desc: 'Sét 80% công, 20% choáng, giảm 8% sát thương', atk: 0.8, stun: 0.2, reduce: 0.08 },
};
const PET_COST = 1000;
const petScale = (star, boost = 1, evo = 0) => (1 + 0.2 * (star - 1)) * (1 + 0.25 * evo) * boost;

// ── Thành tựu & danh hiệu (danh hiệu cộng % chỉ số) ──
const ACH = [
  { id: 'kill100', name: 'Thợ Săn Yêu', desc: 'Diệt 100 yêu ma', test: (p) => p.kills >= 100, title: { atk: 0.01 }, gold: 500 },
  { id: 'kill1000', name: 'Sát Yêu Giả', desc: 'Diệt 1.000 yêu ma', test: (p) => p.kills >= 1000, title: { atk: 0.03 }, gold: 5000 },
  { id: 'boss10', name: 'Phá Trận Tiên Phong', desc: 'Hạ 10 boss', test: (p) => p.bossKills >= 10, title: { def: 0.02 }, gold: 2000 },
  { id: 'boss50', name: 'Boss Sát Thủ', desc: 'Hạ 50 boss', test: (p) => p.bossKills >= 50, title: { atk: 0.02, def: 0.02 }, gold: 10000 },
  { id: 'kiep1', name: 'Độ Kiếp Giả', desc: 'Vượt thiên kiếp lần đầu', test: (p) => p.kiepDone >= 1, title: { hp: 0.03 }, gold: 3000 },
  { id: 'kiep4', name: 'Lôi Kiếp Chân Nhân', desc: 'Vượt 4 lần thiên kiếp', test: (p) => p.kiepDone >= 4, title: { hp: 0.05, def: 0.02 }, gold: 20000 },
  { id: 'realm2', name: 'Kết Đan Chân Nhân', desc: 'Đạt cảnh giới Kết Đan', test: (p) => p.realm >= 2, title: { hp: 0.03 }, gold: 8000 },
  { id: 'enh10', name: 'Luyện Khí Sư', desc: 'Cường hóa một món lên +10', test: (p) => Math.max(0, ...Object.values(p.enh)) >= 10, title: { atk: 0.02 }, gold: 5000 },
  { id: 'enh15', name: 'Thần Tượng Cường Hóa', desc: 'Cường hóa một món lên +15', test: (p) => Math.max(0, ...Object.values(p.enh)) >= 15, title: { atk: 0.05 }, gold: 30000 },
  { id: 'honor200', name: 'Võ Đài Anh Hùng', desc: 'Đạt 200 danh vọng', test: (p) => p.honor >= 200, title: { atk: 0.03, def: 0.03 }, gold: 5000 },
  { id: 'duel20', name: 'Bách Chiến Bách Thắng', desc: 'Thắng 20 trận võ đài', test: (p) => p.duelWins >= 20, title: { atk: 0.03 }, gold: 8000 },
  { id: 'pet3', name: 'Sư Phụ Đông Đồ', desc: 'Sưu tập 3 đệ tử', test: (p) => Object.keys(p.pets).length >= 3, title: { hp: 0.02 }, gold: 2000 },
  { id: 'pet6', name: 'Chưởng Môn Đại Đồ', desc: 'Sưu tập đủ 6 đệ tử', test: (p) => Object.keys(p.pets).length >= 6, title: { hp: 0.04, atk: 0.02 }, gold: 15000 },
  { id: 'tower20', name: 'Khách Trấn Yêu Tháp', desc: 'Leo đến tầng 20', test: (p) => p.towerBest >= 20, title: { def: 0.02 }, gold: 5000 },
  { id: 'tower50', name: 'Tháp Chủ', desc: 'Leo đến tầng 50', test: (p) => p.towerBest >= 50, title: { atk: 0.04, def: 0.04 }, gold: 30000 },
  { id: 'wb1', name: 'Dũng Sĩ Đại Chiến', desc: 'Tham gia đánh Boss Thế Giới', test: (p) => p.wbHits >= 1, title: { atk: 0.01 }, gold: 1000 },
  { id: 'wbkill', name: 'Kẻ Kết Liễu', desc: 'Tung đòn kết liễu Boss Thế Giới', test: (p) => p.wbKills >= 1, title: { atk: 0.03 }, gold: 10000 },
  { id: 'guild', name: 'Đệ Tử Tông Môn', desc: 'Gia nhập một tông môn', test: (p) => !!p.guild, title: { hp: 0.01 }, gold: 500 },
  { id: 'grade3', name: 'Thợ Rèn Thần Binh', desc: 'Thăng một món lên phẩm Tiên', test: (p) => Math.max(0, ...Object.values(p.grade)) >= 3, title: { atk: 0.03 }, gold: 15000 },
  { id: 'tech30', name: 'Võ Học Đại Sư', desc: 'Tổng cấp công pháp đạt 30', test: (p) => Object.values(p.tech).reduce((a, b) => a + b, 0) >= 30, title: { hp: 0.03, def: 0.02 }, gold: 10000 },
  { id: 'aff3', name: 'Luyện Khí Tông Sư', desc: 'Một món có 3 dòng tinh luyện', test: (p) => Object.values(p.aff).some((a) => a.length >= 3), title: { atk: 0.02, def: 0.02 }, gold: 8000 },
  { id: 'phe', name: 'Có Chốn Nương Thân', desc: 'Chọn một phe', test: (p) => !!p.fac, title: { hp: 0.01 }, gold: 500 },
  { id: 'vip1', name: 'Quý Nhân', desc: 'Đạt VIP 1', test: (p) => vipLevel(p) >= 1, title: { atk: 0.02, def: 0.02 }, gold: 0 },
  { id: 'skl10', name: 'Tuyệt Kỹ Đại Sư', desc: 'Luyện một tuyệt kỹ lên cấp 10', test: (p) => Object.values(p.skl || {}).some((v) => v >= 10), title: { atk: 0.03 }, gold: 8000 },
  { id: 'rich', name: 'Đại Gia Mao Sơn', desc: 'Sở hữu 100.000 vàng', test: (p) => p.gold >= 100000, title: { def: 0.02 }, gold: 0 },
];
// ── Phe phái ──
const FACTIONS = {
  chinh: { name: 'Chính Đạo', emoji: '☀️', desc: 'Chính khí lẫm liệt, trừ tà vệ đạo.\n┗ +6% HP, +4% thủ, giảm 3% sát thương nhận, +12% sát thương lên ma/quỷ/cương thi', bonus: { hp: 0.06, def: 0.04 }, perk: { reduce: 0.03 }, vsUndead: 0.12 },
  ma: { name: 'Ma Đạo', emoji: '🌑', desc: 'Ngược đời nghịch thiên, đánh nhanh thắng nhanh.\n┗ +7% công, +5% chí mạng, hút 3% máu', bonus: { atk: 0.07 }, perk: { crit: 0.05, lifesteal: 0.03 } },
  tieudao: { name: 'Tiêu Dao', emoji: '🍃', desc: 'Phóng khoáng tự tại, không ràng buộc.\n┗ +4% mọi chỉ số, +3% né, +10% EXP, +15% vàng nhận được', bonus: { atk: 0.04, def: 0.04, hp: 0.04 }, perk: { dodge: 0.03 }, exp: 0.1, gold: 0.15 },
};
const FAC_CHANGE_COST = 20000, FAC_CHANGE_CD = 3 * 24 * 3600 * 1000, FAC_LEAD_BONUS = 0.03;
function fpSync() {
  if (!db.fp) db.fp = { chinh: 0, ma: 0, tieudao: 0 };
  if (!db.fpStart || Date.now() - db.fpStart > 7 * 24 * 3600 * 1000) { db.fp = { chinh: 0, ma: 0, tieudao: 0 }; db.fpStart = Date.now(); }
}
function leadingFaction() {
  fpSync();
  const e = Object.entries(db.fp).sort((a, b) => b[1] - a[1]);
  return e[0] && e[0][1] > 0 && (!e[1] || e[0][1] > e[1][1]) ? e[0][0] : null;
}

// ── VIP & Nguyên Bảo ──
const VIP_STEPS = [0, 100, 500, 1500, 5000, 15000]; // điểm VIP cộng dồn (chỉ tính khi admin nạp Nguyên Bảo)
const VIP_PERK = {
  exp: [0, 0.05, 0.1, 0.15, 0.2, 0.3], gold: [0, 0.05, 0.1, 0.15, 0.2, 0.3], disc: [0, 0, 0.05, 0.08, 0.1, 0.15],
  stat: [0, 0, 0.01, 0.02, 0.03, 0.05], slots: [0, 2, 4, 6, 8, 10], med: [10, 10, 8, 6, 5, 3], wb: [180, 180, 150, 120, 90, 60],
};
const vipLevel = (p) => { let l = 0; for (let i = 1; i < VIP_STEPS.length; i++) if ((p.vipPts || 0) >= VIP_STEPS[i]) l = i; return l; };
const expMul = (p) => 1 + (FACTIONS[p.fac]?.exp || 0) + (CLASSES[p.cls]?.expBonus || 0) + VIP_PERK.exp[vipLevel(p)] + buffVal(p, 'exp');
const goldMul = (p) => 1 + (FACTIONS[p.fac]?.gold || 0) + (CLASSES[p.cls]?.goldBonus || 0) + VIP_PERK.gold[vipLevel(p)] + buffVal(p, 'gold');
const priceFor = (p, it) => Math.max(1, Math.round(it.price * (1 - VIP_PERK.disc[vipLevel(p)])));
const meditateCd = (p) => VIP_PERK.med[vipLevel(p)] * 60000;
const wbHitCd = (p) => VIP_PERK.wb[vipLevel(p)] * 1000;

const titleBonus = (p) => (p.title && p.ach?.[p.title] ? ACH.find((a) => a.id === p.title)?.title || {} : {});
const titleName = (p) => (p.title && p.ach?.[p.title] ? ACH.find((a) => a.id === p.title)?.name : null);
const GUILD_BONUS = 0.015, GUILD_MAX_LV = 10, GUILD_MAX_MEMBERS = 30, GUILD_COST = 5000;
const guildBonus = (p) => { const g = p.guild && db.guilds?.[p.guild]; return g ? GUILD_BONUS * g.lv : 0; };

const TYPE_INFO = {
  weapon: ['⚔️', 'Vũ khí'], armor: ['🥋', 'Giáp / Đạo bào'], treasure: ['🔱', 'Pháp bảo'], charm: ['🧧', 'Bùa hộ thân'],
  acc: ['📿', 'Pháp khí'], chest: ['🎁', 'Rương'], badge: ['🎖️', 'Lệnh bài phe'], gem: ['💎', 'Bảo ngọc'], potion: ['💊', 'Đan dược'], talisman: ['📜', 'Phù chú & trừ tà'], material: ['🧪', 'Nguyên liệu'],
};
const SLOT_OF = { weapon: 'weapon', armor: 'armor', treasure: 'treasure', charm: 'charm', badge: 'badge', acc: 'accessory' };
const SLOT_NAME = { weapon: '⚔️ Vũ khí', armor: '🥋 Giáp', treasure: '🔱 Pháp bảo', charm: '🧧 Bùa hộ thân', badge: '🎖️ Lệnh bài phe', accessory: '📿 Pháp khí' };
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
const DB_FILE = path.join(__dirname, 'daosi-data.json'); // file riêng, không đụng file của bot khác
const OLD_DB_FILE = path.join(__dirname, 'data.json');   // file của các bản v2/v3.0 (nếu có)
const BACKUP_DIR = path.join(__dirname, 'backups');
const freshDb = () => ({ players: {}, guilds: {}, market: { next: 1, list: {} }, wb: { active: false, endedAt: 0 }, fp: { chinh: 0, ma: 0, tieudao: 0 }, fpStart: Date.now() });
const looksValid = (d) => d && typeof d === 'object' && !Array.isArray(d) && d.players && typeof d.players === 'object' && !Array.isArray(d.players);
const listBackups = () => {
  try { return fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('daosi-') && f.endsWith('.json')).sort().reverse().map((f) => path.join(BACKUP_DIR, f)); } catch { return []; }
};
function loadDb() {
  for (const file of [DB_FILE, ...listBackups(), OLD_DB_FILE]) {
    if (!fs.existsSync(file)) continue;
    try {
      const d = JSON.parse(fs.readFileSync(file, 'utf8'));
      const ours = looksValid(d) && Object.values(d.players).every((x) => x && typeof x === 'object' && CLASSES[x.cls]);
      if (ours) {
        if (file !== DB_FILE) console.log(`📦 Đã khôi phục dữ liệu từ ${path.basename(file)}`);
        return d;
      }
      console.warn(`⚠️ ${path.basename(file)} không phải dữ liệu của Đạo Sĩ Bot nên được bỏ qua (giữ nguyên file).`);
    } catch (e) {
      if (file === DB_FILE) { try { fs.copyFileSync(file, `${file}.hong-${Date.now()}`); } catch { /* bỏ qua */ } }
      console.warn(`⚠️ ${path.basename(file)} bị hỏng (${e.message}). Thử bản sao lưu gần nhất...`);
    }
  }
  return freshDb();
}
let db = loadDb();
const base = freshDb();
for (const k of Object.keys(base)) db[k] ??= base[k];

let saveTimer = null, dirty = false, lastSaved = Date.now();
function writeDb() { // ghi nguyên tử: ghi file tạm rồi đổi tên, tránh hỏng file khi bot bị tắt giữa chừng
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
  dirty = false; lastSaved = Date.now();
}
function save() {
  dirty = true; clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { writeDb(); } catch (e) { console.error('⚠️ Lỗi lưu dữ liệu:', e.message); } }, 500);
}
function saveNow() { try { writeDb(); } catch (e) { console.error('⚠️ Lỗi lưu dữ liệu:', e.message); } }
function backup(tag = 'auto') {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    writeDb();
    const name = `daosi-${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}.json`;
    fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, name));
    const all = listBackups().reverse(); // cũ → mới, giữ tối đa 48 bản
    while (all.length > 48) fs.unlinkSync(all.shift());
    return name;
  } catch (e) { console.error('⚠️ Lỗi sao lưu:', e.message); return null; }
}
setInterval(() => { if (dirty) saveNow(); }, 60 * 1000).unref();        // tự lưu mỗi phút nếu có thay đổi
setInterval(() => backup('auto'), 30 * 60 * 1000).unref();             // sao lưu mỗi 30 phút
process.on('SIGINT', () => { saveNow(); process.exit(0); });
process.on('SIGTERM', () => { saveNow(); process.exit(0); });

// Nâng cấp dữ liệu cũ (v2 → v3)
function migrate(p) {
  if (p.quest && !p.quest.type) { // chuyển nhiệm vụ kiểu cũ sang kiểu mới
    const o = p.quest;
    p.quest = { type: 'kill', need: o.need, done: o.done, realm: Math.min(p.realm || 0, 5), cls: p.cls, giver: 'Cửu Thúc', text: `Diệt ${o.need} yêu ma`, t: Date.now(), reward: { gold: o.gold || 300, exp: o.exp || 100, items: [], nb: 0 } };
  }
  p.inv ??= {}; p.equip ??= {}; p.buffs ??= {}; p.skl ??= {}; p.equip.badge ??= null; p.fac ??= null; p.facAt ??= 0; p.nb ??= 0; p.vipPts ??= 0; p.lastVip ??= 0; p.vd ??= 0; p.tl ??= 0; p.gp ??= 0; p.aff ??= {}; p.grade ??= {}; p.tech ??= {}; p.shopLog ??= { day: 0, counts: {} };
  p.enh ??= {}; p.lastKiep ??= 0; p.kiepDone ??= 0; p.gems ??= {}; p.pets ??= {}; p.pet ??= null; p.honor ??= 0; p.pity ??= 0; p.lastDuel ??= 0; p.title ??= null; p.ach ??= {}; p.guild ??= null; p.contrib ??= 0; p.towerBest ??= 0; p.duelWins ??= 0; p.wbHits ??= 0; p.wbKills ??= 0; p.lastWb ??= 0;
  p.realm ??= Math.min(5, Math.floor(p.level / 10));
  p.equip.treasure ??= null; p.equip.charm ??= null;
  for (const id of Object.keys(p.inv)) if (!ITEMS[id]) delete p.inv[id];
  for (const [slot, id] of Object.entries(p.equip)) {
    if (!id) continue;
    if (!ITEMS[id]) p.equip[slot] = null;
    else if ((ITEMS[id].cls && ITEMS[id].cls !== p.cls) || (ITEMS[id].fac && ITEMS[id].fac !== p.fac)) { p.inv[id] = (p.inv[id] || 0) + 1; p.equip[slot] = null; }
  }
  return p;
}
for (const [id, pl] of Object.entries(db.players)) { if (!pl || !CLASSES[pl.cls]) delete db.players[id]; else migrate(pl); }

/* ═══════════════════════════ NHÂN VẬT ═══════════════════════════ */
const enhOf = (p, id) => p.enh[id] || 0;
const gradeOf = (p, id) => p.grade?.[id] || 0;
const label = (id) => `${ITEMS[id].emoji} ${ITEMS[id].name}`;
const dname = (p, id) => `${gradeOf(p, id) ? `${GRADE_Q[gradeOf(p, id)].emoji} ` : ''}${enhOf(p, id) ? `**+${enhOf(p, id)}** ` : ''}${label(id)}`;
const count = (p, id) => p.inv[id] || 0;
const addItem = (p, id, n = 1) => { p.inv[id] = count(p, id) + n; };
function removeItem(p, id, n = 1) { p.inv[id] = count(p, id) - n; if (p.inv[id] <= 0) delete p.inv[id]; }
const owns = (p, id) => count(p, id) > 0 || Object.values(p.equip).includes(id);
const canEnhance = (id) => ITEMS[id] && SLOT_OF[ITEMS[id].type];
const socketsOf = (id) => (ITEMS[id].tier !== undefined ? Math.min(3, 1 + Math.floor(ITEMS[id].tier / 2)) : 1);
function gemStats(p, id) {
  const r = { atk: 0, def: 0, hp: 0, mp: 0, perk: {} };
  for (const gid of (p.gems?.[id] || [])) {
    for (const [k, v] of Object.entries(ITEMS[gid].gem)) { if (k in r && k !== 'perk') r[k] += v; else r.perk[k] = (r.perk[k] || 0) + v; }
  }
  return r;
}
function releaseGems(p, id) { for (const g of (p.gems?.[id] || [])) addItem(p, g); if (p.gems) delete p.gems[id]; }
const gemIcons = (p, id) => { const a = p.gems?.[id] || []; return ` ${a.map((g) => ITEMS[g].emoji).join('')}${'⬜'.repeat(Math.max(0, socketsOf(id) - a.length))}`; };

function stats(p) {
  const c = CLASSES[p.cls], l = p.level - 1, rm = 1 + 0.1 * p.realm; // mỗi cảnh giới +10% chỉ số gốc
  const s = {
    maxHp: Math.round((c.hp + l * c.g.hp) * rm), maxMp: Math.round((c.mp + l * c.g.mp) * rm),
    atk: Math.round((c.atk + l * c.g.atk) * rm), def: Math.round((c.def + l * c.g.def) * rm),
  };
  for (const id of Object.values(p.equip)) {
    if (!id) continue;
    const it = ITEMS[id], m = (1 + 0.12 * enhOf(p, id)) * GRADE_Q[gradeOf(p, id)].mult;
    s.atk += Math.round((it.atk || 0) * m); s.def += Math.round((it.def || 0) * m);
    s.maxHp += Math.round((it.hp || 0) * m); s.maxMp += Math.round((it.mp || 0) * m);
    const gb = gemStats(p, id);
    s.atk += gb.atk; s.def += gb.def; s.maxHp += gb.hp; s.maxMp += gb.mp;
  }
  const tb = titleBonus(p), fb = FACTIONS[p.fac]?.bonus || {}, ex = extraTotals(p);
  const gen = guildBonus(p) + VIP_PERK.stat[vipLevel(p)] + (p.fac && leadingFaction() === p.fac ? FAC_LEAD_BONUS : 0);
  s.atk = Math.round(s.atk * (1 + (tb.atk || 0) + (fb.atk || 0) + ex.atk + gen)); s.def = Math.round(s.def * (1 + (tb.def || 0) + (fb.def || 0) + ex.def + gen));
  s.maxHp = Math.round(s.maxHp * (1 + (tb.hp || 0) + (fb.hp || 0) + ex.hp + gen));
  return s;
}

// Hiệu ứng đặc biệt của pháp bảo / bùa (tăng 5% mỗi cấp cường hóa)
function perks(p) {
  const r = { crit: 0, dodge: 0, reduce: 0, lifesteal: 0, thorns: 0, stun: 0, thunder: 0, regen: 0 };
  for (const id of Object.values(p.equip)) {
    if (!id) continue;
    const pk = ITEMS[id].perk;
    if (pk) {
      const k = 1 + 0.05 * enhOf(p, id);
      for (const [key, v] of Object.entries(pk)) r[key] += key === 'regen' ? Math.round(v * k) : v * k;
    }
    for (const [key, v] of Object.entries(gemStats(p, id).perk)) r[key] += v;
  }
  for (const [key, v] of Object.entries(FACTIONS[p.fac]?.perk || {})) r[key] += v;
  for (const [key, v] of Object.entries(CLASSES[p.cls]?.perk || {})) r[key] += v;
  for (const [key, v] of Object.entries(extraTotals(p).perk)) r[key] += v;
  r.dodge = Math.min(r.dodge, 0.4); r.reduce = Math.min(r.reduce, 0.5); r.regen = Math.round(r.regen);
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
  if (it.gem) for (const [k, v] of Object.entries(it.gem)) parts.push(PERK_TEXT[k] ? PERK_TEXT[k](v) : `+${v} ${{ atk: 'CÔNG', def: 'THỦ', hp: 'HP', mp: 'LL' }[k]}`);
  if (it.perk) parts.push(perkText(it.perk));
  if (it.desc) parts.push(it.desc);
  return parts.join(', ');
}

function newPlayer(cls, name) {
  const p = {
    name, cls, level: 1, exp: 0, realm: 0, gold: 200,
    inv: { linhdan: 3, phutranthi: 2, gaoep: 2 },
    equip: { weapon: null, armor: null, treasure: null, charm: null, badge: null, accessory: null },
    enh: {}, buffs: {}, skl: {}, fac: null, facAt: 0, nb: 0, vipPts: 0, lastVip: 0, vd: 0, tl: 0, gp: 0, aff: {}, grade: {}, tech: {}, shopLog: { day: 0, counts: {} }, gems: {}, pets: {}, pet: null, honor: 0, pity: 0, lastDuel: 0, title: null, ach: {}, guild: null, contrib: 0, towerBest: 0, duelWins: 0, wbHits: 0, wbKills: 0, lastWb: 0, hp: 0, mp: 0, kills: 0, deaths: 0, bossKills: 0, kiepDone: 0,
    streak: 0, lastDaily: 0, lastMeditate: 0, lastKiep: 0, quest: null,
  };
  if (cls === 'nguthi') { p.pets.tieucuongthi = { star: 1 }; p.pet = 'tieucuongthi'; }
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

  const usable = Object.keys(p.inv).filter((id) => ITEMS[id].use && !ITEMS[id].use.exp && !ITEMS[id].use.box && !ITEMS[id].use.buff && (!ITEMS[id].cls || ITEMS[id].cls === p.cls));
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
      { name: `Yêu ma • ${mapLabel(f)}`, value: `${bar(f.mHp, m.hp)} ${fmt(Math.max(0, f.mHp))}/${fmt(m.hp)} HP`, inline: false },
      { name: `${p.name}${p.pet && p.pets[p.pet] ? ` & ${PETS[p.pet].emoji}${PETS[p.pet].name}` : ''} • Lượt ${f.turn} ${f.shield?.t > 0 ? '🛡️' : ''}`, value: `❤️ ${bar(p.hp, s.maxHp)} ${fmt(p.hp)}/${fmt(s.maxHp)}\n🔷 ${bar(p.mp, s.maxMp)} ${fmt(p.mp)}/${fmt(s.maxMp)}`, inline: false },
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

function resolveDrop(key, cls, fac) {
  if (!key.includes(':')) return key;
  const [type, idx] = key.split(':');
  if (type === 'badge') return FAC_GEAR[fac]?.[+idx]?.[0];
  return gearId(cls, type, +idx);
}

function winRewards(p, f) {
  const m = f.m, gold = Math.round(rand(m.gold[0], m.gold[1]) * goldMul(p)), expGain = Math.round(m.exp * expMul(p));
  const lines = [`💰 +${fmt(gold)} vàng`, `✨ +${fmt(expGain)} EXP${expMul(p) > 1 ? ` (x${expMul(p).toFixed(2)})` : ''}`];
  p.gold += gold; p.kills++;
  if (f.tower) p.towerBest = Math.max(p.towerBest, f.floor);
  if (f.tower) { const tl = f.floor % 10 === 0 ? 5 : 1; p.tl += tl; lines.push(`🗼 +${tl} Tháp Lệnh`); }
  if (f.tower && f.floor % 10 === 0) { p.nb += 10; lines.push('💎 +10 Nguyên Bảo (boss tháp)'); }
  if (p.fac) { fpSync(); db.fp[p.fac] += f.boss ? 5 : 1; }
  if (f.boss) p.bossKills++;
  const drops = [...m.drops, ['linhthach', f.boss ? 1 : 0.12, f.boss ? 3 : 1]];
  for (const [key, chance, max = 1] of drops) {
    if (Math.random() >= Math.min(1, chance * (1 + (CLASSES[p.cls].dropBonus || 0) + buffVal(p, 'drop')))) continue;
    const id = resolveDrop(key, p.cls, p.fac);
    if (!id) continue;
    const n = max > 1 ? rand(1, max) : 1;
    addItem(p, id, n); questProg(p, 'drop', n);
    lines.push(`🎁 Nhặt được ${label(id)}${n > 1 ? ` x${n}` : ''}`);
  }
  if (!f.tower && Math.random() < 0.1) lines.push(randomEvent(p));
  if (Math.random() < (f.boss ? 0.35 : 0.06)) {
    const grade = f.boss ? (Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1) : (Math.random() < 0.08 ? 2 : 1);
    const gid = `${pick(Object.keys(GEM_KINDS))}${grade}`;
    addItem(p, gid); lines.push(`🎁 Nhặt được bảo ngọc ${label(gid)}`);
  }
  const ups = gainExp(p, expGain);
  if (ups) lines.push(`🎉 **LÊN CẤP ${p.level}!** HP và linh lực hồi đầy.`);
  if (atBottleneck(p)) lines.push(`⚡ **Bạn đã chạm bình cảnh ${REALMS[p.realm]}!** Hãy dùng \`/dokiep\` để đột phá.`);
  questProg(p, 'kill', 1, { map: f.map, tower: f.tower });
  if (m.undead) questProg(p, 'undead');
  if (f.boss) questProg(p, 'boss');
  questProg(p, 'gold', gold);
  if (f.tower) questProg(p, 'tower');
  const ql = questLine(p); if (ql) lines.push(ql);
  return lines.join('\n');
}

function act(p, f, action) {
  const s = stats(p), pk = perks(p), m = f.m, cls = CLASSES[p.cls], log = [];
  const critC = 0.15 + pk.crit;
  const pet = p.pet && p.pets?.[p.pet] ? { ...PETS[p.pet], star: p.pets[p.pet].star, evo: p.pets[p.pet].evo || 0, boost: CLASSES[p.cls].petBoost || 1 } : null;
  const heal = (n) => { const b = p.hp; p.hp = Math.min(s.maxHp, p.hp + n); return p.hp - b; };
  const hit = (mult = 1, ignoreDef = false, ls = 0) => {
    const r = calcDmg(s.atk, m.def, { mult: mult * (m.undead ? 1 + (FACTIONS[p.fac]?.vsUndead || 0) : 1), ignoreDef, critC });
    f.mHp -= r.dmg; if (r.crit) questProg(p, 'crit');
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
  const stunMonster = (n) => { questProg(p, 'stun'); f.stun = Math.max(f.stun, f.boss ? Math.min(n, 1) : n); };
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
    p.mp -= sk.cost; questProg(p, 'skill');
    const hits = sk.hits || 1; let total = 0, crits = 0;
    for (let h = 0; h < hits; h++) { const r = hit(skillMult(p, sk) * (m.undead && sk.vsUndead ? sk.vsUndead : 1), sk.ignoreDef, sk.lifesteal || 0); total += r.dmg; if (r.crit) crits++; }
    log.push(`✨ **${sk.name}**${hits > 1 ? ` (${hits} đòn)` : ''}: **${total}** sát thương${crits ? ` 💥x${crits}` : ''}`);
    thunder();
    if (sk.heal) questProg(p, 'heal');
    if (sk.heal) log.push(`💚 Hồi **${heal(Math.round(s.maxHp * sk.heal))}** HP`);
    if (sk.stun && Math.random() < sk.stun) { stunMonster(1); log.push(`💫 ${m.name} choáng váng!`); }
    if (sk.burn) { questProg(p, 'burn'); f.burn = { d: Math.max(1, Math.round(s.atk * sk.burn.atkPct)), t: sk.burn.t }; log.push(`🔥 ${m.name} bốc cháy!`); }
    if (sk.shield) { f.shield = { ...sk.shield }; log.push(`🛡️ Kim quang hộ thể, giảm ${pct(sk.shield.pct)} sát thương!`); }
    if (sk.curse) { f.curse = { ...sk.curse }; log.push(`☠️ ${m.name} bị nguyền rủa, yếu đi ${pct(sk.curse.pct)} sức mạnh!`); }
  } else if (action === 'run') {
    if (Math.random() < 0.5) { f.over = 'flee'; f.log = ['🏃 Bạn nín thở, lẻn đi trót lọt!']; return {}; }
    log.push('🏃 Chạy không thoát! Yêu ma đuổi sát!');
  } else if (action.startsWith('use:')) {
    const id = action.slice(4), it = ITEMS[id], u = it?.use;
    if (!u || !count(p, id)) return { error: '❌ Bạn không có vật phẩm này!' };
    if (it.cls && it.cls !== p.cls) return { error: '⛔ Vật phẩm này dành cho môn phái khác.' };
    removeItem(p, id); if (it.type === 'talisman') questProg(p, 'talisman');
    log.push(`${it.emoji} Bạn dùng **${it.name}**:`);
    if (u.heal || u.healPct) questProg(p, 'heal');
    if (u.heal) log.push(`💊 Hồi **${heal(Math.round(u.heal * (cls.potBoost || 1)))}** HP`);
    if (u.healPct) log.push(`💚 Hồi **${heal(Math.round(s.maxHp * u.healPct))}** HP`);
    if (u.mana) { const b = p.mp; p.mp = Math.min(s.maxMp, p.mp + u.mana); log.push(`🔷 Hồi **${p.mp - b}** linh lực`); }
    if (u.stun) { stunMonster(u.stun); log.push(`📜 ${m.name} bị định thân!`); }
    if (u.shield) { f.shield = { ...u.shield }; log.push(`🛡️ Giảm ${pct(u.shield.pct)} sát thương trong ${u.shield.t} lượt`); }
    if (u.burn) { questProg(p, 'burn'); f.burn = { d: Math.max(1, Math.round(s.atk * u.burn.atkPct)), t: u.burn.t }; log.push(`🔥 ${m.name} bốc cháy!`); }
    if (u.dmg || u.dmgAtk) {
      let d = u.dmgAtk ? Math.round(s.atk * u.dmgAtk) : u.dmg + (u.perLevel || 0) * p.level;
      if (u.undeadOnly && !m.undead) d = u.fallback;
      f.mHp -= d;
      log.push(`💥 ${m.name} chịu **${d}** sát thương${u.undeadOnly && m.undead ? ' (bốc khói nghi ngút!)' : ''}`);
    }
    if (u.flee) { f.over = 'flee'; f.log = [`${it.emoji} Bạn dùng **${it.name}**, độn thổ biến mất!`]; return {}; }
  }

  if (winNow()) return {};

  // Đệ tử hỗ trợ
  if (pet) {
    const sc = petScale(pet.star, pet.boost, pet.evo);
    if (pet.atk) {
      const d = Math.max(1, Math.round(s.atk * pet.atk * sc * (0.9 + Math.random() * 0.2) - (pet.pierce ? 0 : m.def * 0.3)));
      f.mHp -= d;
      log.push(`${pet.emoji} **${pet.name}** ra đòn, gây **${d}** sát thương`);
      if (pet.stun && Math.random() < pet.stun) { stunMonster(1); log.push(`💫 ${m.name} bị ${pet.name} làm choáng!`); }
      if (winNow()) return {};
    }
    if (pet.heal) { const h = heal(Math.round(s.maxHp * pet.heal * sc)); if (h > 0) log.push(`${pet.emoji} **${pet.name}** chữa thương, hồi **${h}** HP`); }
    if (pet.mana) p.mp = Math.min(s.maxMp, p.mp + pet.mana);
  }

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
  } else if (pet?.guard && Math.random() < pet.guard * petScale(pet.star, pet.boost, pet.evo)) {
    log.push(`${pet.emoji} **${pet.name}** lao ra đỡ đòn thay bạn! (hậu đậu nhưng dũng cảm)`);
  } else if (Math.random() < pk.dodge) {
    log.push(`💨 Bạn né được đòn của ${m.name}!`);
  } else {
    const crit = Math.random() < 0.1;
    let d = (m.atk * (0.85 + Math.random() * 0.3) - s.def * 0.5) * (crit ? 1.5 : 1);
    d *= 1 - pk.reduce - (pet?.reduce ? pet.reduce * petScale(pet.star, pet.boost, pet.evo) : 0);
    if (f.shield?.t > 0) d *= 1 - f.shield.pct;
    if (f.curse?.t > 0) d *= 1 - f.curse.pct;
    d = Math.max(1, Math.round(d));
    p.hp -= d;
    log.push(`${m.emoji} ${m.name} vồ trúng bạn, gây **${d}** sát thương${crit ? ' 💥' : ''}`);
    if (p.hp <= 0 && count(p, 'hoanmenhphu') > 0) {
      removeItem(p, 'hoanmenhphu'); p.hp = Math.round(s.maxHp * 0.4);
      log.push('💫 **Hoàn Mệnh Phù** phát sáng, kéo bạn trở về từ cõi chết! (hồi 40% HP)');
    } else if (p.hp <= 0) {
      p.deaths++;
      const lost = f.tower ? 0 : Math.floor(p.gold * 0.1);
      p.gold -= lost;
      p.hp = Math.max(1, Math.ceil(s.maxHp * 0.3));
      f.over = 'lose'; f.log = [...log, '💀 Bạn ngất đi...'];
      f.rewards = f.tower ? 'Bạn bị đánh bật khỏi tháp, không mất vàng. Hồi lại 30% HP.' : `Cửu Thúc cõng bạn về miếu. Mất **${fmt(lost)}** vàng tiền thuốc, hồi lại 30% HP.`;
      return {};
    }
    if (pk.thorns) {
      const r = Math.round(d * pk.thorns);
      if (r > 0) { f.mHp -= r; log.push(`🪞 Pháp bảo phản lại **${r}** sát thương!`); if (winNow()) return {}; }
    }
  }
  if (f.shield?.t > 0) f.shield.t--;
  if (f.curse?.t > 0) f.curse.t--;
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
  if (it.fac && it.fac !== p.fac) return `⛔ Món này dành riêng cho phe ${FACTIONS[it.fac].name}.`;
  if (it.lv && p.level < it.lv) return `⛔ ${label(id)} yêu cầu cấp **${it.lv}**.`;
  const total = priceFor(p, it) * qty;
  if (p.gold < total) return `💸 Không đủ vàng! Cần **${fmt(total)}**, bạn có **${fmt(p.gold)}**.`;
  p.gold -= total; addItem(p, id, qty); save();
  return `✅ Đã mua **${qty}x ${label(id)}** với giá **${fmt(total)}** vàng. (Còn ${fmt(p.gold)} 🪙)`;
}

function shopView(p, uid, cat = 'weapon') {
  const list = Object.entries(ITEMS).filter(([, it]) => it.shop && it.type === cat && (!it.cls || it.cls === p.cls) && (!it.fac || it.fac === p.fac));
  const lines = list.map(([, it]) => `${it.emoji} **${it.name}** – ${fmt(priceFor(p, it))}🪙${it.lv > 1 ? ` (Lv${it.lv})` : ''}${statText(it) ? `\n┗ *${statText(it)}*` : ''}`);
  const e = embed(0xe67e22).setTitle(`🏮 Tiệm Cửu Thúc • ${TYPE_INFO[cat][0]} ${TYPE_INFO[cat][1]}`)
    .setDescription(`💰 Bạn có **${fmt(p.gold)}** vàng • Môn phái: ${CLASSES[p.cls].emoji} ${CLASSES[p.cls].name}\n*Đồ bậc cao hơn không bán – hãy săn boss hoặc \`/chetao\`.*\n\n${lines.join('\n') || '*Hết hàng*'}`);
  const catMenu = new StringSelectMenuBuilder().setCustomId(`shopcat:${uid}`).setPlaceholder('📂 Chọn danh mục')
    .addOptions(Object.entries(TYPE_INFO).filter(([k]) => Object.values(ITEMS).some((x) => x.shop && x.type === k)).map(([value, [emoji, name]]) => ({ label: name, value, emoji, default: value === cat })));
  const rows = [row(catMenu)];
  if (list.length) {
    rows.push(row(new StringSelectMenuBuilder().setCustomId(`shop:${uid}`).setPlaceholder('🛒 Chọn món để mua (1 cái)...')
      .addOptions(list.slice(0, 25).map(([value, it]) => ({ label: it.name, value, emoji: it.emoji, description: `${fmt(priceFor(p, it))} vàng${it.lv > 1 ? ` • Lv${it.lv}` : ''}` })))));
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
    p.enh[id] = t; questProg(p, 'enhance');
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
      if (!owns(p, id)) { delete p.enh[id]; delete p.aff[id]; delete p.grade[id]; releaseGems(p, id); }
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
      p.gold += gold; addItem(p, 'linhthach', stones); p.nb += 30;
      const ns = stats(p); p.hp = ns.maxHp; p.mp = ns.maxMp;
      const ups = gainExp(p, 0);
      lines.push(`🌈 **VƯỢT KIẾP THÀNH CÔNG!**`);
      const e = embed(0xf1c40f).setTitle(`🌟 Đột phá cảnh giới ${REALMS[p.realm]}!`)
        .setDescription(`${lines.slice(-4).join('\n')}\n\n✨ Toàn bộ chỉ số gốc **+10%**\n💰 +${fmt(gold)} vàng • 💠 +${stones} Linh Thạch • 💎 +30 Nguyên Bảo\n❤️ HP & linh lực hồi đầy${ups ? `\n🎉 Lên cấp ${p.level}!` : ''}\nCấp tối đa mới: **${capOf(p)}**`);
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

/* ═══════════════════════════ ĐỆ TỬ (TRIỆU HỒI) ═══════════════════════════ */
function summonOnce(p) {
  p.pity++;
  const r = Math.random();
  const rar = p.pity >= 30 || r < 0.1 ? 'SSR' : r < 0.4 ? 'SR' : 'R';
  if (rar === 'SSR') p.pity = 0;
  const id = pick(Object.keys(PETS).filter((k) => PETS[k].rar === rar));
  const cur = p.pets[id];
  let note;
  if (!cur) { p.pets[id] = { star: 1 }; note = '✨ MỚI!'; }
  else if (cur.star < 5) { cur.star++; note = `⭐ lên ${cur.star} sao`; }
  else { addItem(p, 'linhthach', 3); note = 'đã max sao → +3 💠'; }
  if (!p.pet) p.pet = id;
  return { id, rar, note };
}

function petView(p, uid) {
  const lines = Object.entries(PETS).map(([id, d]) => {
    const own = p.pets[id];
    return `${p.pet === id ? '▶️' : '▫️'} ${d.emoji} **${d.name}** \`${d.rar}\` ${own ? '⭐'.repeat(own.star) + (own.evo ? ` 🔱${own.evo}` : '') : '❓ chưa có'}\n┗ *${d.desc}*`;
  });
  const e = embed(0x16a085).setTitle('🧑‍🤝‍🧑 Đệ tử của bạn')
    .setDescription(`${lines.join('\n')}\n\n🔱 Đủ 5 sao có thể **Tiến hóa** (3 cấp, mỗi cấp +25% sức mạnh).\n🎲 Triệu hồi: \`/trieuhoi\` (${fmt(PET_COST)}🪙/lần) • Bảo đảm SSR sau 30 lần (đã ${p.pity}/30)\n⭐ Trùng đệ tử → tăng sao (tối đa 5), mỗi sao +20% hiệu quả.`);
  const owned = Object.keys(p.pets);
  const comps = [];
  if (owned.length) {
    comps.push(row(new StringSelectMenuBuilder().setCustomId(`petset:${uid}`).setPlaceholder('Chọn đệ tử đồng hành...')
      .addOptions([...owned.map((id) => ({ label: `${PETS[id].name} ${'⭐'.repeat(p.pets[id].star)}${p.pets[id].evo ? ` 🔱${p.pets[id].evo}` : ''}`, value: id, emoji: PETS[id].emoji, default: p.pet === id })),
        { label: 'Cất đệ tử đi', value: 'none', emoji: '🚫' }])));
    const evoable = owned.filter((id) => p.pets[id].star >= 5 && (p.pets[id].evo || 0) < 3);
    if (evoable.length) {
      comps.push(row(new StringSelectMenuBuilder().setCustomId(`petevo:${uid}`).setPlaceholder('🔱 Tiến hóa đệ tử (cần đủ 5 sao)...')
        .addOptions(evoable.map((id) => { const c = PET_EVO[p.pets[id].evo || 0]; return { label: `Tiến hóa ${PETS[id].name} → cấp ${(p.pets[id].evo || 0) + 1}`.slice(0, 100), value: id, emoji: PETS[id].emoji, description: evoCostText(c).slice(0, 100) }; }))));
    }
  }
  return { content: '', embeds: [e], components: comps };
}

/* ═══════════════════════════ VÕ ĐÀI PvP ═══════════════════════════ */
const pendingDuels = new Map();
const PVP_DMG = 0.45; // sát thương PvP thấp hơn PvE để trận đấu kéo dài, có chiến thuật

function simulateDuel(pa, pb) {
  const mk = (p) => { const s = stats(p); return { p, s, pk: perks(p), hp: s.maxHp, mp: s.maxMp, stun: 0, shield: null, burn: null, name: p.name }; };
  const A = mk(pa), B = mk(pb), log = [];
  const turn = (X, Y) => {
    if (X.burn?.t > 0) { X.hp -= X.burn.d; X.burn.t--; log.push(`🔥 **${X.name}** bị thiêu đốt **-${X.burn.d}**`); if (X.hp <= 0) return; }
    if (X.stun > 0) { X.stun--; X.imm = 2; log.push(`💫 **${X.name}** choáng váng, mất lượt!`); return; }
    if (X.imm > 0) X.imm--; // sau khi bị choáng được miễn choáng một vòng (chống khóa choáng)
    const skills = CLASSES[X.p.cls].skills.filter((sk) => X.p.level >= sk.lv && X.mp >= sk.cost);
    const sk = skills.length && Math.random() < 0.7 ? (Math.random() < 0.6 ? skills[skills.length - 1] : pick(skills)) : null;
    if (sk) X.mp -= sk.cost;
    if (Math.random() < Y.pk.dodge) { log.push(`💨 **${Y.name}** né được đòn của **${X.name}**!`); return; }
    const hits = sk?.hits || 1; let total = 0, crit = 0;
    for (let h = 0; h < hits; h++) {
      const r = calcDmg(X.s.atk, Y.s.def, { mult: sk ? skillMult(X.p, sk) : 1, ignoreDef: sk?.ignoreDef, critC: 0.15 + X.pk.crit });
      let d = r.dmg * PVP_DMG * (1 - Y.pk.reduce);
      if (Y.shield?.t > 0) d *= 1 - Y.shield.pct;
      if (X.curse?.t > 0) d *= 1 - X.curse.pct;
      d = Math.max(1, Math.round(d));
      Y.hp -= d; total += d; if (r.crit) crit++;
      const ls = X.pk.lifesteal + (sk?.lifesteal || 0);
      if (ls > 0) X.hp = Math.min(X.s.maxHp, X.hp + Math.round(d * ls));
    }
    log.push(`${sk ? `✨ **${X.name}** thi triển **${sk.name}**` : `⚔️ **${X.name}** ra đòn`}${hits > 1 ? ` (${hits} đòn)` : ''}: **-${total}** HP${crit ? ' 💥' : ''}`);
    if (Math.random() < X.pk.thunder) { const d = Math.round((X.s.atk * 1.2 + X.p.level * 3) * PVP_DMG); Y.hp -= d; log.push(`⚡ Thiên lôi giáng xuống **${Y.name}** **-${d}**`); }
    if (sk?.heal) X.hp = Math.min(X.s.maxHp, X.hp + Math.round(X.s.maxHp * sk.heal));
    if ((sk?.stun && Math.random() < sk.stun) || (!sk && X.pk.stun && Math.random() < X.pk.stun)) { if (!Y.imm) { Y.stun = 1; log.push(`💫 **${Y.name}** bị choáng!`); } }
    if (sk?.curse) Y.curse = { ...sk.curse };
    if (sk?.burn) Y.burn = { d: Math.max(1, Math.round(X.s.atk * sk.burn.atkPct * PVP_DMG)), t: sk.burn.t };
    if (sk?.shield) { X.shield = { ...sk.shield }; log.push(`🛡️ **${X.name}** dựng kim quang hộ thể!`); }
    if (Y.pk.thorns) X.hp -= Math.round(total * Y.pk.thorns);
    if (X.shield?.t > 0) X.shield.t--;
    if (X.curse?.t > 0) X.curse.t--;
  };
  const [f1, f2] = pa.level >= pb.level ? [A, B] : [B, A];
  let rounds = 0;
  while (rounds < 40 && A.hp > 0 && B.hp > 0) {
    rounds++;
    log.push(`**— Hiệp ${rounds} —**`);
    turn(f1, f2); if (f2.hp <= 0 || f1.hp <= 0) break;
    turn(f2, f1);
    for (const X of [A, B]) X.mp = Math.min(X.s.maxMp, X.mp + 3 + X.pk.regen);
  }
  const ra = A.hp / A.s.maxHp, rb = B.hp / B.s.maxHp;
  return { winner: ra >= rb ? 'a' : 'b', A, B, log, rounds };
}

const duelEmbed = (a, b, lines, color = 0xe74c3c) => embed(color).setTitle(`🏟️ ${a.name} ⚔️ ${b.name}`).setDescription(lines.slice(-14).join('\n') || '🥁 Võ đài mở màn...');

async function runDuel(i, cid, tid, bet, accept) {
  const key = `${cid}:${tid}`, pd = pendingDuels.get(key);
  if (!pd || Date.now() - pd.t > 120000) { pendingDuels.delete(key); return i.update({ content: '⌛ Lời thách đấu đã hết hạn.', embeds: [], components: [] }); }
  pendingDuels.delete(key);
  if (!accept) return i.update({ content: `🏳️ <@${tid}> đã từ chối lời thách đấu.`, embeds: [], components: [] });
  const a = db.players[cid], b = db.players[tid];
  if (!a || !b) return i.update({ content: '❌ Không tìm thấy nhân vật.', embeds: [], components: [] });
  if (fights.has(cid) || fights.has(tid)) return i.update({ content: '⚔️ Có người đang trong trận chiến, hãy thách đấu lại sau.', embeds: [], components: [] });
  if (a.gold < bet || b.gold < bet) return i.update({ content: '💸 Một trong hai người không đủ vàng cược.', embeds: [], components: [] });

  const res = simulateDuel(a, b);
  await i.update({ content: '', embeds: [duelEmbed(a, b, ['🥁 Hai bên chắp tay thi lễ, võ đài mở màn...'])], components: [] });
  await sleep(1500);
  const chunk = Math.max(4, Math.ceil(res.log.length / 8));
  for (let k = chunk; k < res.log.length; k += chunk) {
    await i.editReply({ embeds: [duelEmbed(a, b, res.log.slice(0, k))] });
    await sleep(1600);
  }
  const W = res.winner === 'a' ? a : b, L = res.winner === 'a' ? b : a, WS = res.winner === 'a' ? res.A : res.B;
  const gain = Math.max(8, Math.min(30, 15 + Math.round((L.honor - W.honor) / 20)));
  W.honor += gain; W.duelWins++; questProg(W, 'duel'); W.vd += 10; L.vd += 3; L.honor = Math.max(0, L.honor - 8);
  if (bet) { W.gold += bet; L.gold -= bet; }
  save();
  const e = duelEmbed(a, b, res.log, 0xf1c40f)
    .addFields({ name: `🏆 ${W.name} chiến thắng sau ${res.rounds} hiệp!`, value: `❤️ ${bar(Math.max(0, WS.hp), WS.s.maxHp)} ${fmt(Math.max(0, WS.hp))}/${fmt(WS.s.maxHp)}\n🏅 ${W.name} **+${gain}** danh vọng • ${L.name} **-8**${bet ? `\n💰 ${W.name} thắng **${fmt(bet)}** vàng cược` : ''}\n*Đấu võ đài không mất HP hay vật phẩm.*` });
  return i.editReply({ embeds: [e], components: [] });
}

/* ═══════════════════════════ KHẢM BẢO NGỌC ═══════════════════════════ */
function gemView(p, uid, id) {
  const n = socketsOf(id), arr = p.gems[id] || [];
  const lines = Array.from({ length: n }, (_, k) => (arr[k] ? `${k + 1}. ${label(arr[k])} – *${statText(ITEMS[arr[k]])}*` : `${k + 1}. ⬜ *ô trống*`));
  const e = embed(0x1abc9c).setTitle(`💎 Khảm ngọc • ${dname(p, id)}`)
    .setDescription(`${lines.join('\n')}\n\nGộp 3 ngọc cùng loại thành 1 ngọc cao cấp hơn bằng \`/chetao\`. Tháo ngọc miễn phí.`);
  const comps = [];
  const gems = Object.keys(p.inv).filter((g) => ITEMS[g].type === 'gem');
  if (arr.length < n && gems.length) {
    comps.push(row(new StringSelectMenuBuilder().setCustomId(`gemput:${id}:${uid}`).setPlaceholder('➕ Chọn ngọc để khảm...')
      .addOptions(gems.slice(0, 25).map((g) => ({ label: `${ITEMS[g].name} x${p.inv[g]}`, value: g, emoji: ITEMS[g].emoji, description: statText(ITEMS[g]).slice(0, 100) })))));
  }
  if (arr.length) {
    comps.push(row(new StringSelectMenuBuilder().setCustomId(`gemrm:${id}:${uid}`).setPlaceholder('➖ Tháo ngọc...')
      .addOptions(arr.map((g, k) => ({ label: `Tháo ô ${k + 1}: ${ITEMS[g].name}`, value: String(k), emoji: ITEMS[g].emoji })))));
  }
  return { content: '', embeds: [e], components: comps };
}

/* ═══════════════════════════ SỰ KIỆN NGẪU NHIÊN ═══════════════════════════ */
function randomEvent(p) {
  const r = Math.random(), s = stats(p);
  if (r < 0.3) { const g = rand(100, 300) * Math.ceil(p.level / 5); p.gold += g; return `📦 Bạn tìm thấy một **rương cổ** ven đường: +${fmt(g)} vàng!`; }
  if (r < 0.55) { const id = pick(['linhdan', 'dailinhdan', 'tudan']); addItem(p, id, 2); return `🧙 Một **thương nhân bí ẩn** tặng bạn 2x ${label(id)}.`; }
  if (r < 0.75) { addItem(p, 'linhthach', 2); return '💠 Linh Thạch lấp lánh dưới đất: +2 Linh Thạch!'; }
  if (r < 0.9) { const gid = `${pick(Object.keys(GEM_KINDS))}1`; addItem(p, gid); return `✨ Một đạo sĩ già tặng bạn ${label(gid)}.`; }
  const d = Math.round(s.maxHp * 0.08); p.hp = Math.max(1, p.hp - d);
  return `🕳️ Bạn **sa vào bẫy ma**, mất ${fmt(d)} HP!`;
}

/* ═══════════════════════════ THÀNH TỰU ═══════════════════════════ */
function checkAch(p) {
  const got = [];
  for (const a of ACH) {
    if (p.ach[a.id] || !a.test(p)) continue;
    p.ach[a.id] = Date.now(); p.gold += a.gold; p.nb += 5;
    if (!p.title) p.title = a.id;
    got.push(`🏅 **${a.name}**${a.gold ? ` (+${fmt(a.gold)} vàng)` : ''}`);
  }
  return got;
}
const bonusText = (b) => Object.entries(b).map(([k, v]) => `+${pct(v)} ${{ atk: 'công', def: 'thủ', hp: 'HP' }[k]}`).join(', ');

function achView(p, uid) {
  const lines = ACH.map((a) => `${p.ach[a.id] ? '✅' : '⬜'} **${a.name}** – ${a.desc}\n┗ *Danh hiệu: ${bonusText(a.title)}*${a.gold ? ` • thưởng ${fmt(a.gold)}🪙` : ''}`);
  const e = embed(0xf39c12).setTitle('🏅 Thành tựu & Danh hiệu')
    .setDescription(`Đã mở **${Object.keys(p.ach).length}/${ACH.length}** • Danh hiệu hiện tại: **${titleName(p) || 'chưa đeo'}**\n\n${lines.join('\n')}`);
  const unlocked = ACH.filter((a) => p.ach[a.id]);
  const comps = [];
  // Mỗi menu tối đa 25 lựa chọn: chia thành nhiều menu khi có nhiều thành tựu
  const opt = (a) => ({ label: a.name, value: a.id, description: bonusText(a.title), default: p.title === a.id });
  const chunks = [];
  for (let k = 0; k < unlocked.length; k += 24) chunks.push(unlocked.slice(k, k + 24));
  chunks.forEach((c, k) => {
    const o = c.map(opt);
    if (k === 0) o.push({ label: 'Tháo danh hiệu', value: 'none', emoji: '🚫' });
    comps.push(row(new StringSelectMenuBuilder().setCustomId(k === 0 ? `titleset:${uid}` : `titleset${k}:${uid}`)
      .setPlaceholder(k === 0 ? '🎖️ Chọn danh hiệu để đeo...' : `🎖️ Danh hiệu (trang ${k + 1})...`).addOptions(o)));
  });
  return { content: '', embeds: [e], components: comps };
}

/* ═══════════════════════════ TRẤN YÊU THÁP ═══════════════════════════ */
const TOWER_MOBS = [['Cương Thi Thủ Tháp', '🧟', true], ['Oán Hồn Tháp Cổ', '👻', true], ['Yêu Hồ Thủ Vệ', '🦊', false], ['Thạch Quỷ', '🗿', false], ['Huyết Tướng', '👿', false], ['Hắc Long Con', '🐲', false]];
function towerMonster(floor) {
  const boss = floor % 10 === 0;
  const [name, emoji, undead] = boss ? [`Tháp Chủ Tầng ${floor}`, '👑', true] : pick(TOWER_MOBS);
  const gold = Math.round(60 * floor * (boss ? 4 : 1));
  const drops = boss
    ? [['loithach', 1, floor >= 30 ? 5 : 3], ['huyetngoc', floor >= 30 ? 1 : 0.3, 2], ['phubaoho', 0.3], ['thienvanphu', 0.4], [`weapon:${Math.max(1, Math.min(4, Math.floor(floor / 12)))}`, 0.08], ['badge:2', 0.04]]
    : [['chusa', 0.3], ['giayvang', 0.3]];
  return { name, emoji, undead, hp: Math.round(150 * Math.pow(1.1, floor) * (boss ? 2.5 : 1)), atk: Math.round(15 * Math.pow(1.082, floor) * (boss ? 1.25 : 1)),
    def: Math.round(5 * Math.pow(1.078, floor)), exp: Math.round(25 * floor * (boss ? 3 : 1)), gold: [gold, gold], drops, floorBoss: boss };
}
function beginTower(uid, p) {
  const s = stats(p);
  if (p.hp < s.maxHp * 0.15) return { error: '🩸 Bạn quá yếu! Hãy dùng đan dược hoặc `/toathien` để hồi sức trước.' };
  const floor = p.towerBest + 1, m = towerMonster(floor);
  const f = { map: 'thap', tower: true, floor, m, mHp: m.hp, boss: m.floorBoss, stun: 0, burn: null, shield: null, turn: 1, t: Date.now(), over: null,
    log: [`🗼 **Tầng ${floor}** – ${m.floorBoss ? '👑 **TẦNG BOSS!** ' : ''}${m.emoji} **${m.name}** xuất hiện!`] };
  fights.set(uid, f);
  return { fight: f };
}
const mapLabel = (f) => (f.tower ? `🗼 Trấn Yêu Tháp • Tầng ${f.floor}` : `${MAPS[f.map].emoji} ${MAPS[f.map].name}`);

/* ═══════════════════════════ BOSS THẾ GIỚI ═══════════════════════════ */
const WB_COOLDOWN = 30 * 60 * 1000, WB_DURATION = 3 * 3600 * 1000, WB_HIT_CD = 3 * 60 * 1000;
const WB_NAMES = [['Bạch Cốt Phu Nhân', '💀'], ['Thiên Niên Thi Tổ', '🧟‍♂️'], ['Cửu U Quỷ Mẫu', '👹'], ['Huyết Ma Lão Tổ', '🩸']];

function settleWb(w, killed, killerUid) {
  const entries = Object.entries(w.hits).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((x, [, d]) => x + d, 0) || 1;
  const pool = Math.round(w.max / 8) * (killed ? 1 : 0.3);
  const lines = [killed ? `🏆 **${w.name}** đã bị hạ gục!` : `💨 **${w.name}** đã trốn thoát (hết giờ)...`];
  entries.forEach(([uid, dmg], idx) => {
    const q = db.players[uid];
    if (!q) return;
    const gold = Math.round(pool * dmg / total) + 200;
    q.gold += gold; addItem(q, 'linhthach', idx === 0 ? 5 : idx < 3 ? 3 : 1);
    let extra = '';
    if (killed) {
      q.honor += 5; q.nb += 15; q.vd += 15; addItem(q, 'loithach', rand(1, 3));
      addItem(q, `${pick(Object.keys(GEM_KINDS))}${Math.random() < 0.2 ? 2 : 1}`);
      if (idx === 0 && Math.random() < 0.35) {
        const id = resolveDrop(pick(['weapon:4', 'treasure:2', 'armor:3', 'badge:2']), q.cls, q.fac);
        if (id) { addItem(q, id); extra = ` 🎁 ${label(id)}`; }
      }
      if (uid === killerUid) { addItem(q, 'thienvanphu', 2); q.honor += 10; q.gold += Math.round(pool * 0.05); q.wbKills++; extra += ' 🗡️ kết liễu'; }
    }
    if (idx < 5) lines.push(`${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx]} **${q.name}** – ${fmt(dmg)} sát thương → +${fmt(gold)}🪙${extra}`);
  });
  w.active = false; w.endedAt = Date.now();
  return lines;
}
function wbSync() {
  const w = db.wb;
  if (w.active && Date.now() > w.expires) return settleWb(w, false).join('\n');
  return null;
}
function wbSpawn() {
  const w = db.wb;
  if (w.active) return { error: '🌍 Đang có Boss Thế Giới rồi!' };
  const cd = WB_COOLDOWN - (Date.now() - w.endedAt);
  if (cd > 0) return { error: `⏳ Boss kế tiếp có thể triệu hồi sau **${Math.ceil(cd / 60000)} phút**.` };
  const top = Object.values(db.players).map((q) => stats(q)).sort((a, b) => b.atk - a.atk).slice(0, 5);
  const avgAtk = top.length ? top.reduce((x, y) => x + y.atk, 0) / top.length : 20;
  const avgDef = top.length ? top.reduce((x, y) => x + y.def, 0) / top.length : 5;
  const [name, emoji] = pick(WB_NAMES);
  Object.assign(w, { active: true, name, emoji, max: Math.max(5000, Math.round(avgAtk * 500)), hp: 0, def: Math.round(avgDef * 0.6), spawned: Date.now(), expires: Date.now() + WB_DURATION, hits: {} });
  w.hp = w.max;
  return { ok: true };
}
function wbAttack(p, uid) {
  const w = db.wb;
  if (!w.active) return { error: '🌍 Hiện không có Boss Thế Giới.' };
  const cd = wbHitCd(p) - (Date.now() - p.lastWb);
  if (cd > 0) return { error: `⏳ Bạn cần nghỉ **${Math.ceil(cd / 1000)} giây** nữa mới tấn công tiếp.` };
  const s = stats(p), pk = perks(p), cls = CLASSES[p.cls];
  const pet = p.pet && p.pets[p.pet] ? { ...PETS[p.pet], star: p.pets[p.pet].star, evo: p.pets[p.pet].evo || 0, boost: CLASSES[p.cls].petBoost || 1 } : null;
  let mp = s.maxMp, total = 0, skillUses = 0;
  for (let r = 0; r < 6; r++) {
    const skills = cls.skills.filter((sk) => p.level >= sk.lv && mp >= sk.cost);
    const sk = skills.length && Math.random() < 0.75 ? skills[skills.length - 1] : null;
    if (sk) { mp -= sk.cost; skillUses++; }
    const hits = sk?.hits || 1;
    for (let h = 0; h < hits; h++) total += calcDmg(s.atk, w.def, { mult: sk ? skillMult(p, sk) : 1, ignoreDef: sk?.ignoreDef, critC: 0.15 + pk.crit }).dmg;
    if (Math.random() < pk.thunder) total += Math.round(s.atk * 1.2 + p.level * 3);
    if (pet?.atk) total += Math.max(1, Math.round(s.atk * pet.atk * petScale(pet.star, pet.boost, pet.evo)));
    mp = Math.min(s.maxMp, mp + 3 + pk.regen);
  }
  total = Math.min(total, w.hp);
  w.hp -= total; w.hits[uid] = (w.hits[uid] || 0) + total; p.wbHits++; questProg(p, 'wb'); p.lastWb = Date.now();
  const lines = [`⚔️ Bạn tung chuỗi đòn (${skillUses} tuyệt kỹ), gây **${fmt(total)}** sát thương lên **${w.name}**!`];
  if (w.hp <= 0) { w.hp = 0; return { lines: [...lines, '', ...settleWb(w, true, uid)], killed: true }; }
  return { lines };
}
function wbView(p, uid, notes = []) {
  const notice = wbSync(), w = db.wb;
  const e = embed(0xc0392b).setTitle('🌍 Boss Thế Giới');
  const head = [...(notice ? [notice, ''] : []), ...notes, ...(notes.length ? [''] : [])];
  const b = (kind, text, emoji, style, disabled) => new ButtonBuilder().setCustomId(`wb:${kind}:${uid}`).setLabel(text).setEmoji(emoji).setStyle(style).setDisabled(disabled);
  if (!w.active) {
    const cd = WB_COOLDOWN - (Date.now() - w.endedAt);
    e.setDescription([...head, cd > 0 ? `Chưa có boss. Có thể triệu hồi sau **${Math.ceil(cd / 60000)} phút**.` : 'Chưa có boss. Hãy triệu hồi Boss Thế Giới để cả server cùng hạ!'].join('\n'));
    return { content: '', embeds: [e], components: [row(b('spawn', 'Triệu hồi boss', '🌟', ButtonStyle.Success, cd > 0))] };
  }
  const top = Object.entries(w.hits).sort((a, c) => c[1] - a[1]).slice(0, 5)
    .map(([id, d], n) => `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][n]} ${db.players[id]?.name || '???'} – ${fmt(d)}`).join('\n') || '*Chưa ai ra đòn*';
  const cd = wbHitCd(p) - (Date.now() - p.lastWb);
  e.setDescription([...head, `${w.emoji} **${w.name}** (thủ ${w.def})`, `❤️ ${bar(w.hp, w.max, 14)} ${fmt(w.hp)}/${fmt(w.max)}`, `⏰ Rút lui <t:${Math.floor(w.expires / 1000)}:R>`,
    '', '**Bảng sát thương:**', top, '', `Sát thương của bạn: **${fmt(w.hits[uid] || 0)}**${cd > 0 ? ` • ⏳ chờ ${Math.ceil(cd / 1000)}s` : ''}`].join('\n'));
  return { content: '', embeds: [e], components: [row(b('hit', 'Tấn công', '⚔️', ButtonStyle.Danger, false), b('refresh', 'Làm mới', '🔄', ButtonStyle.Secondary, false))] };
}

/* ═══════════════════════════ TÔNG MÔN ═══════════════════════════ */
const guildKey = (n) => norm(n).replace(/\s+/g, ' ').trim();
const guildNeed = (lv) => 10000 * lv;
function guildCreate(p, uid, name) {
  if (p.guild) return { ok: false, msg: '❌ Bạn đã thuộc một tông môn. Hãy rời đi trước.' };
  name = name.trim();
  if (name.length < 3 || name.length > 20) return { ok: false, msg: '❌ Tên tông môn dài 3–20 ký tự.' };
  const key = guildKey(name);
  if (db.guilds[key]) return { ok: false, msg: '❌ Tên tông môn đã tồn tại.' };
  if (p.gold < GUILD_COST) return { ok: false, msg: `💸 Cần **${fmt(GUILD_COST)}** vàng để lập tông môn.` };
  p.gold -= GUILD_COST; p.guild = key; p.contrib = 0;
  db.guilds[key] = { name, leader: uid, members: [uid], lv: 1, exp: 0, created: Date.now() };
  return { ok: true, msg: `🏯 Đã lập tông môn **${name}**! Bạn là tông chủ. Mời bạn bè dùng \`/tongmon thamgia\`.` };
}
function guildJoin(p, uid, name) {
  if (p.guild) return { ok: false, msg: '❌ Bạn đã thuộc một tông môn.' };
  const g = db.guilds[guildKey(name)];
  if (!g) return { ok: false, msg: '❌ Không tìm thấy tông môn này.' };
  if (g.members.length >= GUILD_MAX_MEMBERS) return { ok: false, msg: '❌ Tông môn đã đủ người.' };
  g.members.push(uid); p.guild = guildKey(name); p.contrib = 0;
  return { ok: true, msg: `🏯 Bạn đã gia nhập tông môn **${g.name}**! Mọi chỉ số +${pct(GUILD_BONUS * g.lv)}.` };
}
function guildLeave(p, uid) {
  const g = p.guild && db.guilds[p.guild];
  if (!g) { p.guild = null; return { ok: false, msg: '❌ Bạn chưa có tông môn.' }; }
  g.members = g.members.filter((x) => x !== uid);
  const key = p.guild; p.guild = null; p.contrib = 0;
  if (!g.members.length) { delete db.guilds[key]; return { ok: true, msg: `🏯 Bạn là người cuối cùng rời đi, tông môn **${g.name}** giải tán.` }; }
  if (g.leader === uid) g.leader = g.members[0];
  return { ok: true, msg: `🏯 Bạn đã rời tông môn **${g.name}**.` };
}
function guildDonate(p, amount) {
  const g = p.guild && db.guilds[p.guild];
  if (!g) return { ok: false, msg: '❌ Bạn chưa có tông môn.' };
  if (p.gold < amount) return { ok: false, msg: '💸 Bạn không đủ vàng.' };
  if (g.lv >= GUILD_MAX_LV) return { ok: false, msg: '🏯 Tông môn đã đạt cấp tối đa!' };
  p.gold -= amount; p.contrib += amount; g.exp += amount; p.gp += Math.floor(amount / 20);
  let up = 0;
  while (g.lv < GUILD_MAX_LV && g.exp >= guildNeed(g.lv)) { g.exp -= guildNeed(g.lv); g.lv++; up++; }
  if (g.lv >= GUILD_MAX_LV) g.exp = 0;
  return { ok: true, msg: `🙏 Bạn cống hiến **${fmt(amount)}** vàng cho tông môn.${up ? `\n🎉 **Tông môn lên cấp ${g.lv}!** Mọi thành viên +${pct(GUILD_BONUS * g.lv)} chỉ số.` : ''}` };
}
function guildEmbed(p) {
  const g = p.guild && db.guilds[p.guild];
  if (!g) return embed(0x7f8c8d).setTitle('🏯 Tông môn').setDescription('Bạn chưa có tông môn. Dùng `/tongmon taolap` (5.000 vàng) hoặc `/tongmon thamgia`.');
  const mem = g.members.map((id) => db.players[id]).filter(Boolean).sort((a, b) => b.contrib - a.contrib);
  return embed(0xd35400).setTitle(`🏯 ${g.name} • Cấp ${g.lv}/${GUILD_MAX_LV}`)
    .setDescription(`👑 Tông chủ: **${db.players[g.leader]?.name || '???'}** • 👥 ${g.members.length}/${GUILD_MAX_MEMBERS}\n🎁 Thưởng cấp: mọi chỉ số **+${pct(GUILD_BONUS * g.lv)}**\n${g.lv >= GUILD_MAX_LV ? '⭐ Đã đạt cấp tối đa!' : `📈 ${bar(g.exp, guildNeed(g.lv))} ${fmt(g.exp)}/${fmt(guildNeed(g.lv))} cống hiến`}\n\n**Thành viên:**\n${mem.slice(0, 15).map((m, n) => `${n + 1}. ${CLASSES[m.cls].emoji} ${m.name} – ${fmt(m.contrib)}🪙`).join('\n')}`);
}

/* ═══════════════════════════ CHỢ NGƯỜI CHƠI ═══════════════════════════ */
const MARKET_MAX = 10, MARKET_TTL = 48 * 3600 * 1000, MARKET_FEE = 0.05;
function marketSync() {
  const now = Date.now();
  for (const [id, l] of Object.entries(db.market.list)) {
    if (now - l.t > MARKET_TTL) { const sl = db.players[l.seller]; if (sl) addItem(sl, l.item, l.qty); delete db.market.list[id]; }
  }
  return db.market;
}
function marketPost(p, uid, item, qty, price) {
  const m = marketSync();
  if (!ITEMS[item] || count(p, item) < qty) return { ok: false, msg: '❌ Bạn không có đủ số lượng đó.' };
  if (enhOf(p, item) > 0 || p.gems?.[item]?.length || p.aff?.[item]?.length || gradeOf(p, item) > 0) return { ok: false, msg: '❌ Không thể đăng bán món đã cường hóa, thăng phẩm, tinh luyện hoặc đang khảm ngọc.' };
  if (!Number.isInteger(price) || price < 1 || price > 100000000) return { ok: false, msg: '❌ Giá không hợp lệ.' };
  const slotCap = MARKET_MAX + VIP_PERK.slots[vipLevel(p)];
  if (Object.values(m.list).filter((l) => l.seller === uid).length >= slotCap) return { ok: false, msg: `❌ Mỗi người chỉ đăng tối đa ${slotCap} món.` };
  removeItem(p, item, qty);
  const id = m.next++;
  m.list[id] = { id, seller: uid, item, qty, price, t: Date.now() };
  return { ok: true, id, msg: `✅ Đã đăng bán **#${id}**: ${qty}x ${label(item)} giá **${fmt(price)}**/cái (phí 5% khi bán xong, hết hạn sau 48 giờ).` };
}
function marketBuy(p, uid, id) {
  const m = marketSync(), l = m.list[id];
  if (!l) return { ok: false, msg: '❌ Không tìm thấy món này (có thể đã bán).' };
  if (l.seller === uid) return { ok: false, msg: '❌ Đây là món của bạn. Dùng `/cho huy` để gỡ.' };
  const total = l.price * l.qty;
  if (p.gold < total) return { ok: false, msg: `💸 Cần **${fmt(total)}** vàng.` };
  p.gold -= total; addItem(p, l.item, l.qty);
  const sl = db.players[l.seller], fee = Math.floor(total * MARKET_FEE);
  if (sl) sl.gold += total - fee;
  delete m.list[id];
  return { ok: true, msg: `🛒 Đã mua ${l.qty}x ${label(l.item)} với giá **${fmt(total)}** vàng.` };
}
function marketCancel(p, uid, id) {
  const m = marketSync(), l = m.list[id];
  if (!l || l.seller !== uid) return { ok: false, msg: '❌ Không tìm thấy món của bạn với mã này.' };
  addItem(p, l.item, l.qty); delete m.list[id];
  return { ok: true, msg: `↩️ Đã gỡ **#${id}**, ${l.qty}x ${label(l.item)} trở lại túi.` };
}
function marketView(p, uid, type) {
  const m = marketSync();
  const list = Object.values(m.list).filter((l) => !type || ITEMS[l.item].type === type).sort((a, b) => b.t - a.t).slice(0, 25);
  const line = (l) => `**#${l.id}** ${label(l.item)} x${l.qty} – ${fmt(l.price)}/cái (**${fmt(l.price * l.qty)}**) • ${db.players[l.seller]?.name || '???'}`;
  const e = embed(0x27ae60).setTitle(`🏪 Chợ người chơi${type ? ` • ${TYPE_INFO[type][1]}` : ''}`)
    .setDescription(`💰 Bạn có **${fmt(p.gold)}** vàng • Đăng bán: \`/cho dang\` • Phí 5%\n\n${list.slice(0, 15).map(line).join('\n') || '*Chợ đang trống*'}`);
  const comps = [];
  if (list.length) {
    comps.push(row(new StringSelectMenuBuilder().setCustomId(`chobuy:${uid}`).setPlaceholder('🛒 Chọn món để mua ngay...')
      .addOptions(list.map((l) => ({ label: `#${l.id} ${ITEMS[l.item].name} x${l.qty}`.slice(0, 100), value: String(l.id), emoji: ITEMS[l.item].emoji, description: `${fmt(l.price * l.qty)} vàng`.slice(0, 100) })))));
  }
  return { content: '', embeds: [e], components: comps };
}

/* ═══════════════════════════ PHE PHÁI ═══════════════════════════ */
function facView(p) {
  fpSync();
  const lead = leadingFaction();
  const members = {};
  for (const q of Object.values(db.players)) if (q.fac) members[q.fac] = (members[q.fac] || 0) + 1;
  const lines = Object.entries(FACTIONS).map(([k, f]) => `${f.emoji} **${f.name}** ${lead === k ? '👑 *dẫn đầu*' : ''}${p.fac === k ? ' ✅ *phe của bạn*' : ''}\n👥 ${members[k] || 0} người • 🏅 ${fmt(db.fp[k])} điểm tuần\n${f.desc}`);
  return embed(0x8e44ad).setTitle('⚖️ Thiên hạ ba phe')
    .setDescription(`${lines.join('\n\n')}\n\n👑 Phe dẫn đầu cuối tuần: mọi thành viên **+${pct(FAC_LEAD_BONUS)}** chỉ số. Điểm tính khi diệt yêu ma (boss ×5). Làm mới <t:${Math.floor((db.fpStart + 7 * 24 * 3600 * 1000) / 1000)}:R>.\nMỗi phe có **Lệnh bài** riêng bán ở \`/cuahang\` (danh mục Lệnh bài phe).`);
}

/* ═══════════════════════════ VIP & SHOP NGUYÊN BẢO ═══════════════════════════ */
const gearGive = (p, keys) => { const id = resolveDrop(pick(keys), p.cls, p.fac); if (!id) return 'không có'; addItem(p, id); return label(id); };
const VIP_SHOP = [
  { id: 'lt30', name: 'Gói Linh Thạch x30', emoji: '💠', price: 15, vip: 0, give: (p) => { addItem(p, 'linhthach', 30); return '+30 💠 Linh Thạch'; } },
  { id: 'tv5', name: 'Gói Thiên Vận Phù x5', emoji: '🍀', price: 25, vip: 0, give: (p) => { addItem(p, 'thienvanphu', 5); return '+5 🍀 Thiên Vận Phù'; } },
  { id: 'bh3', name: 'Gói Phù Bảo Hộ x3', emoji: '🧿', price: 40, vip: 0, give: (p) => { addItem(p, 'phubaoho', 3); return '+3 🧿 Phù Bảo Hộ'; } },
  { id: 'hm5', name: 'Gói Hoàn Mệnh Phù x5', emoji: '💫', price: 50, vip: 0, give: (p) => { addItem(p, 'hoanmenhphu', 5); return '+5 💫 Hoàn Mệnh Phù'; } },
  { id: 'v50', name: 'Túi Vàng 50.000', emoji: '💰', price: 50, vip: 0, give: (p) => { p.gold += 50000; return '+50.000 vàng'; } },
  { id: 'doiphe', name: 'Thẻ Đổi Phe', emoji: '🎫', price: 100, vip: 0, give: (p) => { addItem(p, 'thedoiphe', 1); return '+1 🎫 Thẻ Đổi Phe'; } },
  { id: 'dokiep', name: 'Đại Lễ Độ Kiếp (3 Phù Hộ Kiếp + 3 Lôi Kiếp Đan)', emoji: '☂️', price: 60, vip: 1, give: (p) => { addItem(p, 'phuhokiep', 3); addItem(p, 'loikiepdan', 3); return '+3 ☂️ Phù Hộ Kiếp, +3 🍯 Lôi Kiếp Đan'; } },
  { id: 'ngoc3', name: 'Rương Ngọc Thượng Cấp (1 ngọc bậc 3)', emoji: '💎', price: 80, vip: 1, give: (p) => { const g = `${pick(Object.keys(GEM_KINDS))}3`; addItem(p, g); return `+1 ${label(g)}`; } },
  { id: 'dt10', name: 'Gói Triệu Hồi Đệ Tử 10 lượt', emoji: '🎲', price: 90, vip: 1, give: (p) => { const r = Array.from({ length: 10 }, () => summonOnce(p)); return `Triệu hồi 10 lần: ${r.filter((x) => x.rar === 'SSR').length} SSR, ${r.filter((x) => x.rar === 'SR').length} SR, ${r.filter((x) => x.rar === 'R').length} R`; } },
  { id: 'rt4', name: 'Rương Trang Bị Cao Cấp (bậc 4 của phái bạn)', emoji: '🎁', price: 150, vip: 2, give: (p) => `+1 ${gearGive(p, ['weapon:3', 'armor:3', 'treasure:2', 'charm:2'])}` },
  { id: 'exp3', name: 'Thiên Nguyên Đan x3', emoji: '🔴', price: 120, vip: 3, give: (p) => { addItem(p, 'tuvi3', 3); return '+3 🔴 Thiên Nguyên Đan (+45.000 EXP khi dùng)'; } },
  { id: 'v300', name: 'Túi Vàng 300.000', emoji: '💰', price: 250, vip: 3, give: (p) => { p.gold += 300000; return '+300.000 vàng'; } },
  { id: 'rt5', name: 'Rương Trang Bị Tối Thượng (bậc 5 của phái bạn)', emoji: '👑', price: 400, vip: 4, give: (p) => `+1 ${gearGive(p, ['weapon:4', 'armor:3', 'treasure:2'])}${p.fac ? ` và ${gearGive(p, ['badge:2'])}` : ''}` },
];
function vipBuy(p, id) {
  const it = VIP_SHOP.find((x) => x.id === id);
  if (!it) return { ok: false, msg: '❌ Không có món này.' };
  if (vipLevel(p) < it.vip) return { ok: false, msg: `⛔ Cần **VIP ${it.vip}** để mua món này (bạn đang VIP ${vipLevel(p)}).` };
  if (p.nb < it.price) return { ok: false, msg: `💎 Cần **${it.price}** Nguyên Bảo (bạn có ${fmt(p.nb)}).` };
  p.nb -= it.price;
  return { ok: true, msg: `✅ Đã đổi **${it.name}**: ${it.give(p)}\n💎 Còn ${fmt(p.nb)} Nguyên Bảo.` };
}
function vipShopView(p, uid) {
  const lv = vipLevel(p);
  const e = embed(0xf1c40f).setTitle('👑 Cửa hàng Nguyên Bảo')
    .setDescription(`💎 Bạn có **${fmt(p.nb)}** Nguyên Bảo • VIP hiện tại: **${lv}**\n*Kiếm Nguyên Bảo miễn phí: điểm danh, boss tháp, độ kiếp, thành tựu, boss thế giới, quà VIP hằng ngày.*\n\n${VIP_SHOP.map((x) => `${lv >= x.vip ? '' : '🔒 '}${x.emoji} **${x.name}** – ${x.price}💎${x.vip ? ` (VIP ${x.vip})` : ''}`).join('\n')}`);
  const menu = new StringSelectMenuBuilder().setCustomId(`vipbuy:${uid}`).setPlaceholder('🛒 Chọn món để đổi...')
    .addOptions(VIP_SHOP.map((x) => ({ label: x.name.slice(0, 100), value: x.id, emoji: x.emoji, description: `${x.price} Nguyên Bảo${x.vip ? ` • VIP ${x.vip}` : ''}` })));
  return { content: '', embeds: [e], components: [row(menu)] };
}
function vipEmbed(p) {
  const lv = vipLevel(p), next = VIP_STEPS[lv + 1];
  const perkLine = (l) => `**VIP ${l}** (${fmt(VIP_STEPS[l])} điểm): EXP/vàng +${pct(VIP_PERK.exp[l])} • giảm giá shop ${pct(VIP_PERK.disc[l])} • chỉ số +${pct(VIP_PERK.stat[l])} • +${VIP_PERK.slots[l]} ô chợ • tọa thiền ${VIP_PERK.med[l]}p • đánh boss ${VIP_PERK.wb[l]}s`;
  return embed(0xf1c40f).setTitle(`👑 VIP của ${p.name}`)
    .setDescription([
      `Cấp hiện tại: **VIP ${lv}** • Điểm VIP: **${fmt(p.vipPts)}**${next ? ` (còn ${fmt(next - p.vipPts)} để lên VIP ${lv + 1})` : ' ⭐ tối đa'}`,
      `💎 Nguyên Bảo: **${fmt(p.nb)}**`,
      next ? `📈 ${bar(p.vipPts - VIP_STEPS[lv], next - VIP_STEPS[lv])}` : '',
      '', '**Quyền lợi theo cấp:**', ...[1, 2, 3, 4, 5].map((l) => `${lv >= l ? '✅' : '⬜'} ${perkLine(l)}`),
      '', 'Quà hằng ngày: `/vip nhanqua` • Đổi đồ: `/vipshop`', '*Điểm VIP do quản trị viên cấp qua `/admin nguyenbao`.*',
    ].filter((x) => x !== '').join('\n'));
}

/* ═══════════════════════════ QUẢN TRỊ ═══════════════════════════ */
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
const isAdmin = (i) => ADMIN_IDS.includes(i.user.id) || !!i.memberPermissions?.has?.('Administrator');

/* ═══════════════════════════ TINH LUYỆN (dòng hiệu ứng ngẫu nhiên) ═══════════════════════════ */
const pct1 = (x) => `${(x * 100).toFixed(1)}%`;
const AFFIX = {
  crit: ['Chí mạng', 0.02, 0.08], dodge: ['Né tránh', 0.02, 0.07], reduce: ['Giảm sát thương', 0.02, 0.07], lifesteal: ['Hút máu', 0.02, 0.06],
  thorns: ['Phản đòn', 0.03, 0.1], stun: ['Gây choáng', 0.03, 0.08], thunder: ['Triệu thiên lôi', 0.03, 0.1], regen: ['Hồi LL/lượt', 2, 8],
  atkp: ['% Công', 0.02, 0.08], defp: ['% Thủ', 0.02, 0.08], hpp: ['% HP', 0.03, 0.1],
};
const QUALITY = [{ n: 'Thường', e: '⬜', min: 0 }, { n: 'Hiếm', e: '🟦', min: 0.5 }, { n: 'Cực phẩm', e: '🟪', min: 0.8 }, { n: 'Thần phẩm', e: '🟨', min: 0.95 }];
const qualityOf = (q) => [...QUALITY].reverse().find((x) => q >= x.min);
const affSlots = (id) => 1 + (ITEMS[id].lv >= 10 ? 1 : 0) + (ITEMS[id].lv >= 20 ? 1 : 0);
const affText = (a) => `${qualityOf(a.q).e} ${AFFIX[a.k][0]} ${a.k === 'regen' ? `+${a.v}` : `+${pct1(a.v)}`}`;
const affCost = (id, k) => ({ stones: 3 + k * 2, gold: Math.round(Math.max(300, (ITEMS[id].price || 0) * 0.05) * (k + 1)) });
function rollAffix(id, usedKeys) {
  const k = pick(Object.keys(AFFIX).filter((x) => !usedKeys.includes(x)));
  const [, lo, hi] = AFFIX[k], q = Math.round(Math.random() * 100) / 100, scale = 1 + ITEMS[id].lv / 40;
  const raw = (lo + (hi - lo) * q) * scale;
  return { k, v: k === 'regen' ? Math.max(1, Math.round(raw)) : Math.round(raw * 1000) / 1000, q };
}
function affReroll(p, id, slot) {
  if (!canEnhance(id) || !owns(p, id)) return { ok: false, msg: '❌ Bạn không sở hữu món này.' };
  const arr = (p.aff[id] ??= []);
  if (slot >= affSlots(id) || slot > arr.length) return { ok: false, msg: '❌ Ô này chưa mở.' };
  const c = affCost(id, slot);
  if (count(p, 'linhthach') < c.stones) return { ok: false, msg: `💠 Cần ${c.stones} Linh Thạch (có ${count(p, 'linhthach')}).` };
  if (p.gold < c.gold) return { ok: false, msg: `💸 Cần ${fmt(c.gold)} vàng.` };
  removeItem(p, 'linhthach', c.stones); p.gold -= c.gold;
  const old = arr[slot], used = arr.filter((_, i) => i !== slot).map((a) => a.k);
  arr[slot] = rollAffix(id, used);
  return { ok: true, msg: `🔥 Ô ${slot + 1}: ${old ? `${affText(old)} ➜ ` : ''}**${affText(arr[slot])}**` };
}
function affView(p, uid, id, notes = []) {
  const n = affSlots(id), arr = p.aff[id] || [];
  const lines = Array.from({ length: n }, (_, k) => `${k + 1}. ${arr[k] ? affText(arr[k]) : (k <= arr.length ? '⬜ *chưa tinh luyện*' : '🔒 *hãy luyện ô trước đó trước*')}`);
  const e = embed(0xe67e22).setTitle(`🔥 Tinh luyện • ${dname(p, id)}`)
    .setDescription(`${notes.length ? `${notes.join('\n')}\n\n` : ''}${lines.join('\n')}\n\n💠 ${count(p, 'linhthach')} Linh Thạch • 💰 ${fmt(p.gold)}\n*Mỗi lần luyện đổi dòng hiệu ứng ngẫu nhiên (không trùng loại). Phẩm chất ⬜ Thường 🟦 Hiếm 🟪 Cực phẩm 🟨 Thần phẩm. Món cấp 10+ có 2 ô, cấp 20+ có 3 ô.*`);
  const btn = (k) => { const c = affCost(id, k); return new ButtonBuilder().setCustomId(`aff:${k}:${id}:${uid}`).setLabel(`Luyện ô ${k + 1} (${c.stones}💠 ${fmt(c.gold)}🪙)`).setStyle(ButtonStyle.Primary).setEmoji('🔥').setDisabled(k > arr.length); };
  return { content: '', embeds: [e], components: [row(...Array.from({ length: n }, (_, k) => btn(k)))] };
}

/* ═══════════════════════════ THĂNG PHẨM (Phàm → Linh → Bảo → Tiên → Thần) ═══════════════════════════ */
const GRADE_Q = [{ n: 'Phàm', emoji: '⬜', mult: 1 }, { n: 'Linh', emoji: '🟩', mult: 1.15 }, { n: 'Bảo', emoji: '🟦', mult: 1.32 }, { n: 'Tiên', emoji: '🟪', mult: 1.52 }, { n: 'Thần', emoji: '🟨', mult: 1.75 }];
const GRADE_NEED = { enh: [5, 8, 10, 12], rate: [0.8, 0.6, 0.4, 0.25], stones: [10, 20, 40, 80], loithach: [3, 8, 15, 30], huyetngoc: [0, 3, 8, 15], gold: [5000, 20000, 60000, 200000] };
function gradeAttempt(p, id, luck) {
  if (!canEnhance(id) || !owns(p, id)) return { ok: false, msg: '❌ Bạn không sở hữu món này.' };
  const g = gradeOf(p, id);
  if (g >= 4) return { ok: false, msg: '🟨 Đã đạt phẩm Thần.' };
  const N = GRADE_NEED;
  if (enhOf(p, id) < N.enh[g]) return { ok: false, msg: `🔨 Cần cường hóa đạt +${N.enh[g]} trước (hiện +${enhOf(p, id)}).` };
  for (const [k, need, nm] of [['linhthach', N.stones[g], 'Linh Thạch'], ['loithach', N.loithach[g], 'Lôi Thạch'], ['huyetngoc', N.huyetngoc[g], 'Huyết Ngọc']]) if (count(p, k) < need) return { ok: false, msg: `❌ Thiếu ${nm}: cần ${need}, có ${count(p, k)}.` };
  if (p.gold < N.gold[g]) return { ok: false, msg: `💸 Cần ${fmt(N.gold[g])} vàng.` };
  if (luck && !count(p, 'thienvanphu')) return { ok: false, msg: '🍀 Bạn hết Thiên Vận Phù.' };
  removeItem(p, 'linhthach', N.stones[g]); if (N.loithach[g]) removeItem(p, 'loithach', N.loithach[g]); if (N.huyetngoc[g]) removeItem(p, 'huyetngoc', N.huyetngoc[g]);
  p.gold -= N.gold[g]; if (luck) removeItem(p, 'thienvanphu');
  const rate = Math.min(0.95, N.rate[g] + (luck ? 0.1 : 0));
  if (Math.random() < rate) { p.grade[id] = g + 1; return { ok: true, msg: `🌟 **THĂNG PHẨM THÀNH CÔNG!** ${label(id)} lên phẩm ${GRADE_Q[g + 1].emoji} **${GRADE_Q[g + 1].n}** (chỉ số ×${GRADE_Q[g + 1].mult}).` }; }
  return { ok: false, msg: `💔 **Thất bại** (tỉ lệ ${pct(rate)}). Nguyên liệu bị mất nhưng món đồ vẫn an toàn.` };
}
function gradeView(p, uid, id, notes = []) {
  const g = gradeOf(p, id);
  if (g >= 4) return { content: '', embeds: [embed(0xf1c40f).setTitle(`${GRADE_Q[4].emoji} ${dname(p, id)} đã đạt phẩm Thần!`).setDescription(notes.join('\n'))], components: [] };
  const N = GRADE_NEED, ck = (b) => (b ? '✅' : '❌');
  const e = embed(0x9b59b6).setTitle(`🌟 Thăng phẩm • ${dname(p, id)}`)
    .setDescription(`${notes.length ? `${notes.join('\n')}\n\n` : ''}Phẩm hiện tại: ${GRADE_Q[g].emoji} **${GRADE_Q[g].n}** (×${GRADE_Q[g].mult}) ➜ ${GRADE_Q[g + 1].emoji} **${GRADE_Q[g + 1].n}** (×${GRADE_Q[g + 1].mult})\n\n🎯 Tỉ lệ: **${pct(N.rate[g])}** (Thiên Vận Phù: ${pct(Math.min(0.95, N.rate[g] + 0.1))})\n${ck(enhOf(p, id) >= N.enh[g])} Cường hóa +${N.enh[g]} (hiện +${enhOf(p, id)})\n${ck(count(p, 'linhthach') >= N.stones[g])} 💠 Linh Thạch ${N.stones[g]} (có ${count(p, 'linhthach')})\n${ck(count(p, 'loithach') >= N.loithach[g])} 🪨 Lôi Thạch ${N.loithach[g]} (có ${count(p, 'loithach')})\n${N.huyetngoc[g] ? `${ck(count(p, 'huyetngoc') >= N.huyetngoc[g])} 💎 Huyết Ngọc ${N.huyetngoc[g]} (có ${count(p, 'huyetngoc')})\n` : ''}${ck(p.gold >= N.gold[g])} 💰 ${fmt(N.gold[g])} vàng (có ${fmt(p.gold)})\n\n*Thất bại chỉ mất nguyên liệu, món đồ không bị hỏng.*`);
  return { content: '', embeds: [e], components: [row(
    new ButtonBuilder().setCustomId(`grade:0:${id}:${uid}`).setLabel('Thăng phẩm').setEmoji('🌟').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`grade:1:${id}:${uid}`).setLabel('+Thiên Vận').setEmoji('🍀').setStyle(ButtonStyle.Success).setDisabled(!count(p, 'thienvanphu')),
  )] };
}

/* ═══════════════════════════ CÔNG PHÁP ═══════════════════════════ */
const TECHS = {
  kimcang: { name: 'Kim Cang Bất Hoại Công', emoji: '🛡️', per: { hp: 0.012 }, desc: '+1.2% HP / cấp' },
  thaicuc: { name: 'Thái Cực Quyền Kinh', emoji: '☯️', per: { def: 0.012 }, desc: '+1.2% thủ / cấp' },
  cuuduong: { name: 'Cửu Dương Chân Kinh', emoji: '☀️', per: { atk: 0.012 }, desc: '+1.2% công / cấp' },
  langba: { name: 'Lăng Ba Vi Bộ', emoji: '🌊', perk: { dodge: 0.004 }, desc: '+0.4% né / cấp' },
  bacminh: { name: 'Bắc Minh Thần Công', emoji: '🌀', perk: { lifesteal: 0.004 }, desc: '+0.4% hút máu / cấp' },
  dichcan: { name: 'Dịch Cân Kinh', emoji: '💪', per: { hp: 0.006 }, perk: { regen: 0.5 }, desc: '+0.6% HP, +0.5 LL/lượt / cấp' },
  thienloi: { name: 'Thiên Lôi Quyết', emoji: '⚡', perk: { thunder: 0.006 }, desc: '+0.6% triệu lôi / cấp' },
  cankhon: { name: 'Càn Khôn Đại Na Di', emoji: '🔄', perk: { reduce: 0.004 }, desc: '+0.4% giảm sát thương / cấp' },
  phaquan: { name: 'Phá Quân Quyết', emoji: '🎯', perk: { crit: 0.004 }, desc: '+0.4% chí mạng / cấp' },
};
const TECH_MAX = 10;
const techCost = (L) => ({ gold: 1500 * L * L, stones: 2 * L, lv: 3 * L });
function extraTotals(p) {
  const r = { atk: 0, def: 0, hp: 0, perk: {} };
  const addPerk = (k, v) => { r.perk[k] = (r.perk[k] || 0) + v; };
  for (const id of Object.values(p.equip)) {
    if (!id) continue;
    for (const a of (p.aff?.[id] || [])) { if (a.k === 'atkp') r.atk += a.v; else if (a.k === 'defp') r.def += a.v; else if (a.k === 'hpp') r.hp += a.v; else addPerk(a.k, a.v); }
  }
  for (const [tid, lv] of Object.entries(p.tech || {})) {
    const t = TECHS[tid]; if (!t) continue;
    for (const [k, v] of Object.entries(t.per || {})) r[k] += v * lv;
    for (const [k, v] of Object.entries(t.perk || {})) addPerk(k, v * lv);
  }
  return r;
}
function techUp(p, id) {
  const t = TECHS[id]; if (!t) return { ok: false, msg: '❌ Không có công pháp này.' };
  const L = (p.tech[id] || 0) + 1;
  if (L > TECH_MAX) return { ok: false, msg: '⭐ Công pháp đã đạt cấp tối đa.' };
  const c = techCost(L);
  if (p.level < c.lv) return { ok: false, msg: `⛔ Cần cấp ${c.lv} để luyện lên cấp ${L}.` };
  if (count(p, 'linhthach') < c.stones) return { ok: false, msg: `💠 Cần ${c.stones} Linh Thạch.` };
  if (p.gold < c.gold) return { ok: false, msg: `💸 Cần ${fmt(c.gold)} vàng.` };
  removeItem(p, 'linhthach', c.stones); p.gold -= c.gold; p.tech[id] = L;
  const s2 = stats(p); p.hp = Math.min(p.hp, s2.maxHp);
  return { ok: true, msg: `📖 **${t.name}** đã luyện đến cấp **${L}/${TECH_MAX}**!` };
}
function techView(p, uid, notes = []) {
  const lines = Object.entries(TECHS).map(([id, t]) => `${t.emoji} **${t.name}** \`${p.tech[id] || 0}/${TECH_MAX}\` ${bar(p.tech[id] || 0, TECH_MAX, 5)}\n┗ *${t.desc}*`);
  const e = embed(0x2980b9).setTitle('📖 Công pháp').setDescription(`${notes.length ? `${notes.join('\n')}\n\n` : ''}${lines.join('\n')}\n\n💠 ${count(p, 'linhthach')} Linh Thạch • 💰 ${fmt(p.gold)}\n*Công pháp cộng vĩnh viễn, không mất khi đổi đồ. Cấp tiếp theo yêu cầu cấp nhân vật = 3 × cấp công pháp.*`);
  const open = Object.entries(TECHS).filter(([id]) => (p.tech[id] || 0) < TECH_MAX);
  const comps = [];
  if (open.length) {
    comps.push(row(new StringSelectMenuBuilder().setCustomId(`techup:${uid}`).setPlaceholder('📖 Chọn công pháp để luyện thêm 1 cấp...')
      .addOptions(open.map(([id, t]) => { const c = techCost((p.tech[id] || 0) + 1); return { label: `${t.name} → ${(p.tech[id] || 0) + 1}`.slice(0, 100), value: id, emoji: t.emoji, description: `${fmt(c.gold)} vàng + ${c.stones} Linh Thạch • Lv${c.lv}`.slice(0, 100) }; }))));
  }
  return { content: '', embeds: [e], components: comps };
}

/* ═══════════════════════════ TIẾN HÓA ĐỆ TỬ ═══════════════════════════ */
const PET_EVO = [{ linhthach: 30, loithach: 20, gold: 20000 }, { linhthach: 60, huyetngoc: 20, gold: 60000 }, { linhthach: 120, huyetngoc: 50, gold: 150000 }];
const evoCostText = (c) => `${fmt(c.gold)} vàng, ${c.linhthach} Linh Thạch${c.loithach ? `, ${c.loithach} Lôi Thạch` : ''}${c.huyetngoc ? `, ${c.huyetngoc} Huyết Ngọc` : ''}`;
function petEvolve(p, id) {
  const pet = p.pets[id];
  if (!pet) return { ok: false, msg: '❌ Bạn chưa có đệ tử này.' };
  if (pet.star < 5) return { ok: false, msg: '⭐ Cần đủ 5 sao mới tiến hóa được.' };
  const evo = pet.evo || 0;
  if (evo >= 3) return { ok: false, msg: '🔱 Đã tiến hóa tối đa.' };
  const c = PET_EVO[evo];
  for (const k of ['linhthach', 'loithach', 'huyetngoc']) if (c[k] && count(p, k) < c[k]) return { ok: false, msg: `❌ Thiếu ${label(k)}: cần ${c[k]}, có ${count(p, k)}.` };
  if (p.gold < c.gold) return { ok: false, msg: `💸 Cần ${fmt(c.gold)} vàng.` };
  for (const k of ['linhthach', 'loithach', 'huyetngoc']) if (c[k]) removeItem(p, k, c[k]);
  p.gold -= c.gold; pet.evo = evo + 1;
  return { ok: true, msg: `🔱 **${PETS[id].name}** tiến hóa lên cấp **${pet.evo}**! Sức mạnh ×${(1 + 0.25 * pet.evo).toFixed(2)}.` };
}

// ── Rương, vé triệu hồi, bùa phúc (bán ở các cửa hàng mới) ──
Object.assign(ITEMS, {
  ruongngoc:       { name: 'Rương Ngọc',        emoji: '🎁', type: 'chest', price: 6000,  use: { box: 'ngoc' },       desc: 'Mở ra 3 bảo ngọc ngẫu nhiên (12% bậc Trung)' },
  ruongtrangbi:    { name: 'Rương Trang Bị',    emoji: '🧰', type: 'chest', price: 25000, use: { box: 'trangbi' },    desc: 'Trang bị ngẫu nhiên bậc 3–5 của phái bạn' },
  ruongphu:        { name: 'Rương Phù Chú',     emoji: '📦', type: 'chest', price: 5000,  use: { box: 'phu' },        desc: '5 loại phù chú ngẫu nhiên' },
  ruongnguyenlieu: { name: 'Rương Nguyên Liệu', emoji: '🪵', type: 'chest', price: 12000, use: { box: 'nguyenlieu' }, desc: 'Lôi Thạch, Huyết Ngọc, Linh Thạch, xương, nanh' },
  ruongvang:       { name: 'Rương Vàng',        emoji: '💰', type: 'chest', price: 3000,  use: { box: 'vang' },       desc: 'Vàng ngẫu nhiên, càng cao cấp càng nhiều' },
  vetrieuhoi:      { name: 'Vé Triệu Hồi',      emoji: '🎟️', type: 'talisman', price: 1400, desc: 'Dùng thay vàng khi /trieuhoi (1 vé = 1 lượt)' },
  buffexp:  { name: 'Linh Quang Phù', emoji: '🌟', type: 'potion', price: 4000, use: { buff: { k: 'exp', v: 0.5, mins: 60 } },  desc: '+50% EXP trong 60 phút' },
  buffgold: { name: 'Chiêu Tài Phù',  emoji: '🪙', type: 'potion', price: 3000, use: { buff: { k: 'gold', v: 0.5, mins: 60 } }, desc: '+50% vàng trong 60 phút' },
  buffdrop: { name: 'Hưng Vận Phù',   emoji: '🌈', type: 'potion', price: 5000, use: { buff: { k: 'drop', v: 0.4, mins: 60 } }, desc: '+40% tỉ lệ rơi vật phẩm trong 60 phút' },
});
const BUFF_NAME = { exp: 'EXP', gold: 'vàng', drop: 'tỉ lệ rơi vật phẩm' };
function buffVal(p, k) { const b = p.buffs?.[k]; return b && b.until > Date.now() ? b.v : 0; }
function openBox(p, kind) {
  const lines = [];
  const give = (id, n = 1) => { addItem(p, id, n); lines.push(`🎁 ${label(id)}${n > 1 ? ` x${n}` : ''}`); };
  if (kind === 'ngoc') for (let k = 0; k < 3; k++) give(`${pick(Object.keys(GEM_KINDS))}${Math.random() < 0.12 ? 2 : 1}`);
  else if (kind === 'trangbi') {
    const type = pick(['weapon', 'weapon', 'weapon', 'armor', 'armor', 'armor', 'treasure', 'treasure', 'charm', 'charm']);
    const r = Math.random(), shift = type === 'treasure' || type === 'charm' ? 1 : 0;
    const max = { weapon: 4, armor: 3, treasure: 2, charm: 2 }[type], min = { weapon: 2, armor: 2, treasure: 1, charm: 1 }[type];
    const id = gearId(p.cls, type, Math.max(min, Math.min(max, (r < 0.5 ? 2 : r < 0.85 ? 3 : 4) - shift)));
    if (id) give(id);
    if (p.fac && Math.random() < 0.3) { const b = resolveDrop('badge:1', p.cls, p.fac); if (b) give(b); }
  } else if (kind === 'phu') {
    const pool = ['phutranthi', 'phuloi', 'phuliethoa', 'phuhothan', 'phuthienloi', 'phudontho', 'hoanmenhphu', 'gaoep'];
    for (let k = 0; k < 5; k++) give(pick(pool), rand(1, 3));
  } else if (kind === 'nguyenlieu') {
    give('loithach', rand(2, 5)); const h = rand(0, 2); if (h) give('huyetngoc', h);
    give('linhthach', rand(5, 15)); give(pick(['xuongthi', 'nanhholy']), rand(3, 8));
  } else if (kind === 'vang') {
    const g = Math.round(rand(2000, 8000) * (1 + p.level / 20)); p.gold += g; lines.push(`💰 **${fmt(g)}** vàng`);
  }
  return lines;
}

/* ═══════════════════════════ CỬA HÀNG ĐẶC BIỆT ═══════════════════════════ */
const CUR = { gold: ['gold', 'vàng', '🪙'], vd: ['vd', 'Vinh Dự', '🥇'], tl: ['tl', 'Tháp Lệnh', '🗼'], gp: ['gp', 'Cống Hiến', '🏯'], lt: ['inv:linhthach', 'Linh Thạch', '💠'] };
const BM_POOL = ['weapon:3', 'weapon:4', 'armor:3', 'treasure:2', 'charm:2', 'badge:2', 'hong3', 'lam3', 'luc3', 'tu3', 'hoang3', 'loi3', 'phuhokiep', 'loikiepdan', 'tuvi3', 'phubaoho', 'thienvanphu', 'hoanmenhphu', 'thanlinhdan', 'tiendan', 'tuhonchau', 'longnhangioi', 'loithach', 'huyetngoc', 'thientinhchau', 'ruongtrangbi', 'ruongngoc', 'ruongnguyenlieu', 'vetrieuhoi', 'buffexp', 'buffdrop'];
const SHOP_DEFS = {
  chodien: { name: 'Chợ Đen', emoji: '🕶️', cur: 'gold', desc: 'Hàng hiếm đổi mới mỗi 6 giờ, có "hàng sốc" giảm 30%. Mỗi người mua giới hạn.' },
  vinhdu: { name: 'Võ Đài Vinh Dự', emoji: '🏟️', cur: 'vd', desc: 'Đổi điểm Vinh Dự (thắng võ đài +10, thua +3, hạ boss thế giới +15).', items: [
    { k: 'tv', item: 'thienvanphu', qty: 3, price: 30, lim: 5 }, { k: 'bh', item: 'phubaoho', qty: 1, price: 60, lim: 3 }, { k: 'hm', item: 'hoanmenhphu', qty: 2, price: 40, lim: 3 },
    { k: 'tv2', item: 'tuvi2', qty: 1, price: 50, lim: 3 }, { k: 'g1', item: 'hoang2', qty: 1, price: 90, lim: 2 }, { k: 'g2', item: 'loi2', qty: 1, price: 90, lim: 2 }, { k: 'g3', item: 'hong2', qty: 1, price: 90, lim: 2 },
    { k: 'bd1', item: 'badge:1', qty: 1, price: 250, lim: 1 }, { k: 'bd2', item: 'badge:2', qty: 1, price: 1500, lim: 1, req: { lv: 25 } }, { k: 'df', item: 'thedoiphe', qty: 1, price: 400, lim: 1 }] },
  thaplenh: { name: 'Tháp Lệnh Các', emoji: '🗼', cur: 'tl', desc: 'Đổi Tháp Lệnh (mỗi tầng +1, tầng boss +5) lấy trang bị và nguyên liệu quý.', items: [
    { k: 'w3', item: 'weapon:3', qty: 1, price: 150, lim: 1 }, { k: 'a3', item: 'armor:3', qty: 1, price: 150, lim: 1 }, { k: 't2', item: 'treasure:2', qty: 1, price: 300, lim: 1 }, { k: 'c2', item: 'charm:2', qty: 1, price: 100, lim: 1 },
    { k: 'lt', item: 'linhthach', qty: 10, price: 20, lim: 10 }, { k: 'ln', item: 'loithach', qty: 5, price: 40, lim: 5 }, { k: 'hn', item: 'huyetngoc', qty: 2, price: 120, lim: 3 },
    { k: 'ph', item: 'phuhokiep', qty: 1, price: 60, lim: 3 }, { k: 'gm1', item: 'hoang3', qty: 1, price: 400, lim: 1 }, { k: 'gm2', item: 'loi3', qty: 1, price: 400, lim: 1 }, { k: 'w4', item: 'weapon:4', qty: 1, price: 900, lim: 1, req: { tower: 30 } }] },
  tongmon: { name: 'Tông Môn Bảo Khố', emoji: '🏯', cur: 'gp', desc: 'Đổi Cống Hiến (cống hiến vàng cho tông môn: 20 vàng = 1 điểm). Cần có tông môn.', items: [
    { k: 'lt', item: 'linhthach', qty: 5, price: 50, lim: 10 }, { k: 'ht', item: 'phuhothan', qty: 3, price: 30, lim: 5 }, { k: 'dl', item: 'dailinhdan', qty: 5, price: 40, lim: 5 }, { k: 'tv1', item: 'tuvi1', qty: 2, price: 60, lim: 5 },
    { k: 'tvp', item: 'thienvanphu', qty: 2, price: 120, lim: 3 }, { k: 'phk', item: 'phuhokiep', qty: 1, price: 200, lim: 2 }, { k: 'tld', item: 'thanlinhdan', qty: 2, price: 150, lim: 3 }, { k: 'nph', item: 'ngocphuho', qty: 1, price: 800, lim: 1 },
    { k: 'bt', item: 'tuvi3', qty: 1, price: 1500, lim: 1, req: { guildLv: 5 } }] },
  loren: { name: 'Lò Rèn Thần Binh', emoji: '⚒️', cur: 'gold', desc: 'Nguyên liệu cường hóa, thăng phẩm và trang bị đúng phái của bạn. Giới hạn mua mỗi ngày.', items: [
    { k: 'lt', item: 'linhthach', qty: 10, price: 1100, lim: 10 }, { k: 'ln', item: 'loithach', qty: 3, price: 1500, lim: 5 }, { k: 'hn', item: 'huyetngoc', qty: 1, price: 2200, lim: 3, req: { lv: 20 } },
    { k: 'tv', item: 'thienvanphu', qty: 2, price: 1500, lim: 5 }, { k: 'bh', item: 'phubaoho', qty: 1, price: 2300, lim: 3 },
    { k: 'w2', item: 'weapon:2', qty: 1, mult: 1, lim: 1 }, { k: 'w3', item: 'weapon:3', qty: 1, mult: 1.1, lim: 1 }, { k: 'a2', item: 'armor:2', qty: 1, mult: 1, lim: 1 }, { k: 'a3', item: 'armor:3', qty: 1, mult: 1.1, lim: 1 },
    { k: 't1', item: 'treasure:1', qty: 1, mult: 1, lim: 1 }, { k: 'c1', item: 'charm:1', qty: 1, mult: 1, lim: 1 }, { k: 'c2', item: 'charm:2', qty: 1, mult: 1.1, lim: 1 },
    { k: 'ac1', item: 'huyenthietgioi', qty: 1, mult: 1, lim: 1 }, { k: 'ac2', item: 'longnhangioi', qty: 1, mult: 1, lim: 1 }] },
  danduoc: { name: 'Đan Dược Các', emoji: '💊', cur: 'gold', desc: 'Đan hồi máu, hồi linh lực, đan tăng EXP mua theo gói. Giới hạn mua mỗi ngày.', items: [
    { k: 'd1', item: 'linhdan', qty: 10, mult: 0.9, lim: 5 }, { k: 'd2', item: 'dailinhdan', qty: 5, mult: 0.9, lim: 5 }, { k: 'd3', item: 'thanlinhdan', qty: 2, mult: 0.95, lim: 3 }, { k: 'd4', item: 'tiendan', qty: 1, mult: 0.95, lim: 3 },
    { k: 'm1', item: 'tudan', qty: 10, mult: 0.9, lim: 5 }, { k: 'm2', item: 'hoilinhdan', qty: 3, mult: 0.95, lim: 3 }, { k: 'm3', item: 'huyenlinhdan', qty: 2, mult: 0.95, lim: 3 },
    { k: 'e1', item: 'tuvi1', qty: 3, mult: 1, lim: 3 }, { k: 'e2', item: 'tuvi2', qty: 2, mult: 1, lim: 2 }, { k: 'e3', item: 'tuvi3', qty: 1, mult: 1, lim: 1 }, { k: 'hm', item: 'hoanmenhphu', qty: 1, mult: 0.95, lim: 3 }] },
  phucac: { name: 'Phù Chú Các', emoji: '📜', cur: 'gold', desc: 'Phù trấn thi, phù lôi, phù hộ thân, gạo nếp... mua theo gói. Giới hạn mua mỗi ngày.', items: [
    { k: 'p1', item: 'phutranthi', qty: 5, mult: 0.9, lim: 5 }, { k: 'p2', item: 'gaoep', qty: 10, mult: 0.9, lim: 5 }, { k: 'p3', item: 'phuloi', qty: 5, mult: 0.9, lim: 5 }, { k: 'p4', item: 'phuliethoa', qty: 3, mult: 0.9, lim: 4 },
    { k: 'p5', item: 'phuhothan', qty: 3, mult: 0.9, lim: 4 }, { k: 'p6', item: 'phudontho', qty: 3, mult: 0.9, lim: 4 }, { k: 'p7', item: 'phuthienloi', qty: 2, mult: 0.95, lim: 3 }, { k: 'p8', item: 'hoanmenhphu', qty: 2, mult: 0.95, lim: 3 },
    { k: 'k1', item: 'phuhokiep', qty: 1, mult: 1, lim: 3 }, { k: 'k2', item: 'loikiepdan', qty: 1, mult: 1, lim: 3 }] },
  baongoc: { name: 'Bảo Ngọc Các', emoji: '💎', cur: 'gold', desc: 'Bảy loại bảo ngọc ba bậc để khảm vào trang bị. Giới hạn mua mỗi ngày.', items: Object.keys(GEM_KINDS).flatMap((k) => [
    { k: `${k}1`, item: `${k}1`, qty: 3, mult: 0.95, lim: 3 }, { k: `${k}2`, item: `${k}2`, qty: 1, mult: 1.1, lim: 2 }, { k: `${k}3`, item: `${k}3`, qty: 1, mult: 1.6, lim: 1 }]) },
  thuongnhan: { name: 'Thương Nhân Lang Thang', emoji: '🧳', cur: 'gold', desc: 'Hàng giảm giá 25–50%, đổi mới mỗi ngày. Mỗi món mua tối đa 3 lần.' },
  phephai: { name: 'Phe Phái Các', emoji: '⚖️', cur: 'gold', needFac: true, desc: 'Lệnh bài và vật phẩm riêng của phe bạn. Cần đã chọn phe (/phe chon).', items: [
    { k: 'b0', item: 'badge:0', qty: 1, mult: 1, lim: 1 }, { k: 'b1', item: 'badge:1', qty: 1, mult: 1, lim: 1 }, { k: 'df', item: 'thedoiphe', qty: 1, price: 30000, lim: 1 }, { k: 'hm', item: 'hoanmenhphu', qty: 3, price: 3500, lim: 2 },
    { k: 'bc', fac: 'chinh', item: 'phuhothan', qty: 5, price: 800, lim: 3 }, { k: 'bm', fac: 'ma', item: 'phuliethoa', qty: 5, price: 900, lim: 3 }, { k: 'bt', fac: 'tieudao', item: 'phudontho', qty: 5, price: 700, lim: 3 }] },
  linhphuong: { name: 'Linh Thạch Phường', emoji: '💠', cur: 'lt', desc: 'Đổi Linh Thạch (rơi từ yêu ma, điểm danh) lấy đan, ngọc và trang bị quý.', items: [
    { k: 'e2', item: 'tuvi2', qty: 1, price: 35, lim: 3 }, { k: 'e3', item: 'tuvi3', qty: 1, price: 130, lim: 2 }, { k: 'bh', item: 'phubaoho', qty: 1, price: 22, lim: 3 }, { k: 'tv', item: 'thienvanphu', qty: 1, price: 12, lim: 5 },
    { k: 'hm', item: 'hoanmenhphu', qty: 1, price: 12, lim: 3 }, { k: 'hk', item: 'phuhokiep', qty: 1, price: 15, lim: 3 }, { k: 'ld', item: 'loikiepdan', qty: 1, price: 12, lim: 3 },
    { k: 'g1', item: 'hong3', qty: 1, price: 110, lim: 1 }, { k: 'g2', item: 'lam3', qty: 1, price: 110, lim: 1 }, { k: 'g3', item: 'luc3', qty: 1, price: 110, lim: 1 }, { k: 'g4', item: 'tu3', qty: 1, price: 110, lim: 1 }, { k: 'g5', item: 'hoang3', qty: 1, price: 110, lim: 1 }, { k: 'g6', item: 'loi3', qty: 1, price: 110, lim: 1 },
    { k: 'w3', item: 'weapon:3', qty: 1, price: 90, lim: 1 }, { k: 'a3', item: 'armor:3', qty: 1, price: 90, lim: 1 }, { k: 'b1', item: 'badge:1', qty: 1, price: 120, lim: 1 }, { k: 'th', item: 'tuhonchau', qty: 1, price: 180, lim: 1 }, { k: 'df', item: 'thedoiphe', qty: 1, price: 200, lim: 1 },
    { k: 'rt', item: 'ruongtrangbi', qty: 1, price: 100, lim: 2 }, { k: 'rn', item: 'ruongngoc', qty: 1, price: 30, lim: 3 }, { k: 'vt', item: 'vetrieuhoi', qty: 1, price: 14, lim: 5 }] },
  phucloi: { name: 'Phúc Lợi Quán', emoji: '🎁', cur: 'gold', desc: 'Quà MIỄN PHÍ mỗi ngày cho mọi đạo hữu. Càng lên cấp càng nhiều quà.', items: [
    { k: 'f1', item: 'linhdan', qty: 5, price: 0, lim: 1 }, { k: 'f2', item: 'tudan', qty: 3, price: 0, lim: 1 }, { k: 'f3', item: 'linhthach', qty: 2, price: 0, lim: 1 }, { k: 'f4', item: 'phutranthi', qty: 3, price: 0, lim: 1 }, { k: 'f5', item: 'gaoep', qty: 5, price: 0, lim: 1 },
    { k: 'f6', item: 'ruongvang', qty: 1, price: 0, lim: 1, req: { lv: 10 } }, { k: 'f7', item: 'dailinhdan', qty: 3, price: 0, lim: 1, req: { lv: 15 } }, { k: 'f8', item: 'ruongngoc', qty: 1, price: 0, lim: 1, req: { lv: 25 } }, { k: 'f9', item: 'buffexp', qty: 1, price: 0, lim: 1, req: { lv: 30 } }] },
  tanthu: { name: 'Tạp Hóa Tân Thủ', emoji: '🧸', cur: 'gold', desc: 'Gói đồ giá rẻ dành cho đạo hữu từ cấp 20 trở xuống.', items: [
    { k: 'n1', item: 'linhdan', qty: 10, price: 300, lim: 3, req: { maxLv: 20 } }, { k: 'n2', item: 'tudan', qty: 5, price: 250, lim: 3, req: { maxLv: 20 } }, { k: 'n3', item: 'phutranthi', qty: 5, price: 350, lim: 3, req: { maxLv: 20 } },
    { k: 'n4', item: 'gaoep', qty: 10, price: 150, lim: 3, req: { maxLv: 20 } }, { k: 'n5', item: 'phuloi', qty: 3, price: 350, lim: 3, req: { maxLv: 20 } }, { k: 'n6', item: 'tuvi1', qty: 2, price: 1200, lim: 2, req: { maxLv: 20 } },
    { k: 'g0', item: 'weapon:0', qty: 1, mult: 0.5, lim: 1, req: { maxLv: 20 } }, { k: 'g1', item: 'armor:0', qty: 1, mult: 0.5, lim: 1, req: { maxLv: 20 } }, { k: 'g2', item: 'weapon:1', qty: 1, mult: 0.7, lim: 1, req: { maxLv: 20 } },
    { k: 'g3', item: 'armor:1', qty: 1, mult: 0.7, lim: 1, req: { maxLv: 20 } }, { k: 'g4', item: 'treasure:0', qty: 1, mult: 0.7, lim: 1, req: { maxLv: 20 } }, { k: 'g5', item: 'charm:0', qty: 1, mult: 0.7, lim: 1, req: { maxLv: 20 } }] },
  ruong: { name: 'Tiệm Rương Bí Ẩn', emoji: '🎲', cur: 'gold', desc: 'Rương ngọc, trang bị, phù, nguyên liệu, vàng. Mua về rồi mở bằng /dung để thử vận may.', items: [
    { k: 'r1', item: 'ruongngoc', qty: 1, price: 6000, lim: 5 }, { k: 'r2', item: 'ruongtrangbi', qty: 1, price: 25000, lim: 3, req: { lv: 10 } }, { k: 'r3', item: 'ruongphu', qty: 1, price: 5000, lim: 5 },
    { k: 'r4', item: 'ruongnguyenlieu', qty: 1, price: 12000, lim: 4, req: { lv: 15 } }, { k: 'r5', item: 'ruongvang', qty: 1, price: 3000, lim: 5 }] },
  linhthu: { name: 'Linh Thú Quán', emoji: '🐾', cur: 'gold', desc: 'Vé triệu hồi đệ tử và nguyên liệu tiến hóa đệ tử. Giới hạn mua mỗi ngày.', items: [
    { k: 'v1', item: 'vetrieuhoi', qty: 1, price: 1400, lim: 5 }, { k: 'v10', item: 'vetrieuhoi', qty: 10, price: 12500, lim: 2 }, { k: 'ev1', item: 'linhthach', qty: 10, price: 1100, lim: 10 },
    { k: 'ev2', item: 'loithach', qty: 3, price: 1500, lim: 5 }, { k: 'ev3', item: 'huyetngoc', qty: 1, price: 2200, lim: 3, req: { lv: 20 } }] },
  caiphuc: { name: 'Cầu Phúc Đàn', emoji: '🙏', cur: 'gold', desc: 'Bùa phúc tăng EXP, vàng, tỉ lệ rơi đồ trong 60 phút. Dùng bằng /dung, cộng dồn thời gian.', items: [
    { k: 'b1', item: 'buffexp', qty: 1, price: 4000, lim: 5 }, { k: 'b2', item: 'buffgold', qty: 1, price: 3000, lim: 5 }, { k: 'b3', item: 'buffdrop', qty: 1, price: 5000, lim: 5 }, { k: 'b4', item: 'buffexp', qty: 5, price: 17000, lim: 2 }] },
};
const THUONG_POOL = ['ruongphu', 'ruongvang', 'buffgold', 'linhdan', 'dailinhdan', 'thanlinhdan', 'tudan', 'hoilinhdan', 'tuvi1', 'tuvi2', 'phutranthi', 'phuloi', 'phuliethoa', 'phuhothan', 'phuthienloi', 'phubaoho', 'thienvanphu', 'hoanmenhphu', 'phuhokiep', 'loikiepdan', 'linhthach', 'loithach', 'huyetngoc',
  ...Object.keys(GEM_KINDS).flatMap((k) => [`${k}1`, `${k}2`])];
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const unitValue = (id) => ITEMS[id].price ?? (ITEMS[id].sell ? ITEMS[id].sell * 5 : 500);
const bmBucket = () => Math.floor(Date.now() / (6 * 3600 * 1000));
function shopOffers(p, shopId) {
  const log = p.shopLog, today = Math.floor(Date.now() / 86400000);
  if (log.day !== today) { log.day = today; log.counts = {}; }
  const out = [], def = SHOP_DEFS[shopId];
  const disc = def.cur === 'gold' ? VIP_PERK.disc[vipLevel(p)] : 0; // VIP giảm giá ở mọi cửa hàng trả bằng vàng
  const apply = (n) => (n <= 0 ? 0 : Math.max(1, Math.round(n * (1 - disc))));
  if (shopId === 'chodien') {
    const bucket = bmBucket(), r = rng(bucket * 2654435761), pool = [...BM_POOL];
    for (let n = 0; n < 10 && pool.length; n++) {
      const pk = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const gear = pk.includes(':'), qty = gear ? 1 : 1 + Math.floor(r() * 3), flash = r() < 0.25;
      const id = resolveDrop(pk, p.cls, p.fac);
      if (!id || !ITEMS[id]) continue;
      out.push({ key: `bm${bucket}-${pk}`, id, qty, price: apply(unitValue(id) * qty * (gear ? 2.5 : 1.8) * (flash ? 0.7 : 1)), lim: gear ? 1 : 2, flash });
    }
  } else if (shopId === 'thuongnhan') {
    const r = rng(today * 40503 + 17), pool = [...THUONG_POOL];
    for (let n = 0; n < 7 && pool.length; n++) {
      const id = pool.splice(Math.floor(r() * pool.length), 1)[0], qty = 1 + Math.floor(r() * 3), off = 0.25 + r() * 0.25;
      if (!ITEMS[id]) continue;
      out.push({ key: `tn${today}-${id}`, id, qty, price: apply(unitValue(id) * qty * (1 - off)), lim: 3, flash: off >= 0.4 });
    }
  } else {
    if (def.needFac && !p.fac) return [];
    for (const it of def.items) {
      if (it.fac && it.fac !== p.fac) continue;
      const id = resolveDrop(it.item, p.cls, p.fac);
      if (!id || !ITEMS[id]) continue;
      let locked = null;
      if (shopId === 'tongmon' && !p.guild) locked = 'Cần gia nhập tông môn';
      else if (it.req?.maxLv && p.level > it.req.maxLv) locked = `Chỉ dành cho cấp ≤ ${it.req.maxLv}`;
      else if (it.req?.lv && p.level < it.req.lv) locked = `Cần cấp ${it.req.lv}`;
      else if (it.req?.tower && p.towerBest < it.req.tower) locked = `Cần leo tháp tầng ${it.req.tower}`;
      else if (it.req?.guildLv && (db.guilds[p.guild]?.lv || 0) < it.req.guildLv) locked = `Cần tông môn cấp ${it.req.guildLv}`;
      else if (ITEMS[id].lv > p.level) locked = `Cần cấp ${ITEMS[id].lv}`;
      const price = it.price != null ? it.price : unitValue(id) * it.qty * (it.mult || 1);
      out.push({ key: it.k, id, qty: it.qty, price: apply(price), lim: it.lim, locked });
    }
  }
  for (const o of out) o.used = log.counts[`${shopId}:${o.key}`] || 0;
  return out;
}
function buyOffer(p, shopId, key) {
  const def = SHOP_DEFS[shopId]; if (!def) return { ok: false, msg: '❌ Cửa hàng không tồn tại.' };
  if (def.needFac && !p.fac) return { ok: false, msg: '⚖️ Bạn cần chọn phe trước (`/phe chon`).' };
  const o = shopOffers(p, shopId).find((x) => x.key === key);
  if (!o) return { ok: false, msg: '❌ Mặt hàng này đã hết hạn hoặc không tồn tại (Chợ Đen đổi hàng mỗi 6 giờ, Thương Nhân mỗi ngày).' };
  if (o.locked) return { ok: false, msg: `🔒 ${o.locked}.` };
  if (o.used >= o.lim) return { ok: false, msg: `⛔ Bạn đã mua hết lượt hôm nay (${o.used}/${o.lim}).` };
  const [field, cname, cemoji] = CUR[def.cur];
  const asItem = field.startsWith('inv:'), iid = asItem ? field.slice(4) : null;
  const bal = asItem ? count(p, iid) : (p[field] || 0);
  if (bal < o.price) return { ok: false, msg: `${cemoji} Cần **${fmt(o.price)}** ${cname} (bạn có ${fmt(bal)}).` };
  if (asItem) removeItem(p, iid, o.price); else p[field] -= o.price;
  addItem(p, o.id, o.qty); p.shopLog.counts[`${shopId}:${key}`] = o.used + 1;
  return { ok: true, msg: `✅ Đã mua **${o.qty}x ${label(o.id)}** với **${fmt(o.price)}** ${cemoji}.` };
}
function tiemView(p, uid, shopId = 'hub', note = '') {
  const wallet = `🪙 ${fmt(p.gold)} • 🥇 ${fmt(p.vd)} Vinh Dự • 🗼 ${fmt(p.tl)} Tháp Lệnh • 🏯 ${fmt(p.gp)} Cống Hiến • 💠 ${fmt(count(p, 'linhthach'))} Linh Thạch • 💎 ${fmt(p.nb)} Nguyên Bảo`;
  const shopMenu = new StringSelectMenuBuilder().setCustomId(`tiemsel:${uid}`).setPlaceholder('🏪 Chọn cửa hàng...')
    .addOptions(Object.entries(SHOP_DEFS).map(([k, d]) => ({ label: d.name, value: k, emoji: d.emoji, description: d.desc.slice(0, 100), default: k === shopId })));
  if (shopId === 'hub' || !SHOP_DEFS[shopId]) {
    const e = embed(0x16a085).setTitle('🏪 Các cửa hàng đặc biệt')
      .setDescription(`${note ? `${note}\n\n` : ''}${wallet}\n\n${Object.values(SHOP_DEFS).map((d) => `${d.emoji} **${d.name}** (${CUR[d.cur][2]} ${CUR[d.cur][1]})\n┗ *${d.desc}*`).join('\n')}\n\n⏱️ Giới hạn mua reset mỗi ngày (7h sáng giờ VN) • VIP được giảm giá ở mọi cửa hàng trả bằng vàng\n🏮 Tiệm Cửu Thúc (vàng): \`/cuahang\` • 💎 Cửa hàng Nguyên Bảo: \`/vipshop\``);
    return { content: '', embeds: [e], components: [row(shopMenu)] };
  }
  const def = SHOP_DEFS[shopId], offers = shopOffers(p, shopId), cur = CUR[def.cur];
  const lines = offers.map((o) => `${o.locked ? '🔒 ' : ''}${ITEMS[o.id].emoji} **${ITEMS[o.id].name}**${o.qty > 1 ? ` x${o.qty}` : ''}${o.flash ? ' 🔥' : ''} – ${o.price ? `${fmt(o.price)}${cur[2]}` : '**Miễn phí**'} • ${o.used}/${o.lim}${o.locked ? ` • *${o.locked}*` : ''}`);
  const refresh = shopId === 'chodien' ? `\n⏰ Đổi hàng <t:${(bmBucket() + 1) * 6 * 3600}:R>` : '';
  const e = embed(0x16a085).setTitle(`${def.emoji} ${def.name}`).setDescription(`${note ? `${note}\n\n` : ''}${wallet}${refresh}${vipLevel(p) && def.cur === 'gold' ? `\n👑 VIP ${vipLevel(p)}: giảm ${pct(VIP_PERK.disc[vipLevel(p)])} giá` : ''}${shopId === 'thuongnhan' ? `\n⏰ Đổi hàng <t:${(Math.floor(Date.now() / 86400000) + 1) * 86400}:R>` : ''}\n\n${lines.join('\n') || (def.needFac && !p.fac ? '*Cần chọn phe (`/phe chon`) để vào cửa hàng này.*' : '*Hết hàng*')}`);
  const rows = [row(shopMenu)];
  if (offers.length) {
    rows.push(row(new StringSelectMenuBuilder().setCustomId(`tiembuy:${shopId}:${uid}`).setPlaceholder(`🛒 Chọn món để mua (${cur[1]})...`)
      .addOptions(offers.slice(0, 25).map((o) => ({ label: `${ITEMS[o.id].name}${o.qty > 1 ? ` x${o.qty}` : ''}`.slice(0, 100), value: o.key, emoji: ITEMS[o.id].emoji, description: `${fmt(o.price)} ${cur[1]} • đã mua ${o.used}/${o.lim}`.slice(0, 100) })))));
  }
  return { content: '', embeds: [e], components: rows };
}
const passiveText = (c) => {
  const parts = [];
  if (c.perk) parts.push(perkText(c.perk));
  if (c.goldBonus) parts.push(`+${pct(c.goldBonus)} vàng nhận được`);
  if (c.expBonus) parts.push(`+${pct(c.expBonus)} EXP nhận được`);
  if (c.dropBonus) parts.push(`+${pct(c.dropBonus)} tỉ lệ rơi vật phẩm`);
  if (c.potBoost) parts.push(`đan hồi máu mạnh hơn ${pct(c.potBoost - 1)}`);
  if (c.petBoost) parts.push(`đệ tử mạnh hơn ${pct(c.petBoost - 1)}`);
  return parts.join(', ') || '*không có*';
};

/* ═══════════════════════════ LUYỆN TUYỆT KỸ ═══════════════════════════ */
const SKL_MAX = 10, SKL_BONUS = 0.06; // mỗi cấp +6% sát thương chiêu, tối đa +60%
const sklLv = (p, idx) => p.skl?.[idx] || 0;
function skillMult(p, sk) { return sk.mult * (1 + SKL_BONUS * sklLv(p, CLASSES[p.cls].skills.indexOf(sk))); }
const sklCost = (L) => ({ gold: Math.round(600 * Math.pow(L + 1, 1.6)), lt: (L + 1) * 2 });
const sklNeedLv = (sk, L) => sk.lv + 2 * L;
function sklUp(p, idx) {
  const sk = CLASSES[p.cls].skills[idx];
  if (!sk) return { ok: false, msg: '❌ Tuyệt kỹ không tồn tại.' };
  const L = sklLv(p, idx);
  if (L >= SKL_MAX) return { ok: false, msg: `⭐ **${sk.name}** đã đạt cấp tối đa ${SKL_MAX}!` };
  if (p.level < sk.lv) return { ok: false, msg: `🔒 Cần cấp ${sk.lv} để mở **${sk.name}**.` };
  const need = sklNeedLv(sk, L);
  if (p.level < need) return { ok: false, msg: `⛔ Luyện **${sk.name}** lên cấp ${L + 1} cần nhân vật cấp **${need}** (đang cấp ${p.level}).` };
  const c = sklCost(L);
  if (p.gold < c.gold) return { ok: false, msg: `💸 Cần **${fmt(c.gold)}** vàng (bạn có ${fmt(p.gold)}).` };
  if (count(p, 'linhthach') < c.lt) return { ok: false, msg: `💠 Cần **${c.lt}** Linh Thạch (bạn có ${count(p, 'linhthach')}).` };
  p.gold -= c.gold; removeItem(p, 'linhthach', c.lt);
  p.skl ??= {}; p.skl[idx] = L + 1;
  return { ok: true, msg: `🔥 Luyện **${sk.name}** lên cấp **${L + 1}**! Sát thương ×${(sk.mult * (1 + SKL_BONUS * (L + 1))).toFixed(2)}` };
}
function sklView(p, uid, note = '') {
  const c = CLASSES[p.cls];
  const lines = c.skills.map((sk, n) => {
    const L = sklLv(p, n), stars = '⭐'.repeat(L) + '▫️'.repeat(SKL_MAX - L);
    let tail;
    if (p.level < sk.lv) tail = `🔒 Mở ở cấp ${sk.lv}`;
    else if (L >= SKL_MAX) tail = '✅ **Đã đạt cấp tối đa**';
    else { const cs = sklCost(L), need = sklNeedLv(sk, L); tail = `Lên cấp ${L + 1}: ×${(sk.mult * (1 + SKL_BONUS * L)).toFixed(2)} → ×${(sk.mult * (1 + SKL_BONUS * (L + 1))).toFixed(2)} • ${fmt(cs.gold)}🪙 + ${cs.lt}💠${p.level < need ? ` • *cần cấp ${need}*` : ''}`; }
    return `**${n + 1}. ${sk.name}** (${sk.cost} LL) ${stars} ${L}/${SKL_MAX}\n┗ ${tail}`;
  });
  const e = embed(0xe67e22).setTitle(`🔥 Luyện Tuyệt Kỹ • ${c.emoji} ${c.name}`)
    .setDescription(`${note ? `${note}\n\n` : ''}💰 ${fmt(p.gold)} vàng • 💠 ${fmt(count(p, 'linhthach'))} Linh Thạch\nMỗi cấp tăng **+${pct(SKL_BONUS)}** sát thương chiêu (tối đa +${pct(SKL_BONUS * SKL_MAX)}). Cấp nhân vật yêu cầu tăng theo cấp chiêu.\n\n${lines.join('\n\n')}`);
  const btn = (n) => {
    const sk = c.skills[n], L = sklLv(p, n);
    return new ButtonBuilder().setCustomId(`skl:${n}:${uid}`).setLabel(L >= SKL_MAX ? `${sk.name} (MAX)` : `Luyện ${sk.name}`.slice(0, 80)).setEmoji('🔥')
      .setStyle(ButtonStyle.Primary).setDisabled(L >= SKL_MAX || p.level < sk.lv);
  };
  return { content: '', embeds: [e], components: [row(btn(0), btn(1), btn(2))] };
}

/* ═══════════════════════════ NHIỆM VỤ THEO PHÁI & CẢNH GIỚI ═══════════════════════════ */
// Mỗi phái có người giao việc, lời nhắn và loại nhiệm vụ ưa thích riêng. Cảnh giới càng cao: nhiều loại nhiệm vụ
// khó mở ra, số lượng yêu cầu và phần thưởng lớn hơn.
const CLASS_QUEST = {
  maoson:     { giver: 'Cửu Thúc', types: ['undead', 'talisman'], line: 'Yêu khí dâng cao, ngươi hãy thay ta trừ tà vệ đạo.' },
  phuchu:     { giver: 'Phù Chú Tổ Sư', types: ['talisman', 'skill'], line: 'Chu sa đã sẵn, hãy vẽ phù thật chuẩn để diệt yêu.' },
  vodao:      { giver: 'Sư Phụ Võ Quán', types: ['stun', 'duel'], line: 'Luyện võ phải lên đài, ra đòn phải trúng đích.' },
  thieulam:   { giver: 'Phương Trượng', types: ['undead', 'heal'], line: 'A Di Đà Phật, mong thí chủ độ hóa oan hồn và cứu người.' },
  thucson:    { giver: 'Chưởng Môn Thục Sơn', types: ['skill', 'boss'], line: 'Kiếm tu phải lấy chiêu thức mà luận đạo, hãy chém đại yêu.' },
  nguthi:     { giver: 'Lão Thi Sư', types: ['undead', 'drop'], line: 'Cương thi là bạn của ta, nhưng yêu ma thì không. Đi thu về xương cốt.' },
  quydao:     { giver: 'Quỷ Đạo Lão Tổ', types: ['burn', 'crit'], line: 'Cho chúng cháy rụi, cho chúng biết thế nào là đau.' },
  caibang:    { giver: 'Bang Chủ Cái Bang', types: ['gold', 'drop'], line: 'Bang ta nghèo, nhờ đệ tử đi kiếm chút bạc và đồ về nuôi anh em.' },
  duocvuong:  { giver: 'Dược Vương Cốc Chủ', types: ['heal', 'drop'], line: 'Thuốc quý cần dược liệu, vừa chữa người vừa nhặt thảo dược.' },
  duongmon:   { giver: 'Đường Môn Trưởng Lão', types: ['crit', 'skill'], line: 'Ám khí quý ở chỗ trúng chỗ hiểm, hãy luyện cho chuẩn.' },
  phongthuy:  { giver: 'Phong Thủy Sư', types: ['skill', 'drop'], line: 'Thiên cơ chỉ dẫn, nơi nào có yêu khí nơi đó có bảo vật.' },
  cosu:       { giver: 'Cổ Sư Trưởng Lão', types: ['burn', 'undead'], line: 'Cổ trùng cần vật nuôi, hãy thiêu đốt rồi mang xác yêu về.' },
  vodang:     { giver: 'Chưởng Môn Võ Đang', types: ['duel', 'skill'], line: 'Lấy nhu thắng cương, hãy ra đài rèn thái cực.' },
  ngami:      { giver: 'Sư Thái Nga Mi', types: ['heal', 'undead'], line: 'Cứu người độ thế, hãy hồi phục cho mình và trừ ác ma.' },
  hoason:     { giver: 'Chưởng Môn Hoa Sơn', types: ['crit', 'duel'], line: 'Kiếm Hoa Sơn nhanh và chuẩn, hãy lên đài chứng minh.' },
  minhgiao:   { giver: 'Giáo Chủ Minh Giáo', types: ['burn', 'undead'], line: 'Thánh hỏa thiêu rụi tà ma, hỡi sứ giả hãy hành động.' },
  conlon:     { giver: 'Chưởng Môn Côn Lôn', types: ['stun', 'boss'], line: 'Băng phong vạn dặm, hãy đóng băng đại yêu cho ta.' },
  thiencogac: { giver: 'Thiên Cơ Lão Nhân', types: ['drop', 'gold'], line: 'Quẻ báo ngươi sắp gặp may, hãy ra ngoài nhặt vận.' },
};
const REALM_ADDR = ['đệ tử Luyện Khí', 'đạo hữu Trúc Cơ', 'chân nhân Kết Đan', 'đại năng Nguyên Anh', 'tiền bối Hóa Thần', 'thiên tôn Phản Hư'];
// Phần thưởng vật phẩm theo cảnh giới
const REALM_REWARD = [
  [['linhthach', 2], ['linhdan', 3]],
  [['linhthach', 4], ['tuvi1', 1], ['phutranthi', 3]],
  [['linhthach', 6], ['loithach', 2], ['tuvi2', 1]],
  [['loithach', 4], ['huyetngoc', 1], ['phubaoho', 1]],
  [['huyetngoc', 2], ['thienvanphu', 2], ['tuvi3', 1]],
  [['huyetngoc', 4], ['phubaoho', 2], ['tuvi3', 2]],
];
const QTYPES = {
  kill:     { base: 8,  diff: 1.0,  min: 0, text: (n) => `Diệt ${n} yêu ma` },
  killmap:  { base: 10, diff: 1.15, min: 0, text: (n, q) => `Diệt ${n} yêu ma tại ${MAPS[q.map].emoji} ${MAPS[q.map].name}` },
  undead:   { base: 6,  diff: 1.1,  min: 0, text: (n) => `Trừ tà: diệt ${n} cương thi / ma quỷ` },
  boss:     { base: 1,  diff: 2.0,  min: 1, text: (n) => `Hạ gục ${n} boss` },
  skill:    { base: 15, diff: 0.9,  min: 0, text: (n) => `Thi triển tuyệt kỹ ${n} lần trong chiến đấu` },
  talisman: { base: 5,  diff: 1.0,  min: 0, text: (n) => `Dùng ${n} lá phù chú trong chiến đấu` },
  heal:     { base: 5,  diff: 0.9,  min: 0, text: (n) => `Hồi phục sinh lực ${n} lần (đan dược hoặc chiêu hồi máu)` },
  crit:     { base: 12, diff: 1.0,  min: 0, text: (n) => `Tung ${n} đòn chí mạng` },
  stun:     { base: 5,  diff: 1.0,  min: 0, text: (n) => `Làm yêu ma choáng / định thân ${n} lần` },
  burn:     { base: 5,  diff: 1.0,  min: 0, text: (n) => `Thiêu đốt yêu ma ${n} lần` },
  gold:     { base: 0,  diff: 1.0,  min: 0, text: (n) => `Kiếm ${fmt(n)} vàng từ săn yêu` },
  drop:     { base: 6,  diff: 1.0,  min: 0, text: (n) => `Nhặt ${n} vật phẩm rơi từ yêu ma` },
  duel:     { base: 1,  diff: 1.5,  min: 1, text: (n) => `Thắng ${n} trận võ đài` },
  tower:    { base: 2,  diff: 1.4,  min: 1, text: (n) => `Leo thêm ${n} tầng Trấn Yêu Tháp` },
  enhance:  { base: 2,  diff: 1.3,  min: 1, text: (n) => `Cường hóa thành công ${n} lần` },
  craft:    { base: 2,  diff: 1.0,  min: 1, text: (n) => `Chế tạo ${n} lần ở lò luyện` },
  wb:       { base: 2,  diff: 1.5,  min: 2, text: (n) => `Tấn công Boss Thế Giới ${n} lần` },
};
const dayKey = () => Math.floor((Date.now() + 7 * 3600000) / 86400000);
const dailyN = (p) => (p.qDay?.day === dayKey() ? p.qDay.n : 0);
function bestMap(p) {
  const ms = Object.entries(MAPS).filter(([, m]) => m.lv <= p.level).sort((a, b) => b[1].lv - a[1].lv);
  return (ms[0] || Object.entries(MAPS)[0])[0];
}
function genQuest(p, exclude) {
  const r = Math.min(p.realm || 0, 5), cq = CLASS_QUEST[p.cls] || { giver: 'Cửu Thúc', types: [], line: 'Hãy giúp ta trừ yêu.' };
  const pool = [];
  for (const [type, d] of Object.entries(QTYPES)) {
    if (d.min > r || type === exclude) continue;
    const w = cq.types.includes(type) ? 8 : 3;
    for (let k = 0; k < w; k++) pool.push(type);
  }
  const type = pick(pool), d = QTYPES[type], jit = 0.85 + Math.random() * 0.3;
  const need = type === 'gold' ? Math.round((100 + p.level * 60) * (1 + 0.45 * r) * jit) : Math.max(1, Math.round(d.base * (1 + 0.45 * r) * jit));
  const q = { type, need, done: 0, realm: r, cls: p.cls, giver: cq.giver, t: Date.now() };
  if (type === 'killmap') q.map = bestMap(p);
  if (type === 'tower') q.start = p.towerBest;
  q.text = d.text(need, q);
  // phần thưởng: tăng theo cảnh giới, độ khó của loại nhiệm vụ
  const mult = d.diff * (1 + 0.5 * r);
  const items = REALM_REWARD[r].map(([id, n]) => [id, Math.max(1, Math.round(n * d.diff))]);
  if (Math.random() < 0.15) { const id = gearId(p.cls, pick(['treasure', 'charm']), Math.min(2, Math.floor(r / 2))); if (id) items.push([id, 1]); }
  q.reward = { gold: Math.round((200 + p.level * 40) * mult), exp: Math.round(expNeed(p.level) * (0.08 + 0.02 * r) * d.diff), items, nb: r >= 3 ? 3 * (r - 2) : 0 };
  return q;
}
function questProg(p, ev, n = 1, info = {}) {
  const q = p.quest;
  if (!q || q.done >= q.need) return;
  if (q.type === 'tower') {
    if (ev !== 'tower') return;
    const d = Math.min(q.need, Math.max(0, p.towerBest - (q.start || 0)));
    if (d > q.done) { q.done = d; q.changed = true; }
    return;
  }
  let add = 0;
  if (q.type === 'kill' && ev === 'kill') add = 1;
  else if (q.type === 'killmap' && ev === 'kill' && !info.tower && info.map === q.map) add = 1;
  else if (q.type === ev) add = n;
  if (add) { q.done = Math.min(q.need, q.done + add); q.changed = true; }
}
function questLine(p) {
  const q = p.quest;
  if (!q || !q.changed) return null;
  q.changed = false;
  return q.done >= q.need ? '📋 **Nhiệm vụ hoàn thành!** Dùng `/nhiemvu` để nhận thưởng.' : `📋 Nhiệm vụ: ${q.done}/${q.need}`;
}
function questRewardText(q) {
  const r = q.reward, parts = [`💰 ${fmt(r.gold)}`, `✨ ${fmt(r.exp)} EXP`];
  for (const [id, n] of r.items) parts.push(`${label(id)} x${n}`);
  if (r.nb) parts.push(`💎 ${r.nb} Nguyên Bảo`);
  return parts.join(' • ');
}
function questEmbed(p, note = '') {
  const q = p.quest, c = CLASSES[p.cls], cq = CLASS_QUEST[p.cls] || { line: '' };
  const done = q.done >= q.need;
  return embed(done ? 0x2ecc71 : 0x3498db).setTitle(`📋 Nhiệm vụ • ${c.emoji} ${c.name} • ${REALMS[q.realm]}`)
    .setDescription(`${note ? `${note}\n\n` : ''}*"${q.giver} nhắn ${REALM_ADDR[q.realm]}: ${cq.line}"*\n\n**${q.text}**\n${bar(q.done, q.need)} ${q.done}/${q.need}\n\n🎁 Thưởng: ${questRewardText(q)}\n${done ? '✅ **Hoàn thành!** Gõ /nhiemvu để nhận thưởng.' : `🔁 Đổi nhiệm vụ: /nhiemvu hanh_dong:Đổi (tốn ${fmt(500 * (q.realm + 1))} vàng)`}\n📅 Hôm nay đã hoàn thành: **${dailyN(p)}/3** (đủ 3 nhiệm vụ nhận thêm quà)`);
}
function claimQuest(p) {
  const q = p.quest, r = q.reward, lines = [`💰 +${fmt(r.gold)} vàng`, `✨ +${fmt(r.exp)} EXP`];
  p.gold += r.gold;
  for (const [id, n] of r.items) { addItem(p, id, n); lines.push(`🎁 ${label(id)} x${n}`); }
  if (r.nb) { p.nb += r.nb; lines.push(`💎 +${r.nb} Nguyên Bảo`); }
  if (gainExp(p, r.exp)) lines.push(`🎉 **LÊN CẤP ${p.level}!**`);
  p.questDone = (p.questDone || 0) + 1;
  const dk = dayKey();
  if (p.qDay?.day !== dk) p.qDay = { day: dk, n: 0 };
  p.qDay.n++;
  if (p.qDay.n === 3) { const lt = 3 + 2 * q.realm; addItem(p, 'linhthach', lt); p.nb += 5; lines.push(`🌟 **Đủ 3 nhiệm vụ hôm nay:** +${lt} 💠 Linh Thạch, +5 💎 Nguyên Bảo!`); }
  p.quest = null;
  return lines;
}

/* ═══════════════════════════ ĐỊNH NGHĨA LỆNH ═══════════════════════════ */
const itemOpt = (o, desc = 'Chọn vật phẩm', req = true) => o.setName('vatpham').setDescription(desc).setRequired(req).setAutocomplete(true);
const qtyOpt = (o) => o.setName('soluong').setDescription('Số lượng (mặc định 1)').setMinValue(1).setMaxValue(99);

const commands = [
  new SlashCommandBuilder().setName('batdau').setDescription('☯️ Nhập môn, tạo nhân vật đạo sĩ')
    .addStringOption((o) => o.setName('mon_phai').setDescription('Chọn môn phái').setRequired(true)
      .addChoices(...Object.entries(CLASSES).map(([value, c]) => ({ name: `${c.emoji} ${c.name}`, value }))))
    .addStringOption((o) => o.setName('phe').setDescription('Chọn phe luôn (hoặc chọn sau bằng /phe)').addChoices(...Object.entries(FACTIONS).map(([value, f]) => ({ name: `${f.emoji} ${f.name}`, value })))),
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
  new SlashCommandBuilder().setName('nhiemvu').setDescription('📋 Nhiệm vụ theo phái và cảnh giới: nhận, xem, nộp')
    .addStringOption((o) => o.setName('hanh_dong').setDescription('Hành động khác').addChoices({ name: 'Đổi nhiệm vụ (tốn vàng)', value: 'doi' })),
  new SlashCommandBuilder().setName('bxh').setDescription('🏆 Bảng xếp hạng đạo sĩ')
    .addStringOption((o) => o.setName('loai').setDescription('Loại xếp hạng').addChoices({ name: 'Cảnh giới & cấp độ', value: 'cap' }, { name: 'Danh vọng võ đài', value: 'danhvong' })),
  new SlashCommandBuilder().setName('khamngoc').setDescription('💎 Khảm bảo ngọc vào trang bị')
    .addStringOption((o) => itemOpt(o, 'Trang bị muốn khảm ngọc')),
  new SlashCommandBuilder().setName('trieuhoi').setDescription('🎲 Triệu hồi đệ tử (Thu Sinh, Văn Tài, Đình Đình...)')
    .addIntegerOption((o) => o.setName('so_lan').setDescription('Số lần').addChoices({ name: '1 lần (1.000 vàng)', value: 1 }, { name: '10 lần (9.000 vàng)', value: 10 })),
  new SlashCommandBuilder().setName('dedu').setDescription('🧑‍🤝‍🧑 Xem và chọn đệ tử đồng hành'),
  new SlashCommandBuilder().setName('thachdau').setDescription('🏟️ Thách đấu võ đài với người chơi khác')
    .addUserOption((o) => o.setName('nguoi').setDescription('Đối thủ').setRequired(true))
    .addIntegerOption((o) => o.setName('cuoc').setDescription('Vàng cược (tuỳ chọn)').setMinValue(0).setMaxValue(1000000)),
  new SlashCommandBuilder().setName('thap').setDescription('🗼 Leo Trấn Yêu Tháp (mỗi tầng mạnh hơn, 10 tầng có boss)')
    .addStringOption((o) => o.setName('hanh_dong').setDescription('Hành động').addChoices({ name: 'Leo tháp', value: 'leo' }, { name: 'Bảng xếp hạng tháp', value: 'bxh' })),
  new SlashCommandBuilder().setName('bosstg').setDescription('🌍 Boss Thế Giới – cả server cùng đánh'),
  new SlashCommandBuilder().setName('thanhtuu').setDescription('🏅 Xem thành tựu và đeo danh hiệu'),
  new SlashCommandBuilder().setName('tongmon').setDescription('🏯 Tông môn – cống hiến để cả nhóm mạnh lên')
    .addSubcommand((c) => c.setName('taolap').setDescription('Lập tông môn (5.000 vàng)').addStringOption((o) => o.setName('ten').setDescription('Tên tông môn (3-20 ký tự)').setRequired(true).setMinLength(3).setMaxLength(20)))
    .addSubcommand((c) => c.setName('thamgia').setDescription('Gia nhập tông môn').addStringOption((o) => o.setName('ten').setDescription('Tên tông môn').setRequired(true)))
    .addSubcommand((c) => c.setName('roi').setDescription('Rời tông môn'))
    .addSubcommand((c) => c.setName('thongtin').setDescription('Xem tông môn của bạn'))
    .addSubcommand((c) => c.setName('donggop').setDescription('Cống hiến vàng để nâng cấp tông môn').addIntegerOption((o) => o.setName('vang').setDescription('Số vàng').setRequired(true).setMinValue(100)))
    .addSubcommand((c) => c.setName('xephang').setDescription('Bảng xếp hạng tông môn')),
  new SlashCommandBuilder().setName('cho').setDescription('🏪 Chợ người chơi – mua bán với nhau')
    .addSubcommand((c) => c.setName('xem').setDescription('Xem hàng đang bán')
      .addStringOption((o) => o.setName('loai').setDescription('Lọc theo loại').addChoices(...Object.entries(TYPE_INFO).map(([value, [, name]]) => ({ name, value })))))
    .addSubcommand((c) => c.setName('dang').setDescription('Đăng bán vật phẩm')
      .addStringOption((o) => itemOpt(o, 'Món muốn bán'))
      .addIntegerOption((o) => o.setName('gia').setDescription('Giá mỗi cái (vàng)').setRequired(true).setMinValue(1).setMaxValue(100000000))
      .addIntegerOption(qtyOpt))
    .addSubcommand((c) => c.setName('mua').setDescription('Mua theo mã').addIntegerOption((o) => o.setName('ma').setDescription('Mã món hàng (#)').setRequired(true).setMinValue(1)))
    .addSubcommand((c) => c.setName('huy').setDescription('Gỡ món đã đăng').addIntegerOption((o) => o.setName('ma').setDescription('Mã món hàng (#)').setRequired(true).setMinValue(1)))
    .addSubcommand((c) => c.setName('cuatoi').setDescription('Xem hàng bạn đang bán')),
  new SlashCommandBuilder().setName('phe').setDescription('⚖️ Phe phái – Chính Đạo, Ma Đạo, Tiêu Dao')
    .addSubcommand((c) => c.setName('xem').setDescription('Xem ba phe và bảng điểm tuần'))
    .addSubcommand((c) => c.setName('chon').setDescription('Chọn phe (miễn phí lần đầu)').addStringOption((o) => o.setName('phe').setDescription('Phe muốn gia nhập').setRequired(true).addChoices(...Object.entries(FACTIONS).map(([value, f]) => ({ name: `${f.emoji} ${f.name}`, value })))))
    .addSubcommand((c) => c.setName('doi').setDescription('Đổi phe (20.000 vàng hoặc Thẻ Đổi Phe, hồi chiêu 3 ngày)').addStringOption((o) => o.setName('phe').setDescription('Phe muốn chuyển sang').setRequired(true).addChoices(...Object.entries(FACTIONS).map(([value, f]) => ({ name: `${f.emoji} ${f.name}`, value }))))),
  new SlashCommandBuilder().setName('vip').setDescription('👑 Xem VIP và nhận quà hằng ngày')
    .addSubcommand((c) => c.setName('xem').setDescription('Xem cấp VIP và quyền lợi'))
    .addSubcommand((c) => c.setName('nhanqua').setDescription('Nhận quà VIP hằng ngày')),
  new SlashCommandBuilder().setName('vipshop').setDescription('💎 Cửa hàng đổi bằng Nguyên Bảo'),
  new SlashCommandBuilder().setName('luudata').setDescription('💾 Xem trạng thái lưu dữ liệu và tải bản sao nhân vật'),
  new SlashCommandBuilder().setName('admin').setDescription('🛠️ Quản trị bot (chỉ admin)')
    .addSubcommand((c) => c.setName('nguyenbao').setDescription('Cấp Nguyên Bảo (tính vào điểm VIP)').addUserOption((o) => o.setName('nguoi').setDescription('Người nhận').setRequired(true)).addIntegerOption((o) => o.setName('so').setDescription('Số Nguyên Bảo').setRequired(true).setMinValue(1).setMaxValue(1000000)))
    .addSubcommand((c) => c.setName('vang').setDescription('Cấp vàng').addUserOption((o) => o.setName('nguoi').setDescription('Người nhận').setRequired(true)).addIntegerOption((o) => o.setName('so').setDescription('Số vàng').setRequired(true).setMinValue(1).setMaxValue(100000000)))
    .addSubcommand((c) => c.setName('vatpham').setDescription('Cấp vật phẩm').addUserOption((o) => o.setName('nguoi').setDescription('Người nhận').setRequired(true)).addStringOption((o) => itemOpt(o, 'Vật phẩm')).addIntegerOption(qtyOpt))
    .addSubcommand((c) => c.setName('vip').setDescription('Đặt cấp VIP').addUserOption((o) => o.setName('nguoi').setDescription('Người chơi').setRequired(true)).addIntegerOption((o) => o.setName('cap').setDescription('Cấp VIP 0-5').setRequired(true).setMinValue(0).setMaxValue(5)))
    .addSubcommand((c) => c.setName('thongke').setDescription('Thống kê bot và dữ liệu'))
    .addSubcommand((c) => c.setName('saoluu').setDescription('Sao lưu dữ liệu ngay'))
    .addSubcommand((c) => c.setName('xuatdata').setDescription('Tải toàn bộ file dữ liệu')),
  new SlashCommandBuilder().setName('tiem').setDescription('🏪 11 cửa hàng đặc biệt: Chợ Đen, Lò Rèn, Đan Dược, Phù Chú, Bảo Ngọc, Thương Nhân...'),
  new SlashCommandBuilder().setName('tinhluyen').setDescription('🔥 Tinh luyện trang bị: thêm dòng hiệu ứng ngẫu nhiên')
    .addStringOption((o) => itemOpt(o, 'Trang bị muốn tinh luyện')),
  new SlashCommandBuilder().setName('thangpham').setDescription('🌟 Thăng phẩm trang bị: Phàm → Linh → Bảo → Tiên → Thần')
    .addStringOption((o) => itemOpt(o, 'Trang bị muốn thăng phẩm')),
  new SlashCommandBuilder().setName('congphap').setDescription('📖 Luyện công pháp để tăng chỉ số vĩnh viễn'),
  new SlashCommandBuilder().setName('luyenkynang').setDescription('🔥 Luyện tuyệt kỹ: tăng sát thương từng chiêu (tối đa cấp 10)'),
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
  const eq = Object.entries(SLOT_NAME).map(([slot, nm]) => `${nm}: ${p.equip[slot] ? dname(p, p.equip[slot]) + gemIcons(p, p.equip[slot]) : '*trống*'}`).join('\n');
  const pkLines = Object.entries(pk).filter(([, v]) => v > 0).map(([k, v]) => PERK_TEXT[k](v)).join(' • ');
  const cap = capOf(p);
  const e = embed(0xf1c40f)
    .setTitle(`${c.emoji} ${p.name}${vipLevel(p) ? ` 👑VIP${vipLevel(p)}` : ''}${titleName(p) ? ` 「${titleName(p)}」` : ''} • ${c.name}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: '🌌 Cảnh giới', value: `**${REALMS[p.realm]}** • Cấp **${p.level}/${cap}**\n${bar(p.exp, need)} ${fmt(p.exp)}/${fmt(need)}${atBottleneck(p) ? '\n⚡ **Đã chạm bình cảnh – dùng `/dokiep`!**' : ''}`, inline: false },
      { name: '❤️ HP', value: `${fmt(p.hp)}/${fmt(s.maxHp)}`, inline: true },
      { name: '🔷 Linh lực', value: `${fmt(p.mp)}/${fmt(s.maxMp)}`, inline: true },
      { name: '💰 Vàng', value: fmt(p.gold), inline: true },
      { name: '⚔️ Công', value: `${s.atk}`, inline: true },
      { name: '🛡️ Thủ', value: `${s.def}`, inline: true },
      { name: '🌩️ Độ kiếp', value: `${p.kiepDone} lần`, inline: true },
      { name: '🏅 Danh vọng', value: `${p.honor}`, inline: true },
      { name: '🧑‍🤝‍🧑 Đệ tử', value: p.pet && p.pets[p.pet] ? `${PETS[p.pet].emoji} ${PETS[p.pet].name} ${'⭐'.repeat(p.pets[p.pet].star)}` : '*chưa có*', inline: true },
      { name: '🏯 Tông môn', value: p.guild && db.guilds[p.guild] ? `${db.guilds[p.guild].name} (Lv${db.guilds[p.guild].lv})` : '*chưa có*', inline: true },
      { name: '🗼 Trấn Yêu Tháp', value: `Tầng ${p.towerBest}`, inline: true },
      { name: '⚖️ Phe', value: p.fac ? `${FACTIONS[p.fac].emoji} ${FACTIONS[p.fac].name}${leadingFaction() === p.fac ? ' 👑' : ''}` : '*chưa chọn (`/phe chon`)*', inline: true },
      { name: '👑 VIP', value: vipLevel(p) ? `VIP ${vipLevel(p)} (${fmt(p.vipPts)} điểm)` : 'Thường', inline: true },
      { name: '💎 Nguyên Bảo', value: fmt(p.nb), inline: true },
      { name: '🎫 Tiền tệ khác', value: `🥇 ${fmt(p.vd)} Vinh Dự • 🗼 ${fmt(p.tl)} Tháp Lệnh • 🏯 ${fmt(p.gp)} Cống Hiến`, inline: false },
      { name: '🎽 Trang bị', value: eq, inline: false },
    );
  if (pkLines) e.addFields({ name: '🔱 Hiệu ứng pháp bảo', value: pkLines, inline: false });
  const bf = Object.entries(p.buffs || {}).filter(([, b]) => b.until > Date.now()).map(([k, b]) => `${BUFF_NAME[k]} +${pct(b.v)} (<t:${Math.floor(b.until / 1000)}:R>)`);
  if (bf.length) e.addFields({ name: '✨ Bùa phúc đang chạy', value: bf.join(' • '), inline: false });
  e.addFields({ name: '📊 Chiến tích', value: `Yêu ma đã diệt: **${fmt(p.kills)}** • Boss: **${p.bossKills}** • Bại trận: **${p.deaths}**`, inline: false });
  return e;
}

const handlers = {
  async batdau(i) {
    if (db.players[i.user.id]) return i.reply({ content: '☯️ Bạn đã có nhân vật rồi! Dùng `/nhanvat` để xem.', flags: EPH });
    const cls = i.options.getString('mon_phai');
    const np = newPlayer(cls, i.user.displayName);
    const pheChon = i.options.getString('phe');
    if (pheChon) { np.fac = pheChon; np.facAt = Date.now(); }
    db.players[i.user.id] = np; save();
    const c = CLASSES[cls];
    return i.reply({ embeds: [embed(0xf1c40f).setTitle(`${c.emoji} Chào mừng ${c.name}!`)
      .setDescription(`*"Ta là Cửu Thúc, đạo sĩ Mao Sơn. Từ nay ngươi là đệ tử của ta."*\n\n${c.desc}\n\n🎁 Quà nhập môn: **200 vàng**, 3 Linh Đan, 2 Phù Trấn Thi, 2 Gạo Nếp.${cls === 'nguthi' ? '\n🧟 Tặng thêm đệ tử **Tiểu Cương Thi**!' : ''}\n⚖️ Nhớ chọn phe bằng \`/phe chon\` để nhận buff và Lệnh bài phe.\n\nGõ \`/trogiup\` để xem hướng dẫn, \`/cuahang\` để sắm đồ, \`/sanquy\` để đi trừ tà!`)] });
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
      const fx = [`×${skillMult(p, sk).toFixed(2)}${sk.hits ? ` x${sk.hits} đòn` : ''}`];
      if (sk.ignoreDef) fx.push('xuyên giáp');
      if (sk.heal) fx.push(`hồi ${pct(sk.heal)} HP`);
      if (sk.stun) fx.push(`${pct(sk.stun)} choáng`);
      if (sk.burn) fx.push(`thiêu đốt ${sk.burn.t} lượt`);
      if (sk.shield) fx.push(`giảm ${pct(sk.shield.pct)} sát thương ${sk.shield.t} lượt`);
      if (sk.lifesteal) fx.push(`hút ${pct(sk.lifesteal)} máu`);
      if (sk.vsUndead) fx.push(`×${sk.vsUndead} lên ma/quỷ/cương thi`);
      if (sk.curse) fx.push(`nguyền rủa −${pct(sk.curse.pct)} sức mạnh ${sk.curse.t} lượt`);
      return `${p.level >= sk.lv ? '✅' : '🔒'} **${n + 1}. ${sk.name}** (Lv${sk.lv}, ${sk.cost} LL${sklLv(p, n) ? `, ⭐${sklLv(p, n)}/${SKL_MAX}` : ''})\n┗ ${fx.join(', ')}`;
    });
    return i.reply({ embeds: [embed(0x3498db).setTitle(`✨ Tuyệt kỹ ${c.emoji} ${c.name}`).setDescription(`${lines.join('\n')}\n\n**Nội tại:** ${passiveText(c)}\n🔥 Nâng cấp chiêu: \`/luyenkynang\``)], flags: EPH });
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
    if (!owns(p, id)) { delete p.enh[id]; delete p.aff[id]; delete p.grade[id]; releaseGems(p, id); }
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
    if (!it || !['potion', 'chest'].includes(it.type) || !count(p, id)) return i.reply({ content: '❌ Bạn không có vật phẩm đó.', flags: EPH });
    if (it.use.exp && atBottleneck(p)) return i.reply({ content: '⚡ Bạn đã chạm bình cảnh, không thể hấp thụ thêm EXP. Hãy dùng `/dokiep` trước!', flags: EPH });
    const s = stats(p);
    removeItem(p, id);
    if (it.use.box) {
      const got = openBox(p, it.use.box); save();
      return i.reply({ embeds: [embed(0xf39c12).setTitle(`${it.emoji} ${p.name} mở ${it.name}!`).setDescription(got.join('\n'))] });
    }
    if (it.use.buff) {
      p.buffs ??= {};
      const b = it.use.buff, now = Date.now(), cur = p.buffs[b.k];
      p.buffs[b.k] = { v: b.v, until: (cur && cur.until > now ? cur.until : now) + b.mins * 60000 }; save();
      return i.reply({ content: `${it.emoji} Dùng **${it.name}**: +${pct(b.v)} ${BUFF_NAME[b.k]}, hiệu lực đến <t:${Math.floor(p.buffs[b.k].until / 1000)}:R> (dùng thêm sẽ cộng dồn thời gian).`, flags: EPH });
    }
    let extra = '';
    if (it.use.heal) p.hp = Math.min(s.maxHp, p.hp + Math.round(it.use.heal * (CLASSES[p.cls].potBoost || 1)));
    if (it.use.mana) p.mp = Math.min(s.maxMp, p.mp + it.use.mana);
    if (it.use.exp) { const ups = gainExp(p, it.use.exp); extra = ` • ✨ +${fmt(it.use.exp)} EXP${ups ? ` 🎉 lên cấp ${p.level}!` : ''}`; }
    save();
    return i.reply({ content: `${it.emoji} Dùng **${it.name}** → ❤️ ${fmt(p.hp)}/${fmt(s.maxHp)} • 🔷 ${fmt(p.mp)}/${fmt(s.maxMp)}${extra}`, flags: EPH });
  },

  async trangbi(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham'), it = ITEMS[id];
    if (!it || !SLOT_OF[it.type] || !count(p, id)) return i.reply({ content: '❌ Món này không phải trang bị hoặc bạn không có.', flags: EPH });
    if (it.cls && it.cls !== p.cls) return i.reply({ content: `⛔ ${label(id)} chỉ dành cho **${CLASSES[it.cls].name}**.`, flags: EPH });
    if (it.fac && it.fac !== p.fac) return i.reply({ content: `⛔ ${label(id)} chỉ dành cho phe **${FACTIONS[it.fac].name}**.`, flags: EPH });
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
    const mine = Object.entries(RECIPES).filter(([rid]) => (!ITEMS[rid].cls || ITEMS[rid].cls === p.cls) && (!ITEMS[rid].fac || ITEMS[rid].fac === p.fac));
    if (!id) {
      const text = mine.map(([rid, r]) =>
        `${label(rid)} x${r.out}${r.gold ? ` (${fmt(r.gold)}🪙)` : ''}\n┗ ${Object.entries(r.need).map(([n, q]) => `${ITEMS[n].emoji}${ITEMS[n].name} x${q}`).join(' + ')}`).join('\n\n');
      return i.reply({ embeds: [embed(0xd35400).setTitle('🔥 Lò luyện của Cửu Thúc').setDescription(text.slice(0, 4000))], flags: EPH });
    }
    const r = RECIPES[id];
    if (!r || (ITEMS[id].cls && ITEMS[id].cls !== p.cls) || (ITEMS[id].fac && ITEMS[id].fac !== p.fac)) return i.reply({ content: '❌ Không có công thức phù hợp. Dùng `/chetao` để xem danh sách.', flags: EPH });
    const times = i.options.getInteger('soluong') || 1;
    for (const [n, q] of Object.entries(r.need)) {
      if (count(p, n) < q * times) return i.reply({ content: `❌ Thiếu nguyên liệu: cần **${q * times}x ${label(n)}**, bạn có ${count(p, n)}.`, flags: EPH });
    }
    if (p.gold < r.gold * times) return i.reply({ content: `💸 Cần **${fmt(r.gold * times)}** vàng phí luyện.`, flags: EPH });
    for (const [n, q] of Object.entries(r.need)) removeItem(p, n, q * times);
    p.gold -= r.gold * times; addItem(p, id, r.out * times); questProg(p, 'craft', times); save();
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
    p.gold += gold; p.nb += 5; addItem(p, 'linhdan', 2); addItem(p, 'linhthach', 1);
    const lines = [`💰 +${fmt(gold)} vàng`, `✨ +${exp} EXP`, '💊 +2 Linh Đan', '💠 +1 Linh Thạch', '💎 +5 Nguyên Bảo'];
    if (p.streak % 7 === 0) { addItem(p, 'phuloi', 2); addItem(p, 'dailinhdan', 1); addItem(p, 'thienvanphu', 1); lines.push('🎁 **Thưởng chuỗi 7 ngày:** 2 Phù Lôi + 1 Đại Linh Đan + 1 Thiên Vận Phù!'); }
    if (gainExp(p, exp)) lines.push(`🎉 **LÊN CẤP ${p.level}!**`);
    if (atBottleneck(p)) lines.push('⚡ Bạn đã chạm bình cảnh – dùng `/dokiep`!');
    save();
    return i.reply({ embeds: [embed(0x1abc9c).setTitle(`🗓️ Điểm danh ngày ${p.streak}`).setDescription(lines.join('\n'))] });
  },

  async toathien(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const wait = meditateCd(p) - (Date.now() - p.lastMeditate);
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
    if (i.options.getString('hanh_dong') === 'doi') {
      if (!p.quest) return i.reply({ content: '📋 Bạn chưa có nhiệm vụ để đổi. Gõ /nhiemvu để nhận.', flags: EPH });
      const cost = 500 * (p.quest.realm + 1);
      if (p.gold < cost) return i.reply({ content: `💸 Đổi nhiệm vụ tốn **${fmt(cost)}** vàng (bạn có ${fmt(p.gold)}).`, flags: EPH });
      p.gold -= cost; p.quest = genQuest(p, p.quest.type); save();
      return i.reply({ embeds: [questEmbed(p, `🔁 Đã đổi nhiệm vụ (−${fmt(cost)} vàng)`)], flags: EPH });
    }
    if (!p.quest) { p.quest = genQuest(p); save(); return i.reply({ embeds: [questEmbed(p, '📜 **Nhiệm vụ mới!**')] }); }
    if (p.quest.done < p.quest.need) return i.reply({ embeds: [questEmbed(p)], flags: EPH });
    const lines = claimQuest(p); save();
    return i.reply({ embeds: [embed(0x2ecc71).setTitle('✅ Hoàn thành nhiệm vụ!').setDescription(`${lines.join('\n')}\n\nGõ /nhiemvu để nhận nhiệm vụ mới.`)] });
  },

  async bxh(i) {
    const honor = i.options.getString('loai') === 'danhvong';
    const top = Object.values(db.players)
      .sort(honor ? (a, b) => b.honor - a.honor : (a, b) => b.realm - a.realm || b.level - a.level || b.exp - a.exp).slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const text = top.map((p, n) => `${medals[n] || `**${n + 1}.**`} ${CLASSES[p.cls].emoji} **${p.name}** – ${honor ? `🏅 ${p.honor} danh vọng` : `${REALMS[p.realm]} Cấp ${p.level} • ${fmt(p.kills)} yêu ma`}`).join('\n') || '*Chưa có ai*';
    return i.reply({ embeds: [embed(0xf1c40f).setTitle(honor ? '🏟️ Bảng danh vọng võ đài' : '🏆 Bảng xếp hạng đạo sĩ').setDescription(text)] });
  },

  async khamngoc(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham');
    if (!canEnhance(id) || !owns(p, id)) return i.reply({ content: '❌ Bạn không sở hữu món trang bị này.', flags: EPH });
    return i.reply(gemView(p, i.user.id, id));
  },

  async trieuhoi(i) {
    const p = getPlayer(i); if (!p) return;
    const n = i.options.getInteger('so_lan') || 1, useTicket = count(p, 'vetrieuhoi') >= n, cost = useTicket ? 0 : (n === 10 ? PET_COST * 9 : PET_COST);
    if (p.gold < cost) return i.reply({ content: `💸 Cần **${fmt(cost)}** vàng (hoặc ${n} 🎟️ Vé Triệu Hồi) để triệu hồi.`, flags: EPH });
    p.gold -= cost; if (useTicket) removeItem(p, 'vetrieuhoi', n);
    const res = Array.from({ length: n }, () => summonOnce(p));
    save();
    const icon = { R: '⚪', SR: '🟣', SSR: '🌟' };
    return i.reply({ embeds: [embed(0x16a085).setTitle(useTicket ? `🎟️ Triệu hồi bằng ${n} vé` : '🎲 Triệu hồi đệ tử')
      .setDescription(`${res.map((r) => `${icon[r.rar]} ${PETS[r.id].emoji} **${PETS[r.id].name}** \`${r.rar}\` – ${r.note}`).join('\n')}\n\n💰 Còn ${fmt(p.gold)} vàng • Bảo đảm SSR: ${p.pity}/30\nDùng \`/dedu\` để chọn đệ tử đồng hành.`)] });
  },

  async dedu(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ ...petView(p, i.user.id), flags: EPH });
  },

  async thachdau(i) {
    const p = getPlayer(i); if (!p) return;
    const target = i.options.getUser('nguoi'), bet = i.options.getInteger('cuoc') || 0;
    if (target.id === i.user.id || target.bot) return i.reply({ content: '😅 Bạn không thể thách đấu chính mình hoặc bot.', flags: EPH });
    const tp = db.players[target.id];
    if (!tp) return i.reply({ content: 'Đối thủ chưa nhập môn.', flags: EPH });
    if (inFight(i) || fights.has(target.id)) return i.reply({ content: '⚔️ Một trong hai người đang trong trận chiến.', flags: EPH });
    if (Date.now() - p.lastDuel < 60000) return i.reply({ content: '⏳ Hãy nghỉ một chút rồi hẵng thách đấu tiếp (hồi chiêu 60 giây).', flags: EPH });
    if (p.gold < bet || tp.gold < bet) return i.reply({ content: '💸 Cả hai người đều phải có đủ vàng để cược.', flags: EPH });
    p.lastDuel = Date.now();
    pendingDuels.set(`${i.user.id}:${target.id}`, { t: Date.now() });
    const b = (kind, text, emoji, style) => new ButtonBuilder().setCustomId(`duel:${kind}:${i.user.id}:${bet}:${target.id}`).setLabel(text).setEmoji(emoji).setStyle(style);
    return i.reply({ content: `<@${target.id}>`, embeds: [embed(0xe74c3c).setTitle('🏟️ Lời thách đấu võ đài!')
      .setDescription(`${CLASSES[p.cls].emoji} **${p.name}** (${REALMS[p.realm]} Lv${p.level}) thách đấu ${CLASSES[tp.cls].emoji} **${tp.name}** (${REALMS[tp.realm]} Lv${tp.level})!${bet ? `\n💰 Tiền cược: **${fmt(bet)}** vàng mỗi bên` : ''}\n\n*Đấu võ đài không mất HP hay vật phẩm. Người thắng nhận danh vọng.*\nLời thách có hiệu lực trong 2 phút.`)],
    components: [row(b('acc', 'Chấp nhận', '⚔️', ButtonStyle.Success), b('no', 'Từ chối', '🏳️', ButtonStyle.Secondary))] });
  },

  async thap(i) {
    const p = getPlayer(i); if (!p) return;
    const uid = i.user.id;
    if (i.options.getString('hanh_dong') === 'bxh') {
      const top = Object.values(db.players).filter((q) => q.towerBest > 0).sort((a, b) => b.towerBest - a.towerBest).slice(0, 10);
      const medals = ['🥇', '🥈', '🥉'];
      return i.reply({ embeds: [embed(0x34495e).setTitle('🗼 Bảng xếp hạng Trấn Yêu Tháp')
        .setDescription(top.map((q, n) => `${medals[n] || `**${n + 1}.**`} ${CLASSES[q.cls].emoji} **${q.name}** – Tầng ${q.towerBest}`).join('\n') || '*Chưa ai leo tháp*')] });
    }
    let f = fights.get(uid);
    if (!f) {
      const r = beginTower(uid, p);
      if (r.error) return i.reply({ content: r.error, flags: EPH });
      f = r.fight;
    }
    return i.reply(fightView(uid, p, f));
  },

  async bosstg(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ ...wbView(p, i.user.id), flags: EPH });
  },

  async thanhtuu(i) {
    const p = getPlayer(i); if (!p) return;
    checkAch(p); save();
    return i.reply({ ...achView(p, i.user.id), flags: EPH });
  },

  async tongmon(i) {
    const p = getPlayer(i); if (!p) return;
    const sub = i.options.getSubcommand(), uid = i.user.id;
    if (sub === 'thongtin') return i.reply({ embeds: [guildEmbed(p)] });
    if (sub === 'xephang') {
      const top = Object.values(db.guilds).sort((a, b) => b.lv - a.lv || b.exp - a.exp || b.members.length - a.members.length).slice(0, 10);
      return i.reply({ embeds: [embed(0xd35400).setTitle('🏯 Bảng xếp hạng tông môn')
        .setDescription(top.map((g, n) => `**${n + 1}.** ${g.name} – Cấp ${g.lv} • 👥 ${g.members.length} • 👑 ${db.players[g.leader]?.name || '???'}`).join('\n') || '*Chưa có tông môn nào*')] });
    }
    let r;
    if (sub === 'taolap') r = guildCreate(p, uid, i.options.getString('ten'));
    else if (sub === 'thamgia') r = guildJoin(p, uid, i.options.getString('ten'));
    else if (sub === 'roi') r = guildLeave(p, uid);
    else r = guildDonate(p, i.options.getInteger('vang'));
    save();
    return i.reply({ content: r.msg, flags: r.ok && sub !== 'donggop' ? undefined : EPH });
  },

  async cho(i) {
    const p = getPlayer(i); if (!p) return;
    const sub = i.options.getSubcommand(), uid = i.user.id;
    let r;
    if (sub === 'xem') return i.reply({ ...marketView(p, uid, i.options.getString('loai')), flags: EPH });
    if (sub === 'cuatoi') {
      const mine = Object.values(marketSync().list).filter((l) => l.seller === uid);
      return i.reply({ content: mine.length ? mine.map((l) => `**#${l.id}** ${label(l.item)} x${l.qty} – ${fmt(l.price)}/cái`).join('\n') : 'Bạn chưa đăng bán món nào.', flags: EPH });
    }
    if (sub === 'dang') r = marketPost(p, uid, i.options.getString('vatpham'), i.options.getInteger('soluong') || 1, i.options.getInteger('gia'));
    else if (sub === 'mua') r = marketBuy(p, uid, i.options.getInteger('ma'));
    else r = marketCancel(p, uid, i.options.getInteger('ma'));
    save();
    return i.reply({ content: r.msg, flags: EPH });
  },

  async phe(i) {
    const p = getPlayer(i); if (!p) return;
    const sub = i.options.getSubcommand();
    if (sub === 'xem') return i.reply({ embeds: [facView(p)] });
    const fac = i.options.getString('phe');
    if (sub === 'chon') {
      if (p.fac) return i.reply({ content: `⚖️ Bạn đã thuộc phe ${FACTIONS[p.fac].emoji} **${FACTIONS[p.fac].name}**. Muốn chuyển hãy dùng \`/phe doi\`.`, flags: EPH });
      p.fac = fac; p.facAt = Date.now(); save();
      return i.reply({ embeds: [embed(0x8e44ad).setTitle(`${FACTIONS[fac].emoji} Gia nhập ${FACTIONS[fac].name}!`).setDescription(`${FACTIONS[fac].desc}\n\nGhé \`/cuahang\` → danh mục **Lệnh bài phe** để sắm lệnh bài của phe.`)] });
    }
    if (!p.fac) return i.reply({ content: '⚖️ Bạn chưa có phe. Dùng `/phe chon`.', flags: EPH });
    if (p.fac === fac) return i.reply({ content: 'Bạn đã ở phe này rồi.', flags: EPH });
    if (inFight(i)) return busy(i);
    const wait = FAC_CHANGE_CD - (Date.now() - p.facAt);
    if (wait > 0) return i.reply({ content: `⏳ Vừa đổi phe, hãy chờ **${Math.ceil(wait / 3600000)} giờ** nữa.`, flags: EPH });
    let paid;
    if (count(p, 'thedoiphe')) { removeItem(p, 'thedoiphe'); paid = '1 🎫 Thẻ Đổi Phe'; }
    else if (p.gold >= FAC_CHANGE_COST) { p.gold -= FAC_CHANGE_COST; paid = `${fmt(FAC_CHANGE_COST)} vàng`; }
    else return i.reply({ content: `💸 Cần **${fmt(FAC_CHANGE_COST)}** vàng hoặc 1 Thẻ Đổi Phe.`, flags: EPH });
    const old = p.fac;
    p.fac = fac; p.facAt = Date.now();
    if (p.equip.badge) { addItem(p, p.equip.badge); p.equip.badge = null; }
    const s2 = stats(p); p.hp = Math.min(p.hp, s2.maxHp); p.mp = Math.min(p.mp, s2.maxMp);
    save();
    return i.reply({ content: `⚖️ Đã chuyển từ ${FACTIONS[old].emoji} ${FACTIONS[old].name} sang ${FACTIONS[fac].emoji} **${FACTIONS[fac].name}** (tốn ${paid}). Lệnh bài cũ đã cất vào túi.` });
  },

  async vip(i) {
    const p = getPlayer(i); if (!p) return;
    if (i.options.getSubcommand() === 'xem') return i.reply({ embeds: [vipEmbed(p)], flags: EPH });
    const lv = vipLevel(p);
    if (!lv) return i.reply({ content: '👑 Quà hằng ngày dành cho VIP 1 trở lên. Xem `/vip xem`.', flags: EPH });
    const wait = 20 * 3600 * 1000 - (Date.now() - p.lastVip);
    if (wait > 0) return i.reply({ content: `⏳ Hãy quay lại sau khoảng **${Math.ceil(wait / 3600000)} giờ**.`, flags: EPH });
    p.lastVip = Date.now();
    const gold = 2000 * lv, lt = 2 * lv, nb = 3 * lv, lines = [`💰 +${fmt(gold)} vàng`, `💠 +${lt} Linh Thạch`, `💎 +${nb} Nguyên Bảo`];
    p.gold += gold; addItem(p, 'linhthach', lt); p.nb += nb;
    if (lv >= 2) { addItem(p, 'thienvanphu', 1); lines.push('🍀 +1 Thiên Vận Phù'); }
    if (lv >= 3) { addItem(p, 'phubaoho', 1); lines.push('🧿 +1 Phù Bảo Hộ'); }
    if (lv >= 4) { addItem(p, 'tuvi2', 1); lines.push('🟠 +1 Bồi Nguyên Đan'); }
    if (lv >= 5) { addItem(p, 'tuvi3', 1); lines.push('🔴 +1 Thiên Nguyên Đan'); }
    save();
    return i.reply({ embeds: [embed(0xf1c40f).setTitle(`👑 Quà VIP ${lv} hôm nay`).setDescription(lines.join('\n'))] });
  },

  async vipshop(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ ...vipShopView(p, i.user.id), flags: EPH });
  },

  async luudata(i) {
    const p = getPlayer(i); if (!p) return;
    saveNow();
    const backups = listBackups();
    return i.reply({
      content: `💾 **Dữ liệu của bạn đã được lưu.**\n• Bot lưu ngay sau mỗi thay đổi và tự lưu lại mỗi phút.\n• Sao lưu tự động 30 phút/lần (giữ 48 bản gần nhất, hiện có ${backups.length}).\n• Nhân vật: **${p.name}** • ${fmt(Object.keys(db.players).length)} người chơi đang được lưu.\n• Lần lưu gần nhất: <t:${Math.floor(lastSaved / 1000)}:R>\nĐính kèm là bản sao hồ sơ nhân vật của bạn.`,
      files: [{ attachment: Buffer.from(JSON.stringify(p, null, 2), 'utf8'), name: `nhanvat-${i.user.id}.json` }],
      flags: EPH,
    });
  },

  async admin(i) {
    if (!isAdmin(i)) return i.reply({ content: '⛔ Lệnh này chỉ dành cho quản trị viên (quyền Administrator hoặc ID trong biến ADMIN_IDS).', flags: EPH });
    const sub = i.options.getSubcommand();
    if (sub === 'thongke') {
      let size = 0; try { size = fs.statSync(DB_FILE).size; } catch { /* chưa có file */ }
      const vips = Object.values(db.players).filter((q) => vipLevel(q) > 0).length;
      return i.reply({ content: `📊 **Thống kê**\n• Người chơi: ${fmt(Object.keys(db.players).length)} (VIP: ${vips})\n• Tông môn: ${Object.keys(db.guilds).length} • Hàng ở chợ: ${Object.keys(db.market.list).length}\n• File dữ liệu: ${(size / 1024).toFixed(1)} KB • Bản sao lưu: ${listBackups().length}\n• Bot hoạt động: ${Math.floor(process.uptime() / 3600)} giờ ${Math.floor(process.uptime() / 60) % 60} phút`, flags: EPH });
    }
    if (sub === 'saoluu') { const n = backup('tay'); return i.reply({ content: n ? `💾 Đã sao lưu: \`${n}\` (thư mục backups/)` : '❌ Sao lưu thất bại, xem log của bot.', flags: EPH }); }
    if (sub === 'xuatdata') { saveNow(); return i.reply({ content: '📦 File dữ liệu toàn bộ:', files: [{ attachment: fs.readFileSync(DB_FILE), name: 'daosi-data.json' }], flags: EPH }); }
    const target = i.options.getUser('nguoi'), tp = db.players[target.id];
    if (!tp) return i.reply({ content: '❌ Người này chưa nhập môn.', flags: EPH });
    if (sub === 'nguyenbao') {
      const n = i.options.getInteger('so'), before = vipLevel(tp);
      tp.nb += n; tp.vipPts += n; save();
      return i.reply({ content: `💎 Đã cấp **${fmt(n)}** Nguyên Bảo cho **${tp.name}**. VIP: ${before} → **${vipLevel(tp)}** (${fmt(tp.vipPts)} điểm).`, flags: EPH });
    }
    if (sub === 'vang') { const n = i.options.getInteger('so'); tp.gold += n; save(); return i.reply({ content: `💰 Đã cấp ${fmt(n)} vàng cho **${tp.name}**.`, flags: EPH }); }
    if (sub === 'vatpham') {
      const id = i.options.getString('vatpham'), n = i.options.getInteger('soluong') || 1;
      if (!ITEMS[id]) return i.reply({ content: '❌ Vật phẩm không tồn tại.', flags: EPH });
      addItem(tp, id, n); save();
      return i.reply({ content: `🎁 Đã cấp ${n}x ${label(id)} cho **${tp.name}**.`, flags: EPH });
    }
    if (sub === 'vip') { const l = i.options.getInteger('cap'); tp.vipPts = VIP_STEPS[l]; save(); return i.reply({ content: `👑 Đã đặt **${tp.name}** thành VIP ${l}.`, flags: EPH }); }
  },

  async tiem(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ ...tiemView(p, i.user.id), flags: EPH });
  },

  async tinhluyen(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham');
    if (!canEnhance(id) || !owns(p, id)) return i.reply({ content: '❌ Bạn không sở hữu món trang bị này.', flags: EPH });
    return i.reply({ ...affView(p, i.user.id, id), flags: EPH });
  },

  async thangpham(i) {
    const p = getPlayer(i); if (!p) return;
    if (inFight(i)) return busy(i);
    const id = i.options.getString('vatpham');
    if (!canEnhance(id) || !owns(p, id)) return i.reply({ content: '❌ Bạn không sở hữu món trang bị này.', flags: EPH });
    return i.reply({ ...gradeView(p, i.user.id, id), flags: EPH });
  },

  async congphap(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ ...techView(p, i.user.id), flags: EPH });
  },

  async luyenkynang(i) {
    const p = getPlayer(i); if (!p) return;
    return i.reply({ ...sklView(p, i.user.id), flags: EPH });
  },

  async trogiup(i) {
    const mapList = Object.values(MAPS).map((m) => `${m.emoji} ${m.name} – Lv ${m.lv}+`).join('\n');
    return i.reply({ embeds: [embed(0x95a5a6).setTitle('📖 Hướng dẫn Đạo Sĩ Bot v4')
      .setDescription([
        '**Bắt đầu:** `/batdau` chọn 1 trong 18 môn phái (và phe nếu muốn). Xem tuyệt kỹ & nội tại: `/kynang`.',
        '**Săn yêu ma:** `/sanquy` – đánh theo lượt bằng nút bấm; menu bên dưới để dùng đan/phù. 10% gặp BOSS!',
        '**Sắm đồ:** `/cuahang` (menu danh mục), `/mua`, `/ban`, `/tuido`, `/trangbi`, `/thao`, `/dung`.',
        '**Mỗi phái có đồ riêng:** vũ khí, giáp, 🔱 pháp bảo, 🧧 bùa hộ thân với hiệu ứng đặc biệt (chí mạng, né, phản đòn, hút máu, triệu thiên lôi...).',
        '**Cường hóa:** `/cuonghoa` – lên đến +15, tỉ lệ giảm dần. Thất bại có thể **tụt cấp, bị sét đánh, vỡ đồ**! Dùng 🍀 Thiên Vận Phù (+10%) và 🧿 Phù Bảo Hộ để an toàn.',
        '**Độ kiếp:** mỗi 10 cấp bạn chạm bình cảnh. Dùng `/dokiep` để chịu thiên lôi, vượt qua sẽ đột phá cảnh giới (+10% chỉ số gốc).',
        '**Môn phái:** 18 phái – Mao Sơn, Phù Chú Sư, Võ Đạo Sĩ, 🧘 Thiếu Lâm, 🗡️ Thục Sơn, 🧟 Ngự Thi Sư, 👺 Quỷ Đạo, 🍶 Cái Bang, 🌿 Dược Vương, 🎯 Đường Môn, 🧭 Phong Thủy, 🐛 Cổ Sư, 🌀 Võ Đang, 🌸 Nga Mi, 🏔️ Hoa Sơn, 🔥 Minh Giáo, ❄️ Côn Lôn, 🔮 Thiên Cơ Các. Mỗi phái có nội tại riêng (xem `/kynang`).',
        '**Cửa hàng:** `/cuahang` (Tiệm Cửu Thúc), `/tiem` (11 cửa hàng: 🕶️ Chợ Đen, ⚒️ Lò Rèn, 💊 Đan Dược, 📜 Phù Chú, 💎 Bảo Ngọc, 🧳 Thương Nhân đổi hàng mỗi ngày, ⚖️ Phe Phái, 💠 Linh Thạch Phường, 🏟️ Võ Đài, 🗼 Tháp Lệnh, 🏯 Tông Môn), `/vipshop` (💎).',
        '**Nâng cấp trang bị:** `/cuonghoa` (+15) → `/thangpham` (⬜Phàm→🟩Linh→🟦Bảo→🟪Tiên→🟨Thần) → `/tinhluyen` (dòng hiệu ứng ngẫu nhiên) → `/khamngoc`. Thêm `/congphap` (9 công pháp cấp 1–10) và tiến hóa đệ tử trong `/dedu`.',
        '**Phe:** `/phe chon` – ☀️ Chính Đạo / 🌑 Ma Đạo / 🍃 Tiêu Dao, mỗi phe có buff, Lệnh bài riêng và bảng điểm tuần.',
        '**VIP:** `/vip xem`, `/vip nhanqua`, `/vipshop` – Nguyên Bảo kiếm miễn phí qua điểm danh, boss, độ kiếp, thành tựu.',
        '**Lưu dữ liệu:** `/luudata` – tự lưu liên tục, sao lưu 30 phút/lần, tải bản sao nhân vật.',
        '**Cửa hàng:** `/tiem` có 16 tiệm – Chợ Đen, Lò Rèn, Đan Dược, Phù Chú, Bảo Ngọc, Thương Nhân, 🎁 Phúc Lợi (quà free mỗi ngày), 🧸 Tân Thủ, 🎲 Rương Bí Ẩn, 🐾 Linh Thú, 🙏 Cầu Phúc... Mở rương/dùng bùa phúc bằng `/dung`.',
        '**Nhiệm vụ:** `/nhiemvu` – 17 loại nhiệm vụ, khác nhau theo phái và cảnh giới (càng cao càng khó, thưởng càng lớn). Đủ 3 nhiệm vụ/ngày có quà thêm. `/nhiemvu hanh_dong:Đổi` để đổi.',
        '**Luyện tuyệt kỹ:** `/luyenkynang` – nâng từng chiêu lên cấp 10 (mỗi cấp +6% sát thương) bằng vàng và Linh Thạch.',
        '**Trấn Yêu Tháp:** `/thap` – leo từng tầng, mỗi 10 tầng có boss, thua không mất vàng. `/thap bxh` xem xếp hạng.',
        '**Boss Thế Giới:** `/bosstg` – cả server cùng đánh một boss, chia thưởng theo sát thương.',
        '**Tông môn:** `/tongmon` – lập/gia nhập, cống hiến vàng để nâng cấp, cả nhóm cùng được cộng % chỉ số.',
        '**Chợ:** `/cho xem|dang|mua|huy` – mua bán vật phẩm với người chơi khác (phí 5%).',
        '**Thành tựu:** `/thanhtuu` – mở khóa danh hiệu cộng % chỉ số. Săn yêu ma còn có sự kiện ngẫu nhiên!',
        '**Đệ tử:** `/trieuhoi` (Thu Sinh, Văn Tài, Nhậm Đình Đình, Tiểu Cương Thi...) rồi `/dedu` để chọn người đồng hành. Trùng đệ tử sẽ lên sao.',
        '**Khảm ngọc:** `/khamngoc` – mỗi trang bị có 1–3 ô khảm. Ngọc rơi từ yêu ma, bán ở tiệm, gộp 3 → 1 bằng `/chetao`.',
        '**Võ đài:** `/thachdau @người [cược]` – đấu tự động, không mất HP/đồ, thắng nhận danh vọng (`/bxh loai:Danh vọng`).',
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
  const mineCls = (id) => (!ITEMS[id].cls || ITEMS[id].cls === p?.cls) && (!ITEMS[id].fac || ITEMS[id].fac === p?.fac);
  let ids = [];
  switch (i.commandName) {
    case 'mua': ids = Object.keys(ITEMS).filter((id) => ITEMS[id].shop && mineCls(id)); break;
    case 'ban': ids = inv; break;
    case 'dung': ids = inv.filter((id) => ['potion', 'chest'].includes(ITEMS[id].type)); break;
    case 'trangbi': ids = inv.filter((id) => SLOT_OF[ITEMS[id].type] && mineCls(id)); break;
    case 'tinhluyen': case 'thangpham': case 'khamngoc': case 'cuonghoa': ids = [...new Set([...inv, ...Object.values(p?.equip || {})])].filter((id) => id && canEnhance(id)); break;
    case 'chetao': ids = Object.keys(RECIPES).filter(mineCls); break;
    case 'cho': ids = inv; break;
    case 'admin': ids = Object.keys(ITEMS); break;
  }
  const showQty = ['ban', 'dung', 'trangbi', 'cho'].includes(i.commandName);
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
      const r = parts[1] === 'thap' ? beginTower(uid, p) : beginFight(uid, p, parts[1]);
      if (r.error) return i.reply({ content: r.error, flags: EPH });
      return i.update(fightView(uid, p, r.fight));
    }
    case 'cb': return runCombatAction(i, uid, p, parts[1]);
    case 'enh': return doEnhance(i, uid, p, parts[2], +parts[1]);
    case 'enhv':
      if (!owns(p, parts[1])) return i.update({ content: '❌ Món này không còn nữa.', embeds: [], components: [] });
      return i.update(enhView(p, uid, parts[1]));
    case 'skl': {
      if (fights.has(uid)) return i.reply({ content: '⚔️ Hãy kết thúc trận chiến trước khi luyện chiêu.', flags: EPH });
      const r = sklUp(p, +parts[1]); save();
      return i.update(sklView(p, uid, r.msg));
    }
    case 'kiep': return runKiep(i, uid, p, +parts[1]);
    case 'aff': {
      if (fights.has(uid)) return i.reply({ content: '⚔️ Đang trong trận chiến!', flags: EPH });
      const r = affReroll(p, parts[2], +parts[1]); save();
      return i.update(affView(p, uid, parts[2], [r.msg]));
    }
    case 'grade': {
      if (fights.has(uid)) return i.reply({ content: '⚔️ Đang trong trận chiến!', flags: EPH });
      const r = gradeAttempt(p, parts[2], parts[1] === '1');
      const s2 = stats(p); p.hp = Math.min(p.hp, s2.maxHp); p.mp = Math.min(p.mp, s2.maxMp); save();
      return i.update(gradeView(p, uid, parts[2], [r.msg]));
    }
    case 'wb': {
      if (parts[1] === 'spawn') {
        const r = wbSpawn();
        if (r.error) return i.update(wbView(p, uid, [r.error]));
        try { await i.channel?.send(`🌍 **${i.user.displayName}** đã triệu hồi **${db.wb.emoji} ${db.wb.name}**! Mọi người hãy dùng \`/bosstg\` để cùng hạ nó trong 3 giờ!`); } catch { /* không có quyền gửi */ }
        save();
        return i.update(wbView(p, uid, ['🌟 Boss Thế Giới xuất hiện!']));
      }
      if (parts[1] === 'hit') {
        wbSync();
        const r = wbAttack(p, uid);
        save();
        return i.update(wbView(p, uid, r.error ? [r.error] : r.lines));
      }
      return i.update(wbView(p, uid));
    }
    case 'duel': return runDuel(i, parts[2], uid, +parts[3], parts[1] === 'acc');
  }
}

async function handleSelect(i) {
  const parts = i.customId.split(':');
  const kind = parts[0], uid = parts[parts.length - 1];
  if (uid !== i.user.id) return i.reply({ content: '🚫 Đây không phải của bạn!', flags: EPH });
  const p = db.players[uid];
  if (!p) return i.reply({ content: 'Bạn chưa có nhân vật.', flags: EPH });
  const v = i.values[0];
  if (kind === 'shopcat') return i.update(shopView(p, uid, v));
  if (kind === 'shop') return i.reply({ content: buy(p, v, 1), flags: EPH });
  if (kind === 'ct') return v === 'none' ? i.deferUpdate() : runCombatAction(i, uid, p, `use:${v}`);
  if (kind === 'tiemsel') return i.update(tiemView(p, uid, v));
  if (kind === 'tiembuy') { const r = buyOffer(p, parts[1], v); save(); return i.update(tiemView(p, uid, parts[1], r.msg)); }
  if (kind === 'techup') { const r = techUp(p, v); save(); return i.update(techView(p, uid, [r.msg])); }
  if (kind === 'petevo') { const r = petEvolve(p, v); save(); return i.update({ ...petView(p, uid), content: r.msg }); }
  if (kind === 'vipbuy') {
    const r = vipBuy(p, v); save();
    return i.reply({ content: r.msg, flags: EPH });
  }
  if (kind.startsWith('titleset')) {
    p.title = v === 'none' ? null : v;
    const s2 = stats(p); p.hp = Math.min(p.hp, s2.maxHp); save();
    return i.update(achView(p, uid));
  }
  if (kind === 'chobuy') {
    const r = marketBuy(p, uid, +v); save();
    return i.reply({ content: r.msg, flags: EPH });
  }
  if (kind === 'petset') {
    p.pet = v === 'none' ? null : v; save();
    return i.update(petView(p, uid));
  }
  if (kind === 'gemput' || kind === 'gemrm') {
    const id = parts[1];
    if (fights.has(uid)) return i.reply({ content: '⚔️ Đang trong trận chiến!', flags: EPH });
    if (!canEnhance(id) || !owns(p, id)) return i.update({ content: '❌ Món này không còn nữa.', embeds: [], components: [] });
    p.gems[id] ??= [];
    if (kind === 'gemput') {
      if (p.gems[id].length >= socketsOf(id)) return i.reply({ content: '⬜ Trang bị này đã hết ô khảm.', flags: EPH });
      if (!count(p, v) || ITEMS[v]?.type !== 'gem') return i.reply({ content: '❌ Bạn không có ngọc này.', flags: EPH });
      removeItem(p, v); p.gems[id].push(v);
    } else {
      const g = p.gems[id].splice(+v, 1)[0];
      if (g) addItem(p, g);
      const s2 = stats(p); p.hp = Math.min(p.hp, s2.maxHp); p.mp = Math.min(p.mp, s2.maxMp);
    }
    save();
    return i.update(gemView(p, uid, id));
  }
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
    if (i.isChatInputCommand()) await handlers[i.commandName]?.(i);
    else if (i.isButton()) await handleButton(i);
    else if (i.isStringSelectMenu()) await handleSelect(i);
    else return;
    // Thông báo thành tựu mới (nếu có)
    const pl = db.players[i.user.id];
    const got = pl?.ach ? checkAch(pl) : [];
    if (got.length) {
      save();
      try { await i.followUp({ content: `🏅 **Thành tựu mới!**\n${got.join('\n')}\nDùng \`/thanhtuu\` để đeo danh hiệu.`, flags: EPH }); } catch { /* bỏ qua */ }
    }
  } catch (e) {
    console.error(e);
    const msg = { content: '⚠️ Có lỗi xảy ra, thử lại sau nhé!', flags: EPH };
    try { (i.deferred || i.replied) ? await i.followUp(msg) : await i.reply(msg); } catch { /* bỏ qua */ }
  }
});

process.on('unhandledRejection', (e) => console.error('⚠️ Lỗi chưa xử lý:', e));
client.on(Events.Error, (e) => console.error('⚠️ Lỗi client:', e));

async function main() {
  const nodeMajor = +process.versions.node.split('.')[0];
  if (nodeMajor < 18) { console.error(`❌ Node.js quá cũ (${process.version}). Cần Node 18 trở lên.`); process.exit(1); }
  const token = (process.env.DISCORD_TOKEN || '').trim();
  if (!token) {
    console.error('❌ Thiếu DISCORD_TOKEN. Hãy đổi tên file ".env.example" thành ".env" rồi dán token bot vào, hoặc đặt biến môi trường DISCORD_TOKEN.');
    process.exit(1);
  }
  if (fs.existsSync(DB_FILE)) backup('start');
  console.log(`💾 Dữ liệu: ${Object.keys(db.players).length} người chơi (file ${path.basename(DB_FILE)}, sao lưu trong thư mục backups/)`);
  console.log('⏳ Đang đăng nhập Discord...');
  try {
    await client.login(token);
  } catch (e) {
    const msg = String(e?.code || e?.message || e);
    if (/TokenInvalid|invalid token|Incorrect login/i.test(msg)) console.error('❌ Token bot sai hoặc đã bị reset. Vào Discord Developer Portal → Bot → Reset Token rồi dán lại vào .env.');
    else if (/DisallowedIntents|disallowed intents/i.test(msg)) console.error('❌ Intents không được phép. Bot này chỉ cần intent "Guilds" nên không cần bật gì thêm – hãy kiểm tra lại token.');
    else console.error('❌ Không đăng nhập được:', e);
    process.exit(1);
  }
}

if (process.env.DAOSI_TEST !== '1') main();
module.exports = { commands, ITEMS, RECIPES, GEAR, CLASSES, MAPS, newPlayer, stats, perks, beginFight, act, fightView, enhanceAttempt, enhView, shopView, simKiep, kiepView, gainExp, migrate, buy, fights, capOf, atBottleneck, expNeed, ENH_RATE, handlers, PETS, summonOnce, simulateDuel, gemView, gemStats, socketsOf, petScale, petView, ACH, checkAch, titleBonus, beginTower, towerMonster, wbSync, wbSpawn, wbAttack, settleWb, db, guildCreate, guildJoin, guildLeave, guildDonate, guildBonus, marketPost, marketBuy, marketCancel, marketSync, randomEvent, achView, wbView, marketView, profileEmbed, resultView, genQuest, questProg, questEmbed, claimQuest, QTYPES, CLASS_QUEST, REALM_REWARD, dailyN, openBox, buffVal, BUFF_NAME, skillMult, sklUp, sklView, sklCost, sklLv, SKL_MAX, handleAuto, handleButton, handleSelect, AFFIX, affReroll, affView, affSlots, extraTotals, GRADE_Q, GRADE_NEED, gradeAttempt, gradeView, TECHS, techUp, techView, techCost, PET_EVO, petEvolve, SHOP_DEFS, shopOffers, buyOffer, tiemView, BM_POOL, passiveText, gradeOf, FACTIONS, FAC_GEAR, VIP_SHOP, VIP_PERK, VIP_STEPS, vipLevel, vipBuy, vipShopView, vipEmbed, facView, leadingFaction, fpSync, expMul, goldMul, priceFor, backup, listBackups, saveNow, writeDb, DB_FILE, BACKUP_DIR, loadDb, isAdmin, CLASS_GEAR_MOD, GEM_KINDS };
