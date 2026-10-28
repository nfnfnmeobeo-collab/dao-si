require('dotenv').config();
const {
  Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes,
  Events, MessageFlags, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const C = require('./config');
const {
  db, saveDB, rand, pick, fmt, bar, norm, isNight,
  ROOT_BY_ID, getUser, F, isMaxRealm, expNeeded, realmScale, realmOf, realmName, money,
  itemCount, addItem, takeItem, findItem, itemLabel,
  sectKey, getSectOf, sectMaxMembers, SECT_MAX_LEVEL,
  expMulOf, getStats, power, advantage,
  makeFighter, makeMonster, fight, logText, huntsOf, eligibleHunts,
} = require('./game');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // tuỳ chọn: có thì lệnh cập nhật ngay lập tức

// ====================== TIỆN ÍCH ======================
const cooldowns = new Map();
function cdCheck(id, cmd, ms) {
  const key = `${id}:${cmd}`;
  const now = Date.now();
  const until = cooldowns.get(key) || 0;
  if (until > now) return Math.ceil((until - now) / 1000);
  cooldowns.set(key, now + ms);
  return 0;
}
const err = (i, content) => i.reply({ content, flags: MessageFlags.Ephemeral });
const fmtTime = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}g ${Math.floor((s % 3600) / 60)}p` : s >= 60 ? `${Math.floor(s / 60)}p ${s % 60}s` : `${s}s`);
const SECL_MSG = '🚪 Ngươi đang bế quan, hãy dùng `/xuatquan` trước.';
const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(5 - n);
const FACTION_CHOICES = Object.values(C.FACTIONS).map((f) => ({ name: `${f.emoji} ${f.name}`, value: f.id }));

function addExp(u, amount) {
  const need = expNeeded(u.realm, u.stage);
  const before = u.exp;
  u.exp = Math.min(need, u.exp + Math.round(amount));
  return u.exp - before;
}
function fullHint(u) {
  if (u.stage < 3) return `${F(u).expName} đã đầy! Dùng \`/dotpha\` để đột phá tiểu cảnh.`;
  if (!isMaxRealm(u)) return `${F(u).expName} đã đầy! Dùng \`/dokiep\` để vượt **${F(u).kiepName}**.`;
  return 'Ngươi đã đứng trên đỉnh cao nhất, không còn gì để tu nữa.';
}
const timeNote = (u) => {
  const night = isNight();
  if (u.faction === 'dao') return night ? '🌙 Ban đêm: Đạo sĩ tu luyện bình thường.' : '☀️ Ban ngày: Đạo sĩ tu luyện +10%.';
  return night ? '🌙 Ban đêm: tu luyện +15%.' : '☀️ Ban ngày: tu luyện -10%.';
};

// ====================== ĐỊNH NGHĨA LỆNH ======================
const commands = [
  new SlashCommandBuilder().setName('huongdan').setDescription('Xem hướng dẫn chơi'),
  new SlashCommandBuilder().setName('chonphai').setDescription('Chọn phái: Đạo Sĩ, Ma hoặc Cương Thi (chỉ chọn một lần)')
    .addStringOption((o) => o.setName('phai').setDescription('Phái của bạn').setRequired(true).addChoices(...FACTION_CHOICES)),
  new SlashCommandBuilder().setName('canhgioi').setDescription('Xem các cảnh giới của từng phái')
    .addStringOption((o) => o.setName('phai').setDescription('Phái muốn xem').addChoices(...FACTION_CHOICES)),
  new SlashCommandBuilder().setName('hoso').setDescription('Xem hồ sơ')
    .addUserOption((o) => o.setName('daohuu').setDescription('Người muốn xem')),
  new SlashCommandBuilder().setName('luyencong').setDescription('Luyện công tăng tu vi (chờ 60 giây)'),
  new SlashCommandBuilder().setName('dotpha').setDescription('Đột phá tiểu cảnh (Sơ Kỳ → Trung Kỳ → Hậu Kỳ → Viên Mãn)'),
  new SlashCommandBuilder().setName('dokiep').setDescription('Vượt kiếp để lên đại cảnh giới (cần Viên Mãn + đầy tu vi)'),
  new SlashCommandBuilder().setName('baquan').setDescription('Bế quan luyện công nhiều giờ')
    .addIntegerOption((o) => o.setName('gio').setDescription('Số giờ bế quan (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)),
  new SlashCommandBuilder().setName('xuatquan').setDescription('Xuất quan và nhận tu vi'),
  new SlashCommandBuilder().setName('diemdanh').setDescription('Điểm danh nhận thưởng hằng ngày'),
  new SlashCommandBuilder().setName('nghiadia').setDescription('Dạ du nghĩa địa, gặp kỳ ngộ (chờ 2 phút)'),
  new SlashCommandBuilder().setName('muctieu').setDescription('Xem danh sách mục tiêu hành đạo của phái bạn'),
  new SlashCommandBuilder().setName('hanhdao').setDescription('Hành đạo: Đạo sĩ trừ ma diệt thi, Ma tác quái, Cương thi hút dương khí (chờ 45 giây)')
    .addIntegerOption((o) => o.setName('so').setDescription('Số thứ tự mục tiêu trong /muctieu (bỏ trống = ngẫu nhiên)').setMinValue(1).setMaxValue(8)),
  new SlashCommandBuilder().setName('sodau').setDescription('Thách đấu một đạo hữu')
    .addUserOption((o) => o.setName('daohuu').setDescription('Đối thủ').setRequired(true))
    .addIntegerOption((o) => o.setName('cuoc').setDescription('Số tiền đặt cược').setMinValue(0)),
  new SlashCommandBuilder().setName('cuahang').setDescription('Xem cửa hàng của phái bạn'),
  new SlashCommandBuilder().setName('mua').setDescription('Mua vật phẩm')
    .addStringOption((o) => o.setName('vatpham').setDescription('Tên vật phẩm').setRequired(true))
    .addIntegerOption((o) => o.setName('soluong').setDescription('Số lượng').setMinValue(1).setMaxValue(99)),
  new SlashCommandBuilder().setName('ban').setDescription('Bán vật phẩm')
    .addStringOption((o) => o.setName('vatpham').setDescription('Tên vật phẩm').setRequired(true))
    .addIntegerOption((o) => o.setName('soluong').setDescription('Số lượng').setMinValue(1).setMaxValue(99)),
  new SlashCommandBuilder().setName('kho').setDescription('Xem túi đồ'),
  new SlashCommandBuilder().setName('dung').setDescription('Dùng bùa / đan / vật phẩm')
    .addStringOption((o) => o.setName('vatpham').setDescription('Tên vật phẩm').setRequired(true)),
  new SlashCommandBuilder().setName('trangbi').setDescription('Quản lý pháp bảo')
    .addSubcommand((s) => s.setName('xem').setDescription('Xem trang bị đang mang'))
    .addSubcommand((s) => s.setName('mac').setDescription('Mang pháp bảo')
      .addStringOption((o) => o.setName('vatpham').setDescription('Tên pháp bảo').setRequired(true)))
    .addSubcommand((s) => s.setName('thao').setDescription('Tháo pháp bảo')
      .addStringOption((o) => o.setName('loai').setDescription('Loại').setRequired(true)
        .addChoices({ name: 'Vũ khí', value: 'weapon' }, { name: 'Giáp', value: 'armor' }))),
  new SlashCommandBuilder().setName('chetao').setDescription('Chế tạo: đạo sĩ vẽ bùa, ma luyện oán khí, cương thi luyện thi đan')
    .addStringOption((o) => o.setName('vatpham').setDescription('Tên vật phẩm muốn chế (xem /congthuc)').setRequired(true)),
  new SlashCommandBuilder().setName('congthuc').setDescription('Xem công thức chế tạo của phái bạn'),
  new SlashCommandBuilder().setName('monphai').setDescription('Môn phái / Ma giáo / Thi quật (cùng phái mới gia nhập được)')
    .addSubcommand((s) => s.setName('tao').setDescription('Lập môn phái (5000, từ cảnh giới thứ 3)')
      .addStringOption((o) => o.setName('ten').setDescription('Tên').setRequired(true).setMinLength(3).setMaxLength(20)))
    .addSubcommand((s) => s.setName('thamgia').setDescription('Gia nhập')
      .addStringOption((o) => o.setName('ten').setDescription('Tên').setRequired(true)))
    .addSubcommand((s) => s.setName('roi').setDescription('Rời khỏi'))
    .addSubcommand((s) => s.setName('thongtin').setDescription('Xem thông tin')
      .addStringOption((o) => o.setName('ten').setDescription('Tên (bỏ trống = của bạn)')))
    .addSubcommand((s) => s.setName('cungtien').setDescription('Cống hiến tiền để thăng cấp')
      .addIntegerOption((o) => o.setName('soluong').setDescription('Số tiền').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('danhsach').setDescription('Danh sách mạnh nhất')),
  new SlashCommandBuilder().setName('tang').setDescription('Tặng tiền cho đạo hữu (thuế 5%)')
    .addUserOption((o) => o.setName('daohuu').setDescription('Người nhận').setRequired(true))
    .addIntegerOption((o) => o.setName('soluong').setDescription('Số tiền').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('boi').setDescription('Xin đạo sĩ gieo quẻ Bát Quái')
    .addStringOption((o) => o.setName('cauhoi').setDescription('Điều bạn muốn hỏi')),
  new SlashCommandBuilder().setName('daongon').setDescription('Nhận một câu đạo ngôn'),
  new SlashCommandBuilder().setName('bangxephang').setDescription('Bảng xếp hạng')
    .addStringOption((o) => o.setName('loai').setDescription('Xếp theo')
      .addChoices({ name: 'Cảnh giới', value: 'tuvi' }, { name: 'Tiền', value: 'tien' }, { name: 'Thắng sở đấu', value: 'thang' }))
    .addStringOption((o) => o.setName('phai').setDescription('Chỉ xem một phái').addChoices(...FACTION_CHOICES)),
].map((c) => c.toJSON());

const NO_FACTION_OK = new Set(['huongdan', 'chonphai', 'canhgioi', 'boi', 'daongon', 'bangxephang']);

// ====================== XỬ LÝ LỆNH ======================
const H = {};

// ---------- Hướng dẫn / chọn phái / cảnh giới ----------
H.huongdan = (i) => {
  const embed = new EmbedBuilder().setColor(0x1abc9c).setTitle('📖 Hướng dẫn — Đạo Sĩ Trừ Tà')
    .setDescription('Thế giới nghĩa địa về đêm: **Đạo Sĩ Mao Sơn**, **Ma Quỷ** và **Cương Thi** đối đầu nhau. Mỗi phái có 12 cảnh giới, mỗi cảnh giới 4 tiểu cảnh.')
    .addFields(
      { name: '🌟 Bắt đầu', value: '`/chonphai` · `/canhgioi` · `/hoso`' },
      { name: '🧘 Tu luyện', value: '`/luyencong` · `/baquan` · `/xuatquan` · `/dotpha` · `/dokiep` · `/diemdanh`' },
      { name: '🪦 Phiêu lưu', value: '`/nghiadia` · `/muctieu` · `/hanhdao` · `/sodau`' },
      { name: '🛒 Vật phẩm', value: '`/cuahang` · `/mua` · `/ban` · `/kho` · `/dung` · `/trangbi` · `/tang`' },
      { name: '📜 Chế tạo', value: '`/congthuc` · `/chetao` (Đạo sĩ vẽ bùa · Ma luyện oán khí · Cương thi luyện thi đan)' },
      { name: '🏯 Môn phái', value: '`/monphai tao|thamgia|roi|thongtin|cungtien|danhsach`' },
      { name: '☯️ Khác', value: '`/bangxephang` · `/boi` · `/daongon`' },
      { name: 'Khắc chế (sở đấu)', value: 'Đạo Sĩ ▶ Cương Thi ▶ Ma ▶ Đạo Sĩ (+20% sát thương). Đạo sĩ mạnh ban ngày; Ma & Cương Thi mạnh ban đêm.' },
      { name: 'Lộ trình', value: 'Đầy tu vi → `/dotpha` (Sơ→Trung→Hậu→Viên Mãn) → Viên Mãn + đầy tu vi → `/dokiep` lên cảnh giới mới.' },
    );
  return i.reply({ embeds: [embed] });
};

H.chonphai = (i) => {
  const u = getUser(i.user.id);
  if (u.faction) return err(i, `❌ Ngươi đã thuộc phái **${F(u).name}**, không thể đổi.`);
  const f = C.FACTIONS[i.options.getString('phai')];
  u.faction = f.id;
  addItem(u, f.starter, 2);
  addItem(u, f.startWeapon);
  u.items[f.startWeapon] -= 1; // mang luôn vũ khí khởi đầu
  if (u.items[f.startWeapon] <= 0) delete u.items[f.startWeapon];
  u.equip.weapon = f.startWeapon;
  saveDB();
  const root = ROOT_BY_ID[u.root];
  const embed = new EmbedBuilder().setColor(f.color).setTitle(`${f.emoji} Gia nhập phái ${f.name}`)
    .setDescription(f.desc)
    .addFields(
      { name: 'Mệnh cách', value: `${root.emoji} ${root.name}`, inline: true },
      { name: 'Cảnh giới', value: realmName(u), inline: true },
      { name: 'Quà khởi đầu', value: `2x ${itemLabel(f.starter)}\n${itemLabel(f.startWeapon)} (đã mang)\n${money(u, u.stone)} ${f.cur}` },
    )
    .setFooter({ text: 'Bắt đầu bằng /luyencong, xem thêm /huongdan' });
  return i.reply({ embeds: [embed] });
};

H.canhgioi = (i) => {
  const u = getUser(i.user.id);
  const pickF = i.options.getString('phai') || u.faction;
  const embed = new EmbedBuilder().setColor(0x34495e).setTitle('🪜 Các cảnh giới')
    .setFooter({ text: 'Mỗi cảnh giới có 4 tiểu cảnh: Sơ Kỳ → Trung Kỳ → Hậu Kỳ → Viên Mãn' });
  const list = (fid) => C.REALMS[fid].map((r, idx) => `${idx + 1}. ${r.icon} ${r.name}${u.faction === fid && u.realm === idx ? ' ◀ ngươi' : ''}`).join('\n');
  for (const fid of pickF ? [pickF] : Object.keys(C.FACTIONS)) {
    const f = C.FACTIONS[fid];
    embed.addFields({ name: `${f.emoji} ${f.name}`, value: list(fid), inline: !pickF });
  }
  return i.reply({ embeds: [embed] });
};

// ---------- Hồ sơ ----------
H.hoso = (i) => {
  const target = i.options.getUser('daohuu') || i.user;
  const u = getUser(target.id);
  if (!u.faction) return err(i, `${target.id === i.user.id ? 'Ngươi' : target.username} chưa chọn phái (\`/chonphai\`).`);
  const f = F(u);
  const need = expNeeded(u.realm, u.stage);
  const st = getStats(u);
  const root = ROOT_BY_ID[u.root];
  const sect = getSectOf(u);
  const w = u.equip.weapon ? itemLabel(u.equip.weapon) : 'Không';
  const a = u.equip.armor ? itemLabel(u.equip.armor) : 'Không';
  const embed = new EmbedBuilder().setColor(f.color)
    .setTitle(`${f.emoji} Hồ sơ của ${target.username}`)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(`**${f.name}** — ${realmName(u)}\n${root.emoji} ${root.name}\n${f.expName}: \`${bar(u.exp, need, 14)}\` ${fmt(u.exp)}/${fmt(need)}`)
    .addFields(
      { name: `${f.curIcon} ${f.cur}`, value: fmt(u.stone), inline: true },
      { name: '💪 Chiến lực', value: fmt(power(u)), inline: true },
      { name: `${f.sectIcon} ${f.sectLabel}`, value: sect ? `${sect.name} (Cấp ${sect.level})` : 'Chưa có', inline: true },
      { name: '📊 Chỉ số', value: `❤️ ${fmt(st.hp)}  ⚔️ ${fmt(st.atk)}  🛡️ ${fmt(st.def)}` },
      { name: '🎒 Trang bị', value: `Vũ khí: ${w}\nGiáp: ${a}` },
      { name: '🏆 Thành tích', value: `${f.kiepName}: ✅ ${u.kiepThanhCong} ❌ ${u.kiepThatBai}\nSở đấu: ✅ ${u.wins} ❌ ${u.losses}\nHành đạo thắng: ${u.huntWins}` },
    );
  embed.setFooter({ text: u.seclusion ? '🚪 Đang bế quan' : timeNote(u) });
  return i.reply({ embeds: [embed] });
};

// ---------- Luyện công ----------
H.luyencong = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  if (u.seclusion) return err(i, SECL_MSG);
  const need = expNeeded(u.realm, u.stage);
  if (u.exp >= need) return err(i, fullHint(u));
  const left = cdCheck(i.user.id, 'luyencong', 60000);
  if (left) return err(i, `⏳ Chưa hồi sức, chờ **${fmtTime(left)}** nữa.`);

  let gain = Math.round(rand(15, 35) * realmScale(u.realm) * expMulOf(u));
  const ngo = Math.random() < 0.05;
  if (ngo) gain *= 3;
  const got = addExp(u, gain);
  saveDB();

  const embed = new EmbedBuilder().setColor(f.color).setTitle(`${f.emoji} Luyện công`)
    .setDescription(`${pick(f.luyen)}\n\n${ngo ? '🌟 **Đốn ngộ!** Thu hoạch gấp ba.\n' : ''}${f.expName} **+${fmt(got)}**`)
    .addFields(
      { name: 'Cảnh giới', value: realmName(u), inline: true },
      { name: f.expName, value: `${fmt(u.exp)}/${fmt(need)}`, inline: true },
    );
  embed.setFooter({ text: u.exp >= need ? fullHint(u).replace(/[`*]/g, '') : timeNote(u) });
  return i.reply({ embeds: [embed] });
};

H.dotpha = (i) => {
  const u = getUser(i.user.id);
  if (u.seclusion) return err(i, SECL_MSG);
  if (u.stage >= 3) return err(i, isMaxRealm(u) ? '🌟 Ngươi đã đạt cảnh giới tối cao.' : `⚡ Ngươi đã Viên Mãn, hãy dùng \`/dokiep\` để vượt **${F(u).kiepName}**.`);
  const need = expNeeded(u.realm, u.stage);
  if (u.exp < need) return err(i, `❌ ${F(u).expName} chưa đủ (${fmt(u.exp)}/${fmt(need)}).`);

  const embed = new EmbedBuilder().setTimestamp();
  if (Math.random() < 0.92) {
    u.stage++;
    u.exp = 0;
    embed.setColor(0x3498db).setTitle('🔓 Đột phá thành công!').setDescription(`Ngươi tiến vào **${realmName(u)}**.`);
  } else {
    u.exp = Math.floor(u.exp * 0.75);
    embed.setColor(0x95a5a6).setTitle('😮‍💨 Đột phá thất bại').setDescription(`Khí tức hỗn loạn, ${F(u).expName} hao hụt 25%. Hãy thử lại.`);
  }
  saveDB();
  return i.reply({ embeds: [embed] });
};

H.dokiep = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  if (u.seclusion) return err(i, SECL_MSG);
  if (isMaxRealm(u) && u.stage >= 3) return err(i, '🌟 Ngươi đã ở đỉnh cao, không còn kiếp nào cản được.');
  if (u.stage < 3) return err(i, '❌ Cần đạt **Viên Mãn** trước (dùng `/dotpha`).');
  const need = expNeeded(u.realm, u.stage);
  if (u.exp < need) return err(i, `❌ ${f.expName} chưa đủ (${fmt(u.exp)}/${fmt(need)}).`);

  const chance = Math.min(95, Math.max(25, 80 - u.realm * 4) + (u.buff.kiep || 0));
  u.buff.kiep = 0;
  const bolts = '⚡'.repeat(Math.min(9, 3 + Math.floor(u.realm / 2)));
  const embed = new EmbedBuilder().setTimestamp().setFooter({ text: `${f.kiepName} — tỉ lệ thành công: ${chance}%` });

  if (rand(1, 100) <= chance) {
    u.realm++;
    u.stage = 0;
    u.exp = 0;
    u.kiepThanhCong++;
    const reward = 300 * u.realm;
    u.stone += reward;
    embed.setColor(0xf1c40f).setTitle(`🌈 Vượt ${f.kiepName} thành công!`)
      .setDescription(`${pick(f.kiepFlavor)}\n${bolts}\nNgươi chịu đựng được, đột phá lên **${realmName(u)}**!\nThưởng: ${money(u, reward)}`);
  } else {
    u.exp = Math.floor(u.exp / 2);
    u.kiepThatBai++;
    embed.setColor(0xe74c3c).setTitle(`💥 ${f.kiepName} thất bại`)
      .setDescription(`${pick(f.kiepFlavor)}\n${bolts}\nNgươi trọng thương, mất một nửa ${f.expName}.`);
  }
  saveDB();
  return i.reply({ embeds: [embed] });
};

// ---------- Bế quan ----------
H.baquan = (i) => {
  const u = getUser(i.user.id);
  if (u.seclusion) return err(i, '🚪 Ngươi đã đang bế quan rồi.');
  const hours = i.options.getInteger('gio');
  u.seclusion = { start: Date.now(), hours };
  saveDB();
  const where = { dao: 'trong tĩnh thất', ma: 'trong gốc đa cổ', thi: 'trong quan tài cổ' }[u.faction];
  return i.reply(`🚪 **${i.user.username}** bước vào bế quan ${where} **${hours} giờ**. Dùng \`/xuatquan\` khi xong (ra sớm sẽ nhận theo thời gian đã luyện).`);
};

H.xuatquan = (i) => {
  const u = getUser(i.user.id);
  if (!u.seclusion) return err(i, 'Ngươi chưa bế quan.');
  const { start, hours } = u.seclusion;
  const elapsed = Math.min(Date.now() - start, hours * 3600000);
  const ngo = Math.random() < 0.1;
  let gain = (elapsed / 60000) * 25 * realmScale(u.realm) * expMulOf(u) * 0.2;
  if (ngo) gain *= 1.5;
  u.seclusion = null;
  const got = addExp(u, gain);
  saveDB();
  const need = expNeeded(u.realm, u.stage);
  let text = `Ngươi xuất quan sau **${fmtTime(Math.floor(elapsed / 1000))}**, ${F(u).expName} **+${fmt(got)}** (${fmt(u.exp)}/${fmt(need)}).`;
  if (ngo) text += '\n🌟 Trong lúc bế quan ngươi đốn ngộ, thu hoạch tăng 50%!';
  if (got < gain - 1) text += `\n_(${F(u).expName} đã chạm mức tối đa của tiểu cảnh, phần dư bị lãng phí.)_`;
  if (u.exp >= need) text += `\n${fullHint(u)}`;
  return i.reply(text);
};

// ---------- Điểm danh ----------
H.diemdanh = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const today = Math.floor((Date.now() + 7 * 3600000) / 86400000);
  if (u.daily.day === today) return err(i, '📅 Hôm nay ngươi đã điểm danh rồi, mai quay lại nhé.');
  u.daily.streak = u.daily.day === today - 1 ? u.daily.streak + 1 : 1;
  u.daily.day = today;
  const gain = Math.round((200 + Math.min(u.daily.streak, 30) * 50) * (1 + u.realm * 0.3));
  u.stone += gain;
  const bonus = [];
  if (u.daily.streak % 3 === 0) { addItem(u, f.starter); bonus.push(itemLabel(f.starter)); }
  if (u.daily.streak % 7 === 0) { addItem(u, f.bonus7); bonus.push(itemLabel(f.bonus7)); }
  saveDB();
  return i.reply(`📅 Điểm danh chuỗi **${u.daily.streak}** ngày! Nhận ${money(u, gain)}${bonus.length ? `\n🎁 Quà thêm: ${bonus.join(', ')}` : ''}`);
};

// ---------- Nghĩa địa ----------
function explore(u) {
  const f = F(u);
  const r = Math.random() * 100;
  const sc = 1 + u.realm * 0.6;

  if (r < 22) {
    const s = Math.round(rand(40, 120) * sc);
    u.stone += s;
    return { color: 0xf1c40f, title: '🪙 Nhặt được tiền cổ', text: `Bên một nấm mồ vỡ, ngươi nhặt được ${money(u, s)}.` };
  }
  if (r < 42) {
    const id = pick(f.mats);
    const n = rand(1, 2);
    addItem(u, id, n);
    return { color: 0x2ecc71, title: '🎒 Tìm được nguyên liệu', text: `Ngươi lục lọi trong nghĩa địa và tìm được **${n}x ${itemLabel(id)}**.` };
  }
  if (r < 56) {
    const got = addExp(u, rand(30, 60) * realmScale(u.realm));
    const text = u.faction === 'dao'
      ? `Một đạo sĩ già râu bạc (Cửu Thúc) chỉ điểm vài chiêu, ${f.expName} **+${fmt(got)}**.`
      : `Ngươi nấp sau bia mộ, nhìn một lão đạo sĩ làm phép và học lỏm được chút, ${f.expName} **+${fmt(got)}**.`;
    return { color: 0x3498db, title: '🧙 Gặp lão đạo sĩ', text };
  }
  if (r < 66) {
    const lose = Math.min(u.stone, Math.round(rand(20, 80) * sc));
    u.stone -= lose;
    return { color: 0xe67e22, title: '🪤 Dính cơ quan mộ cổ', text: `Ngươi giẫm phải cơ quan trong mộ, mất ${money(u, lose)}.` };
  }
  if (r < 80) {
    const def = pick(eligibleHunts(u));
    const mon = makeMonster(u, def);
    const res = fight(makeFighter(u, 'Ngươi', { vsMonster: true }), mon);
    if (res.winner === 'a') {
      const s = Math.round(rand(def.money[0], def.money[1]) * sc * 0.8);
      u.stone += s;
      return { color: 0x2ecc71, title: `⚔️ Đụng độ ${mon.name}`, text: `Giữa đêm khuya, ${mon.name} xuất hiện! Ngươi hạ gục sau ${res.rounds} hiệp, thu được ${money(u, s)}.` };
    }
    const lose = Math.floor(u.stone * 0.05);
    u.stone -= lose;
    return { color: 0xe74c3c, title: `⚔️ Đụng độ ${mon.name}`, text: `${mon.name} quá mạnh, ngươi chạy thoát thân và đánh rơi ${money(u, lose)}.` };
  }
  if (r < 86) {
    const id = Math.random() < 0.5 ? pick(f.rareGear) : pick(f.rareOther);
    addItem(u, id);
    return { color: 0x9b59b6, title: '🏛️ Mộ cổ bí ẩn!', text: `Trong mộ cổ, ngươi tìm được báu vật **${itemLabel(id)}**!` };
  }
  return { color: 0x95a5a6, title: '🌫️ Sương mù nghĩa địa', text: `Chỉ có gió lạnh và tiếng quạ kêu, ngươi không thu hoạch được gì.\n_${pick(C.DAO_NGON)}_` };
}

H.nghiadia = (i) => {
  const u = getUser(i.user.id);
  if (u.seclusion) return err(i, SECL_MSG);
  const left = cdCheck(i.user.id, 'nghiadia', 120000);
  if (left) return err(i, `⏳ Ngươi còn mệt, chờ **${fmtTime(left)}** nữa.`);
  const ev = explore(u);
  saveDB();
  return i.reply({ embeds: [new EmbedBuilder().setColor(ev.color).setTitle(ev.title).setDescription(ev.text)] });
};

// ---------- Hành đạo ----------
H.muctieu = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const lines = huntsOf(u).map((m, idx) => {
    const locked = m.minRealm > u.realm;
    return `**${idx + 1}.** ${m.emoji} ${m.name} — từ **${realmOf(u.faction, m.minRealm).name}**${locked ? ' 🔒' : ''}`;
  });
  return i.reply({ embeds: [new EmbedBuilder().setColor(f.color).setTitle(`${f.emoji} Mục tiêu của ${f.short}`).setDescription(lines.join('\n')).setFooter({ text: 'Dùng /hanhdao so:<số>' })] });
};

H.hanhdao = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  if (u.seclusion) return err(i, SECL_MSG);
  const n = i.options.getInteger('so');
  const list = huntsOf(u);
  const def = n === null ? pick(eligibleHunts(u)) : list[n - 1];
  if (!def) return err(i, '❌ Mục tiêu không hợp lệ, xem `/muctieu`.');
  if (def.minRealm > u.realm) return err(i, `❌ Cần đạt cảnh giới **${realmOf(u.faction, def.minRealm).name}** để đối đầu ${def.name}.`);
  const left = cdCheck(i.user.id, 'hanhdao', 45000);
  if (left) return err(i, `⏳ Chờ **${fmtTime(left)}** nữa.`);

  const mon = makeMonster(u, def);
  const res = fight(makeFighter(u, 'Ngươi', { vsMonster: true }), mon);
  const embed = new EmbedBuilder().setTitle(`${f.emoji} Hành đạo — ${mon.name}`)
    .addFields({ name: 'Diễn biến', value: logText(res.log) });

  if (res.winner === 'a') {
    const money_ = Math.round(rand(def.money[0], def.money[1]) * (1 + u.realm * 0.5));
    const exp = addExp(u, rand(10, 20) * def.power * realmScale(u.realm) * expMulOf(u));
    u.stone += money_;
    u.huntWins++;
    const drops = [];
    for (const d of def.drops) if (Math.random() < d.chance) { addItem(u, d.id); drops.push(itemLabel(d.id)); }
    embed.setColor(0x2ecc71)
      .setDescription(`🏆 Ngươi thắng sau **${res.rounds}** hiệp (còn ❤️ ${fmt(res.ha)}).`)
      .addFields({ name: 'Chiến lợi phẩm', value: `${f.curIcon} +${fmt(money_)}\n✨ ${f.expName} +${fmt(exp)}${drops.length ? `\n🎁 ${drops.join(', ')}` : ''}` });
  } else {
    const lose = Math.floor(u.stone * 0.03);
    u.stone -= lose;
    embed.setColor(0xe74c3c).setDescription(`💀 Ngươi bại trận sau **${res.rounds}** hiệp, mất ${money(u, lose)}. Hãy nâng cấp pháp bảo rồi quay lại!`);
  }
  saveDB();
  return i.reply({ embeds: [embed] });
};

// ---------- Sở đấu (PvP) ----------
H.sodau = async (i) => {
  const target = i.options.getUser('daohuu');
  const bet = i.options.getInteger('cuoc') || 0;
  if (target.bot || target.id === i.user.id) return err(i, '❌ Đối thủ không hợp lệ.');
  const me = getUser(i.user.id);
  const foe = getUser(target.id);
  if (!foe.faction) return err(i, `❌ ${target.username} chưa chọn phái.`);
  if (me.seclusion) return err(i, SECL_MSG);
  if (foe.seclusion) return err(i, `🚪 ${target.username} đang bế quan.`);
  if (bet > me.stone) return err(i, '❌ Ngươi không đủ tiền để đặt cược.');
  if (bet > foe.stone) return err(i, `❌ ${target.username} không đủ tiền để nhận cược.`);
  const left = cdCheck(i.user.id, 'sodau', 120000);
  if (left) return err(i, `⏳ Chờ **${fmtTime(left)}** nữa mới thách đấu tiếp.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('accept').setLabel('Chấp nhận').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('decline').setLabel('Từ chối').setStyle(ButtonStyle.Danger),
  );
  await i.reply({
    content: `⚔️ <@${target.id}>, **${i.user.username}** (${F(me).emoji} ${realmName(me)}) thách đấu ngươi${bet ? ` với cược **${fmt(bet)}**` : ''}! Ngươi có 30 giây để quyết định.`,
    components: [row],
    allowedMentions: { users: [target.id] },
  });
  const msg = await i.fetchReply();

  let btn;
  try {
    btn = await msg.awaitMessageComponent({ filter: (b) => b.user.id === target.id, time: 30000 });
  } catch {
    return i.editReply({ content: '⌛ Đối phương không trả lời, trận đấu bị hủy.', components: [] });
  }
  if (btn.customId === 'decline') return btn.update({ content: `🏳️ ${target.username} từ chối lời thách đấu.`, components: [] });
  if (bet > me.stone || bet > foe.stone || me.seclusion || foe.seclusion) {
    return btn.update({ content: '❌ Điều kiện thách đấu không còn thỏa mãn.', components: [] });
  }

  const advMe = advantage(me.faction, foe.faction);
  const advFoe = advantage(foe.faction, me.faction);
  const A = makeFighter(me, i.user.username, { adv: advMe });
  const B = makeFighter(foe, target.username, { adv: advFoe });
  const res = fight(A, B);
  const winner = res.winner === 'a' ? i.user : target;
  const wU = res.winner === 'a' ? me : foe;
  const lU = res.winner === 'a' ? foe : me;
  wU.wins++;
  lU.losses++;
  wU.stone += bet;
  lU.stone -= bet;
  saveDB();

  let note = '';
  if (advMe > 1) note = `\n_${F(me).short} khắc chế ${F(foe).short}: +20% sát thương cho ${i.user.username}._`;
  if (advFoe > 1) note = `\n_${F(foe).short} khắc chế ${F(me).short}: +20% sát thương cho ${target.username}._`;
  const embed = new EmbedBuilder().setColor(0xe67e22).setTitle('⚔️ Sở đấu')
    .setDescription(`${F(me).emoji} **${A.name}** (💪 ${fmt(power(me))}) vs ${F(foe).emoji} **${B.name}** (💪 ${fmt(power(foe))})${note}`)
    .addFields(
      { name: 'Diễn biến', value: logText(res.log) },
      { name: 'Kết quả', value: `🏆 **${winner.username}** thắng sau ${res.rounds} hiệp!${bet ? `\nNhận **${fmt(bet)}**` : ''}` },
    );
  return btn.update({ content: '', embeds: [embed], components: [] });
};

// ---------- Cửa hàng / túi đồ ----------
const GROUPS = (f) => ({ use: f.craftLabel, mat: '🧰 Nguyên liệu', weapon: '⚔️ Vũ khí', armor: '🥋 Giáp' });

H.cuahang = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const embed = new EmbedBuilder().setColor(f.color).setTitle(`🛒 Cửa hàng ${f.short}`)
    .setFooter({ text: 'Dùng /mua <tên vật phẩm> [số lượng]' });
  for (const [type, label] of Object.entries(GROUPS(f))) {
    const lines = Object.values(C.ITEMS)
      .filter((it) => it.type === type && it.price && it.faction === u.faction)
      .map((it) => {
        const stat = [it.atk ? `⚔️+${it.atk}` : '', it.def ? `🛡️+${it.def}` : '', it.hp ? `❤️+${it.hp}` : ''].filter(Boolean).join(' ');
        return `${it.emoji} **${it.name}** — ${fmt(it.price)} ${f.curIcon} ${stat}\n_${it.desc}_`;
      });
    if (lines.length) embed.addFields({ name: label, value: lines.join('\n') });
  }
  return i.reply({ embeds: [embed] });
};

H.mua = (i) => {
  const u = getUser(i.user.id);
  const ids = Object.keys(C.ITEMS).filter((id) => C.ITEMS[id].price && C.ITEMS[id].faction === u.faction);
  const id = findItem(i.options.getString('vatpham'), ids);
  if (!id) return err(i, '❌ Không tìm thấy vật phẩm trong cửa hàng của phái ngươi. Xem `/cuahang`.');
  const n = i.options.getInteger('soluong') || 1;
  const cost = C.ITEMS[id].price * n;
  if (u.stone < cost) return err(i, `❌ Cần **${fmt(cost)}** ${F(u).curIcon} nhưng ngươi chỉ có ${fmt(u.stone)}.`);
  u.stone -= cost;
  addItem(u, id, n);
  saveDB();
  return i.reply(`✅ Đã mua **${n}x ${itemLabel(id)}** với giá ${money(u, cost)}.`);
};

H.ban = (i) => {
  const u = getUser(i.user.id);
  const id = findItem(i.options.getString('vatpham'), Object.keys(u.items));
  if (!id) return err(i, '❌ Ngươi không có vật phẩm đó.');
  const n = Math.min(i.options.getInteger('soluong') || 1, itemCount(u, id));
  const gain = C.ITEMS[id].sell * n;
  takeItem(u, id, n);
  u.stone += gain;
  saveDB();
  return i.reply(`💱 Đã bán **${n}x ${itemLabel(id)}** nhận ${money(u, gain)}.`);
};

H.kho = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const entries = Object.entries(u.items);
  const embed = new EmbedBuilder().setColor(f.color).setTitle(`🎒 Túi đồ của ${i.user.username}`)
    .setDescription(`${f.curIcon} **${fmt(u.stone)}** ${f.cur}`);
  for (const [type, label] of Object.entries(GROUPS(f))) {
    const lines = entries.filter(([id]) => C.ITEMS[id].type === type).map(([id, n]) => `${itemLabel(id)} x${n}`);
    if (lines.length) embed.addFields({ name: label, value: lines.join('\n') });
  }
  if (!entries.length) embed.addFields({ name: 'Trống', value: 'Túi đồ chưa có gì. Hãy thử `/nghiadia` hoặc `/hanhdao`!' });
  return i.reply({ embeds: [embed] });
};

H.dung = (i) => {
  const u = getUser(i.user.id);
  const usable = Object.keys(u.items).filter((id) => C.ITEMS[id].effect && C.ITEMS[id].faction === u.faction);
  const id = findItem(i.options.getString('vatpham'), usable);
  if (!id) return err(i, '❌ Ngươi không có vật phẩm dùng được như vậy.');
  const eff = C.ITEMS[id].effect;
  const it = C.ITEMS[id];

  if (eff.type === 'exp') {
    const need = expNeeded(u.realm, u.stage);
    if (u.exp >= need) return err(i, fullHint(u));
    takeItem(u, id);
    const got = addExp(u, eff.amount * realmScale(u.realm));
    saveDB();
    return i.reply(`${it.emoji} Ngươi dùng **${it.name}**, ${F(u).expName} **+${fmt(got)}** (${fmt(u.exp)}/${fmt(need)}).`);
  }
  if (eff.type === 'kiep') {
    if (u.buff.kiep > 0) return err(i, '❌ Ngươi đã có vật hộ mệnh đang phát huy tác dụng.');
    takeItem(u, id);
    u.buff.kiep = eff.amount;
    saveDB();
    return i.reply(`🛡️ Ngươi dùng **${it.name}**, lần vượt ${F(u).kiepName} kế tiếp tăng **+${eff.amount}%** tỉ lệ thành công.`);
  }
  if (eff.type === 'combat') {
    if (u.buff.combat > 0) return err(i, '❌ Ngươi đã có hiệu ứng tăng sát thương đang chờ trận kế tiếp.');
    takeItem(u, id);
    u.buff.combat = eff.amount;
    saveDB();
    return i.reply(`🧿 Ngươi dùng **${it.name}**, trận đánh kế tiếp sát thương tăng **+${eff.amount}%**.`);
  }
  if (eff.type === 'resetcd') {
    takeItem(u, id);
    cooldowns.delete(`${i.user.id}:luyencong`);
    saveDB();
    return i.reply(`⏱️ Ngươi dùng **${it.name}**, có thể \`/luyencong\` ngay lập tức!`);
  }
  return err(i, 'Vật phẩm này không dùng được.');
};

// ---------- Trang bị ----------
H.trangbi = (i) => {
  const u = getUser(i.user.id);
  const sub = i.options.getSubcommand();

  if (sub === 'xem') {
    const st = getStats(u);
    return i.reply({
      embeds: [new EmbedBuilder().setColor(F(u).color).setTitle('🎒 Pháp bảo đang mang')
        .addFields(
          { name: 'Vũ khí', value: u.equip.weapon ? itemLabel(u.equip.weapon) : 'Không', inline: true },
          { name: 'Giáp', value: u.equip.armor ? itemLabel(u.equip.armor) : 'Không', inline: true },
          { name: 'Chỉ số', value: `❤️ ${fmt(st.hp)}  ⚔️ ${fmt(st.atk)}  🛡️ ${fmt(st.def)}` },
        )],
    });
  }
  if (sub === 'mac') {
    const gear = Object.keys(u.items).filter((id) => ['weapon', 'armor'].includes(C.ITEMS[id].type) && C.ITEMS[id].faction === u.faction);
    const id = findItem(i.options.getString('vatpham'), gear);
    if (!id) return err(i, '❌ Ngươi không có pháp bảo đó (hoặc không thuộc phái của ngươi).');
    const slot = C.ITEMS[id].type;
    takeItem(u, id);
    if (u.equip[slot]) addItem(u, u.equip[slot]);
    u.equip[slot] = id;
    saveDB();
    return i.reply(`✅ Ngươi đã mang **${itemLabel(id)}**.`);
  }
  const slot = i.options.getString('loai');
  if (!u.equip[slot]) return err(i, '❌ Ngươi chưa mang món nào ở vị trí đó.');
  const id = u.equip[slot];
  u.equip[slot] = null;
  addItem(u, id);
  saveDB();
  return i.reply(`✅ Đã tháo **${itemLabel(id)}** cất vào túi.`);
};

// ---------- Chế tạo ----------
const needText = (need) => Object.entries(need).map(([id, n]) => `${n}x ${itemLabel(id)}`).join(' + ');

H.congthuc = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const lines = Object.entries(C.RECIPES[u.faction]).map(
    ([id, r]) => `${itemLabel(id)} — ${needText(r.need)} _(thành công ${r.chance}%)_`,
  );
  return i.reply({ embeds: [new EmbedBuilder().setColor(f.color).setTitle(`${f.craftLabel} — công thức`).setDescription(lines.join('\n')).setFooter({ text: 'Dùng /chetao <tên vật phẩm>' })] });
};

H.chetao = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const recipes = C.RECIPES[u.faction];
  const id = findItem(i.options.getString('vatpham'), Object.keys(recipes));
  if (!id) return err(i, '❌ Không có công thức đó, xem `/congthuc`.');
  const recipe = recipes[id];
  for (const [m, n] of Object.entries(recipe.need)) {
    if (itemCount(u, m) < n) return err(i, `❌ Thiếu nguyên liệu: cần ${needText(recipe.need)}.`);
  }
  const left = cdCheck(i.user.id, 'chetao', 20000);
  if (left) return err(i, `⏳ Chờ **${fmtTime(left)}** nữa.`);
  for (const [m, n] of Object.entries(recipe.need)) takeItem(u, m, n);

  const ok = rand(1, 100) <= recipe.chance;
  if (ok) addItem(u, id);
  saveDB();
  const failText = { dao: 'Nét bút run lên, lá bùa cháy thành tro...', ma: 'Oán khí phản phệ, nguyên liệu tan thành khói đen...', thi: 'Lò đan nổ tung, nguyên liệu hóa tro tàn...' }[u.faction];
  return i.reply({
    embeds: [new EmbedBuilder().setColor(ok ? 0x2ecc71 : 0xe74c3c)
      .setTitle(ok ? `${f.emoji} ${f.craftVerb} thành công!` : `💨 ${f.craftVerb} thất bại`)
      .setDescription(ok ? `Ngươi thu được **${itemLabel(id)}**.` : failText)],
  });
};

// ---------- Môn phái ----------
function findSect(query, faction) {
  const key = sectKey(query);
  const s = db.sects[key];
  if (s && (!faction || s.faction === faction)) return [key, s];
  return Object.entries(db.sects).find(([, x]) => (!faction || x.faction === faction) && norm(x.name).includes(norm(query))) || [null, null];
}

H.monphai = (i) => {
  const u = getUser(i.user.id);
  const f = F(u);
  const sub = i.options.getSubcommand();
  const mySect = getSectOf(u);
  if (u.sect && !mySect) u.sect = null; // đã giải tán / khác phái

  if (sub === 'tao') {
    if (mySect) return err(i, `❌ Ngươi đã thuộc một ${f.sectLabel.toLowerCase()}.`);
    if (u.realm < 2) return err(i, `❌ Cần đạt cảnh giới **${realmOf(u.faction, 2).name}** trở lên.`);
    if (u.stone < 5000) return err(i, `❌ Cần 5.000 ${f.curIcon} để khai sáng.`);
    const name = i.options.getString('ten').trim();
    const key = sectKey(name);
    if (!key || db.sects[key]) return err(i, '❌ Tên không hợp lệ hoặc đã tồn tại.');
    u.stone -= 5000;
    db.sects[key] = { name, faction: u.faction, leader: i.user.id, members: [i.user.id], level: 1, fund: 0 };
    u.sect = key;
    saveDB();
    return i.reply(`${f.sectIcon} **${i.user.username}** khai sáng ${f.sectLabel.toLowerCase()} **${name}**! Tu luyện nhanh hơn +5% mỗi cấp.`);
  }

  if (sub === 'thamgia') {
    if (mySect) return err(i, '❌ Ngươi đã thuộc một tổ chức, hãy `/monphai roi` trước.');
    const [key, s] = findSect(i.options.getString('ten'), u.faction);
    if (!s) return err(i, `❌ Không tìm thấy ${f.sectLabel.toLowerCase()} nào của phái ngươi với tên đó.`);
    if (s.members.length >= sectMaxMembers(s)) return err(i, '❌ Đã đủ người.');
    s.members.push(i.user.id);
    u.sect = key;
    saveDB();
    return i.reply(`${f.sectIcon} **${i.user.username}** đã gia nhập **${s.name}**!`);
  }

  if (sub === 'roi') {
    if (!mySect) return err(i, '❌ Ngươi chưa thuộc tổ chức nào.');
    const key = u.sect;
    mySect.members = mySect.members.filter((m) => m !== i.user.id);
    u.sect = null;
    let note = '';
    if (!mySect.members.length) {
      delete db.sects[key];
      note = ' Tổ chức đã giải tán vì không còn ai.';
    } else if (mySect.leader === i.user.id) {
      mySect.leader = mySect.members[0];
      note = ` Người đứng đầu mới là <@${mySect.leader}>.`;
    }
    saveDB();
    return i.reply({ content: `🚪 **${i.user.username}** đã rời **${mySect.name}**.${note}`, allowedMentions: { parse: [] } });
  }

  if (sub === 'thongtin') {
    const q = i.options.getString('ten');
    const s = q ? findSect(q)[1] : mySect;
    if (!s) return err(i, q ? '❌ Không tìm thấy.' : '❌ Ngươi chưa thuộc tổ chức nào.');
    const sf = C.FACTIONS[s.faction];
    const need = s.level * 5000;
    const shown = s.members.slice(0, 15).map((m) => `<@${m}>`).join(', ');
    const embed = new EmbedBuilder().setColor(sf.color).setTitle(`${sf.sectIcon} ${s.name} (${sf.sectLabel})`)
      .addFields(
        { name: 'Người đứng đầu', value: `<@${s.leader}>`, inline: true },
        { name: 'Cấp', value: `${s.level}/${SECT_MAX_LEVEL} (+${s.level * 5}% tu luyện)`, inline: true },
        { name: 'Thành viên', value: `${s.members.length}/${sectMaxMembers(s)}`, inline: true },
        { name: 'Quỹ', value: s.level >= SECT_MAX_LEVEL ? `${fmt(s.fund)} (cấp tối đa)` : `${fmt(s.fund)}/${fmt(need)} ${sf.curIcon}` },
        { name: 'Danh sách', value: shown + (s.members.length > 15 ? ` … và ${s.members.length - 15} người khác` : '') },
      );
    return i.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }

  if (sub === 'cungtien') {
    if (!mySect) return err(i, '❌ Ngươi chưa thuộc tổ chức nào.');
    if (mySect.level >= SECT_MAX_LEVEL) return err(i, '❌ Đã đạt cấp tối đa.');
    const n = i.options.getInteger('soluong');
    if (u.stone < n) return err(i, '❌ Ngươi không đủ tiền.');
    u.stone -= n;
    mySect.fund += n;
    let up = 0;
    while (mySect.level < SECT_MAX_LEVEL && mySect.fund >= mySect.level * 5000) {
      mySect.fund -= mySect.level * 5000;
      mySect.level++;
      up++;
    }
    saveDB();
    return i.reply(`🙏 **${i.user.username}** cống hiến ${money(u, n)} cho **${mySect.name}**.${up ? `\n🎉 Thăng lên **cấp ${mySect.level}**!` : ''}`);
  }

  const top = Object.values(db.sects).sort((a, b) => b.level - a.level || b.members.length - a.members.length).slice(0, 10);
  if (!top.length) return i.reply('Chưa có tổ chức nào. Hãy là người đầu tiên: `/monphai tao`!');
  const lines = top.map((s, idx) => `**${idx + 1}.** ${C.FACTIONS[s.faction].sectIcon} ${s.name} — Cấp ${s.level} · ${s.members.length} thành viên`);
  return i.reply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🏯 Các tổ chức hàng đầu').setDescription(lines.join('\n'))] });
};

// ---------- Tặng ----------
H.tang = (i) => {
  const target = i.options.getUser('daohuu');
  const n = i.options.getInteger('soluong');
  if (target.bot || target.id === i.user.id) return err(i, '❌ Người nhận không hợp lệ.');
  const u = getUser(i.user.id);
  if (u.stone < n) return err(i, '❌ Ngươi không đủ tiền.');
  const received = Math.floor(n * 0.95);
  u.stone -= n;
  getUser(target.id).stone += received;
  saveDB();
  return i.reply({ content: `🎁 **${i.user.username}** tặng <@${target.id}> **${fmt(received)}** (thuế 5%).`, allowedMentions: { users: [target.id] } });
};

// ---------- Bói / đạo ngôn / xếp hạng ----------
H.boi = (i) => {
  const q = i.options.getString('cauhoi');
  const que = pick(C.QUE);
  const embed = new EmbedBuilder().setColor(0x3498db).setTitle('🔮 Đạo sĩ gieo quẻ')
    .addFields(
      ...(q ? [{ name: 'Câu hỏi', value: q.slice(0, 500) }] : []),
      { name: 'Quẻ', value: que.ten },
      { name: 'Lời giải', value: que.y },
      { name: 'Vận thế', value: `💰 Tài lộc: ${stars(rand(1, 5))}\n❤️ Tình duyên: ${stars(rand(1, 5))}\n💼 Sự nghiệp: ${stars(rand(1, 5))}\n👻 Gặp ma đêm nay: ${stars(rand(1, 5))}` },
    )
    .setFooter({ text: 'Chỉ mang tính giải trí, đừng quá tin!' });
  return i.reply({ embeds: [embed] });
};

H.daongon = (i) => i.reply(`☯️ *${pick(C.DAO_NGON)}*`);

H.bangxephang = (i) => {
  const type = i.options.getString('loai') || 'tuvi';
  const only = i.options.getString('phai');
  const list = Object.keys(db.users).map((id) => [id, getUser(id)]).filter(([, u]) => u.faction && (!only || u.faction === only));
  const sorters = {
    tuvi: (a, b) => b.realm - a.realm || b.stage - a.stage || b.exp - a.exp,
    tien: (a, b) => b.stone - a.stone,
    thang: (a, b) => b.wins - a.wins,
  };
  const top = list.sort(([, a], [, b]) => sorters[type](a, b)).slice(0, 10);
  if (!top.length) return i.reply('Chưa có ai trong bảng xếp hạng.');
  const lines = top.map(([id, u], idx) => {
    const val = type === 'tuvi' ? realmName(u) : type === 'tien' ? `${fmt(u.stone)} ${F(u).curIcon}` : `${u.wins} trận thắng`;
    return `**${idx + 1}.** ${F(u).emoji} <@${id}> — ${val}`;
  });
  const titles = { tuvi: '🏔️ Bảng xếp hạng cảnh giới', tien: '💰 Bảng xếp hạng tiền', thang: '⚔️ Bảng xếp hạng sở đấu' };
  return i.reply({ embeds: [new EmbedBuilder().setColor(0xe67e22).setTitle(titles[type] + (only ? ` — ${C.FACTIONS[only].name}` : '')).setDescription(lines.join('\n'))], allowedMentions: { parse: [] } });
};

// ====================== KHỞI ĐỘNG BOT ======================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  console.log(`🧙 Đạo sĩ đã xuất sơn: ${client.user.tag}`);
  client.user.setActivity('nghĩa địa lúc nửa đêm', { type: ActivityType.Watching });
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: commands });
    console.log(`✅ Đã đăng ký ${commands.length} slash commands`);
  } catch (e) {
    console.error('Lỗi đăng ký lệnh:', e);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handler = H[interaction.commandName];
  if (!handler) return;
  try {
    if (!NO_FACTION_OK.has(interaction.commandName) && !getUser(interaction.user.id).faction) {
      return await err(interaction, '🪦 Ngươi chưa chọn phái! Hãy dùng `/chonphai` để làm **Đạo Sĩ**, **Ma** hoặc **Cương Thi**.');
    }
    await handler(interaction);
  } catch (e) {
    console.error(e);
    const msg = { content: '⚠️ Có lỗi xảy ra, lá bùa bị cháy mất rồi...', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
    else interaction.reply(msg).catch(() => {});
  }
});

// Cho phép require() để kiểm thử mà không đăng nhập
if (require.main !== module) {
  module.exports = { H, commands, cooldowns };
} else {
  if (!TOKEN || !CLIENT_ID) {
    console.error('Thiếu DISCORD_TOKEN hoặc CLIENT_ID trong file .env');
    process.exit(1);
  }
  client.login(TOKEN);
}
