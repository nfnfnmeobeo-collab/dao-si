require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // tuỳ chọn: có thì lệnh cập nhật ngay lập tức

// ====================== DỮ LIỆU ======================
const DATA_FILE = path.join(__dirname, 'data.json');
let db = {};
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch {
  db = {};
}
const saveDB = () => fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));

function getUser(id) {
  if (!db[id]) db[id] = { realm: 0, exp: 0, kiepThanhCong: 0, kiepThatBai: 0 };
  return db[id];
}

const REALMS = [
  'Luyện Khí',
  'Trúc Cơ',
  'Kim Đan',
  'Nguyên Anh',
  'Hóa Thần',
  'Luyện Hư',
  'Hợp Thể',
  'Đại Thừa',
  'Độ Kiếp Phi Thăng',
];
const expNeeded = (realm) => 100 + realm * 150;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ====================== NỘI DUNG ======================
const QUE = [
  { ten: 'Càn ☰ (Trời)', y: 'Dương khí vượng, hành sự chính trực sẽ thành. Chớ kiêu ngạo kẻo họa đến.' },
  { ten: 'Khôn ☷ (Đất)', y: 'Nhu thuận, nhẫn nại, đức dày chở vật. Hợp việc tích lũy, không hợp tranh đấu.' },
  { ten: 'Chấn ☳ (Sấm)', y: 'Biến động bất ngờ, tuy giật mình nhưng là cơ hội đổi mới. Giữ bình tĩnh.' },
  { ten: 'Tốn ☴ (Gió)', y: 'Việc tiến triển từ từ, thuận theo hoàn cảnh. Nên nghe lời người có kinh nghiệm.' },
  { ten: 'Khảm ☵ (Nước)', y: 'Hiểm trở trùng trùng, nhưng giữ vững lòng tin sẽ vượt qua. Cẩn thận tiền bạc.' },
  { ten: 'Ly ☲ (Lửa)', y: 'Sáng suốt, danh tiếng nổi lên. Cẩn thận nóng nảy làm hỏng việc.' },
  { ten: 'Cấn ☶ (Núi)', y: 'Nên dừng lại suy xét, tĩnh tâm. Chưa phải lúc hành động lớn.' },
  { ten: 'Đoài ☱ (Hồ)', y: 'Vui vẻ, giao tiếp thuận lợi, có tin mừng. Tránh lời nói đãi bôi.' },
];

const DAO_NGON = [
  'Biết người là trí, biết mình mới là sáng.',
  'Nước mềm yếu nhất mà thắng được cái cứng rắn nhất.',
  'Hành trình ngàn dặm bắt đầu từ một bước chân.',
  'Biết đủ thì không nhục, biết dừng thì không nguy.',
  'Làm mà không tranh — đó là đạo của bậc thánh nhân.',
  'Tâm tĩnh thì vạn sự tự an.',
  'Người thắng người là có sức, người thắng mình mới là mạnh.',
  'Thuận theo tự nhiên, đừng cưỡng cầu.',
];

const TU_LUYEN_FLAVOR = [
  'Ngươi ngồi thiền dưới gốc tùng bên thác nước, linh khí tụ về đan điền.',
  'Trong sơn động tĩnh mịch, ngươi vận chuyển chu thiên một vòng.',
  'Ánh trăng rọi xuống, ngươi hấp thụ tinh hoa nhật nguyệt.',
  'Ngươi đả tọa trên đỉnh núi mây mù, tâm cảnh thông suốt.',
  'Ngươi luyện một lò đan nhỏ, dược lực tan vào kinh mạch.',
];

// ====================== LỆNH ======================
const commands = [
  new SlashCommandBuilder().setName('tuluyen').setDescription('Ngồi thiền tu luyện để tăng tu vi'),
  new SlashCommandBuilder().setName('dokiep').setDescription('Độ kiếp để đột phá cảnh giới (cần đủ tu vi)'),
  new SlashCommandBuilder()
    .setName('hoso')
    .setDescription('Xem hồ sơ tu tiên')
    .addUserOption((o) => o.setName('daohuu').setDescription('Đạo hữu muốn xem')),
  new SlashCommandBuilder()
    .setName('boi')
    .setDescription('Xin đạo sĩ gieo quẻ Bát Quái')
    .addStringOption((o) => o.setName('cauhoi').setDescription('Điều bạn muốn hỏi')),
  new SlashCommandBuilder().setName('daongon').setDescription('Nhận một câu đạo ngôn'),
  new SlashCommandBuilder().setName('bangxephang').setDescription('Top 10 đạo hữu tu vi cao nhất'),
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);
  await rest.put(route, { body: commands });
  console.log('✅ Đã đăng ký slash commands');
}

// ====================== BOT ======================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Map(); // userId -> timestamp
const COOLDOWN_MS = 60 * 1000;

client.once('ready', async () => {
  console.log(`🧙 Đạo sĩ đã xuất sơn: ${client.user.tag}`);
  client.user.setActivity('đả tọa luyện đan', { type: 4 });
  try {
    await registerCommands();
  } catch (err) {
    console.error('Lỗi đăng ký lệnh:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  try {
    // ---------- /tuluyen ----------
    if (commandName === 'tuluyen') {
      const last = cooldowns.get(interaction.user.id) || 0;
      const remain = last + COOLDOWN_MS - Date.now();
      if (remain > 0) {
        return interaction.reply({
          content: `⏳ Linh khí chưa hồi phục, hãy chờ **${Math.ceil(remain / 1000)}s** nữa.`,
          ephemeral: true,
        });
      }
      cooldowns.set(interaction.user.id, Date.now());

      const u = getUser(interaction.user.id);
      const gain = rand(10, 30) + u.realm * 5;
      u.exp += gain;
      saveDB();

      const need = expNeeded(u.realm);
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🧘 Tu luyện')
        .setDescription(`${pick(TU_LUYEN_FLAVOR)}\n\nTu vi tăng **+${gain}**.`)
        .addFields(
          { name: 'Cảnh giới', value: REALMS[u.realm], inline: true },
          { name: 'Tu vi', value: `${u.exp}/${need}`, inline: true },
        );
      if (u.exp >= need && u.realm < REALMS.length - 1) {
        embed.setFooter({ text: 'Tu vi đã đầy! Dùng /dokiep để đột phá.' });
      }
      return interaction.reply({ embeds: [embed] });
    }

    // ---------- /dokiep ----------
    if (commandName === 'dokiep') {
      const u = getUser(interaction.user.id);
      if (u.realm >= REALMS.length - 1) {
        return interaction.reply('🌟 Ngươi đã đạt cảnh giới cao nhất, không còn kiếp nào để độ.');
      }
      const need = expNeeded(u.realm);
      if (u.exp < need) {
        return interaction.reply({
          content: `❌ Tu vi chưa đủ (${u.exp}/${need}). Hãy tu luyện thêm.`,
          ephemeral: true,
        });
      }

      const chance = Math.max(30, 75 - u.realm * 5);
      const success = rand(1, 100) <= chance;
      const embed = new EmbedBuilder().setTimestamp();

      if (success) {
        u.realm += 1;
        u.exp = 0;
        u.kiepThanhCong += 1;
        embed
          .setColor(0xf1c40f)
          .setTitle('⚡ Độ kiếp thành công!')
          .setDescription(`Thiên lôi giáng xuống, ngươi vững vàng chống đỡ.\nĐột phá lên **${REALMS[u.realm]}**!`);
      } else {
        u.exp = Math.floor(u.exp / 2);
        u.kiepThatBai += 1;
        embed
          .setColor(0xe74c3c)
          .setTitle('💥 Độ kiếp thất bại')
          .setDescription('Thiên lôi quá mạnh, ngươi trọng thương. Mất một nửa tu vi.');
      }
      embed.setFooter({ text: `Tỉ lệ thành công: ${chance}%` });
      saveDB();
      return interaction.reply({ embeds: [embed] });
    }

    // ---------- /hoso ----------
    if (commandName === 'hoso') {
      const target = interaction.options.getUser('daohuu') || interaction.user;
      const u = getUser(target.id);
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`📜 Hồ sơ của ${target.username}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: 'Cảnh giới', value: REALMS[u.realm], inline: true },
          { name: 'Tu vi', value: `${u.exp}/${expNeeded(u.realm)}`, inline: true },
          { name: 'Độ kiếp', value: `✅ ${u.kiepThanhCong} | ❌ ${u.kiepThatBai}`, inline: true },
        );
      return interaction.reply({ embeds: [embed] });
    }

    // ---------- /boi ----------
    if (commandName === 'boi') {
      const q = interaction.options.getString('cauhoi');
      const que = pick(QUE);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔮 Đạo sĩ gieo quẻ')
        .addFields(
          ...(q ? [{ name: 'Câu hỏi', value: q }] : []),
          { name: 'Quẻ', value: que.ten },
          { name: 'Lời giải', value: que.y },
        )
        .setFooter({ text: 'Chỉ mang tính giải trí, đừng quá tin!' });
      return interaction.reply({ embeds: [embed] });
    }

    // ---------- /daongon ----------
    if (commandName === 'daongon') {
      return interaction.reply(`☯️ *${pick(DAO_NGON)}*`);
    }

    // ---------- /bangxephang ----------
    if (commandName === 'bangxephang') {
      const top = Object.entries(db)
        .sort(([, a], [, b]) => b.realm - a.realm || b.exp - a.exp)
        .slice(0, 10);
      if (!top.length) return interaction.reply('Chưa có đạo hữu nào tu luyện.');
      const lines = top.map(
        ([id, u], i) => `**${i + 1}.** <@${id}> — ${REALMS[u.realm]} (${u.exp} tu vi)`,
      );
      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('🏔️ Bảng xếp hạng tu tiên')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
  } catch (err) {
    console.error(err);
    const msg = { content: '⚠️ Có lỗi xảy ra, đạo sĩ đang tẩu hỏa nhập ma...', ephemeral: true };
    if (interaction.replied || interaction.deferred) interaction.followUp(msg);
    else interaction.reply(msg);
  }
});

if (!TOKEN || !CLIENT_ID) {
  console.error('Thiếu DISCORD_TOKEN hoặc CLIENT_ID trong file .env');
  process.exit(1);
}
client.login(TOKEN);
