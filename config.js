// ====================== DỮ LIỆU TĨNH: ĐẠO SĨ - MA - CƯƠNG THI ======================
// Ba phái, mỗi phái 12 đại cảnh giới, mỗi cảnh giới có 4 tiểu cảnh.

const STAGES = ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ', 'Viên Mãn'];

const REALMS = {
  // Đạo sĩ Mao Sơn
  dao: [
    { name: 'Đạo Đồng', icon: '👦' },
    { name: 'Tập Sự Đạo Sĩ', icon: '📿' },
    { name: 'Phù Chú Sư', icon: '📜' },
    { name: 'Trừ Tà Sư', icon: '🗡️' },
    { name: 'Pháp Sư', icon: '🪬' },
    { name: 'Chân Nhân', icon: '🧘' },
    { name: 'Thiên Sư', icon: '🎋' },
    { name: 'Chưởng Môn', icon: '🏯' },
    { name: 'Đạo Quân', icon: '🌗' },
    { name: 'Chân Quân', icon: '☁️' },
    { name: 'Thiên Tôn', icon: '🌟' },
    { name: 'Đạo Tổ', icon: '☯️' },
  ],
  // Ma quỷ
  ma: [
    { name: 'Cô Hồn Dã Quỷ', icon: '👻' },
    { name: 'Oan Hồn', icon: '😢' },
    { name: 'Lệ Quỷ', icon: '🩸' },
    { name: 'Quỷ Soái', icon: '💀' },
    { name: 'Ác Linh', icon: '🌫️' },
    { name: 'Quỷ Vương', icon: '👑' },
    { name: 'Ma Tướng', icon: '⚔️' },
    { name: 'Ma Vương', icon: '😈' },
    { name: 'Ma Quân', icon: '🔥' },
    { name: 'U Minh Ma Đế', icon: '🌑' },
    { name: 'Thiên Ma', icon: '🌀' },
    { name: 'Ma Tổ', icon: '👁️' },
  ],
  // Cương thi
  thi: [
    { name: 'Tử Thi', icon: '⚰️' },
    { name: 'Hành Thi', icon: '🚶' },
    { name: 'Bạch Cương', icon: '🤍' },
    { name: 'Lục Cương', icon: '💚' },
    { name: 'Mao Cương', icon: '🧟' },
    { name: 'Hắc Cương', icon: '🖤' },
    { name: 'Phi Cương', icon: '🦇' },
    { name: 'Du Thi', icon: '🌫️' },
    { name: 'Phục Thi', icon: '🪦' },
    { name: 'Bất Hóa Cốt', icon: '🦴' },
    { name: 'Hạn Bạt', icon: '🔥' },
    { name: 'Hống (Thi Tổ)', icon: '🐲' },
  ],
};

// Đặc tính từng phái
const FACTIONS = {
  dao: {
    id: 'dao', name: 'Đạo Sĩ Mao Sơn', short: 'Đạo Sĩ', emoji: '☯️', color: 0xf1c40f,
    desc: 'Dùng bùa chú, kiếm gỗ đào, gạo nếp, máu chó đen để trừ ma diệt cương thi. Cân bằng, tu luyện nhanh, đặc biệt mạnh khi **trừ tà** (+20% sát thương lên mục tiêu khi hành đạo). Ban ngày tu luyện nhanh hơn.',
    hpMul: 1, atkMul: 1.05, defMul: 1, expMul: 1.1, dodge: 0.06, huntBonus: 1.2,
    expName: 'Đạo Hạnh', cur: 'ngân lượng', curIcon: '💰',
    verbs: ['vung Kiếm Gỗ Đào chém', 'dán bùa vào', 'rải gạo nếp vào', 'đọc chú rồi đánh', 'tung Đồng Tiền Kiếm vào'],
    kiepName: 'Thiên Lôi Kiếp',
    kiepFlavor: ['Mây đen kéo đến, sấm chớp vang rền trên đỉnh Mao Sơn...', 'Thiên địa biến sắc, chín đạo thiên lôi chờ giáng xuống...', 'Ngươi bày đàn, thắp hương, tay bắt ấn quyết nghênh đón lôi kiếp...'],
    luyen: [
      'Ngươi ngồi thiền trước đàn thờ Tam Thanh, hương khói nghi ngút.',
      'Dưới ánh trăng, ngươi múa kiếm gỗ đào, luyện lại các thế Mao Sơn.',
      'Ngươi tụng kinh, vẽ bùa suốt đêm, đạo hạnh tiến thêm một bước.',
      'Ngươi bắt ấn niệm chú trước la bàn, thiên địa thanh khí hội tụ.',
      'Ngươi luyện Bát Quái Bộ trong sân quán, tâm cảnh thông suốt.',
    ],
    sectLabel: 'Môn phái', sectIcon: '🏯', craftLabel: '📜 Bùa chú', craftVerb: 'Vẽ bùa',
    mats: ['giay_vang', 'giay_vang', 'chu_sa', 'gao_nep', 'mau_cho_den'],
    starter: 'boa_tu_dao', bonus7: 'thanh_tam_hoan', startWeapon: 'kiem_go_dao',
    rareGear: ['loi_kich_kiem', 'cuu_thien_bao'], rareOther: ['go_dao', 'boa_ho_menh', 'thanh_tam_hoan'],
  },
  ma: {
    id: 'ma', name: 'Ma Quỷ', short: 'Ma', emoji: '👻', color: 0x8e44ad,
    desc: 'Hồn ma oán khí, thoắt ẩn thoắt hiện. Sát thương cao, **né đòn giỏi** (18%), nhưng thể phách yếu. Ban đêm hấp thụ âm khí nhanh hơn, ban ngày suy yếu.',
    hpMul: 0.9, atkMul: 1.2, defMul: 0.9, expMul: 1.05, dodge: 0.18, huntBonus: 1,
    expName: 'Âm Khí', cur: 'tiền âm phủ', curIcon: '🪙',
    verbs: ['hú lên rồi vồ lấy', 'ám vào', 'phả âm phong vào', 'xé toạc', 'bóp cổ'],
    kiepName: 'Tâm Ma Kiếp',
    kiepFlavor: ['Âm phong nổi lên, vạn quỷ gào thét quanh ngươi...', 'Tâm ma trỗi dậy, hiện ra mọi oán hận kiếp trước...', 'Địa phủ rung chuyển, xích sắt từ cõi âm quấn lấy hồn phách ngươi...'],
    luyen: [
      'Ngươi lơ lửng trong nghĩa địa, hút lấy âm khí từ những nấm mồ.',
      'Đêm trăng non, ngươi nuốt oán khí của những oan hồn lang thang.',
      'Ngươi ẩn mình trong gốc đa cổ thụ, hồn phách ngưng tụ thêm vài phần.',
      'Gió lạnh thổi qua, ngươi hòa vào bóng đêm, ma lực tăng lên.',
      'Ngươi bám theo đám tang, hấp thụ tử khí bay lên.',
    ],
    sectLabel: 'Ma giáo', sectIcon: '💀', craftLabel: '🔮 Oán châu & ma đan', craftVerb: 'Luyện oán khí',
    mats: ['hon_phach', 'hon_phach', 'oan_khi', 'am_moc'],
    starter: 'oan_chau', bonus7: 'cuu_u_ma_dan', startWeapon: 'mong_vuot_quy',
    rareGear: ['huyet_ma_phien', 'cuu_u_ma_y'], rareOther: ['huyet_oan', 'huyet_oan_dan', 'cuu_u_ma_dan'],
  },
  thi: {
    id: 'thi', name: 'Cương Thi', short: 'Cương Thi', emoji: '🧟', color: 0x27ae60,
    desc: 'Xác chết nhảy đêm, đồng bì thiết cốt. **Máu trâu, giáp dày** (HP +40%, thủ +30%) nhưng tu luyện chậm. Ban đêm hấp thụ nguyệt quang nhanh hơn, ban ngày suy yếu.',
    hpMul: 1.4, atkMul: 1, defMul: 1.3, expMul: 0.9, dodge: 0.02, huntBonus: 1,
    expName: 'Thi Khí', cur: 'đồng tiền cổ', curIcon: '🏺',
    verbs: ['nhảy tới vồ', 'cào xé', 'húc vào', 'cắn vào', 'đập mạnh vào'],
    kiepName: 'Lôi Hỏa Luyện Thi Kiếp',
    kiepFlavor: ['Trăng máu lên cao, sấm sét giáng thẳng xuống thi thân...', 'Quan tài nứt toác, thiên lôi đánh xuống từng đợt...', 'Lửa trời thiêu đốt lớp thi bì, ngươi nghiến răng chịu đựng...'],
    luyen: [
      'Ngươi nằm trong quan tài cổ, hút nguyệt quang suốt đêm.',
      'Ngươi nhảy qua nghĩa địa dưới trăng tròn, thi khí cuồn cuộn.',
      'Ngươi đứng bất động giữa rừng, nuốt lấy tử khí của đất.',
      'Ngươi vùi mình trong đất mộ, thi thân càng thêm cứng rắn.',
      'Trăng lên đỉnh đầu, móng tay ngươi dài ra và đen kịt.',
    ],
    sectLabel: 'Thi quật', sectIcon: '⚰️', craftLabel: '🧪 Thi đan', craftVerb: 'Luyện thi đan',
    mats: ['tinh_huyet', 'tinh_huyet', 'xuong_co', 'nguyet_thach', 'tu_khi_thao'],
    starter: 'thi_dan', bonus7: 'thien_nien_thi_dan', startWeapon: 'mong_tay_thi_doc',
    rareGear: ['han_bat_trao', 'kim_cuong_thi_giap'], rareOther: ['bat_hoa_cot', 'bat_hoa_dan', 'thien_nien_thi_dan'],
  },
};

// Mệnh cách (ngũ hành + thể chất đặc biệt): ngẫu nhiên khi vào phái
const ROOTS = [
  { id: 'kim', name: 'Kim Mệnh', emoji: '🪙', weight: 20, expMul: 1.0, atkMul: 1.12, hpMul: 1, defMul: 1 },
  { id: 'moc', name: 'Mộc Mệnh', emoji: '🌿', weight: 20, expMul: 1.05, atkMul: 1, hpMul: 1.15, defMul: 1 },
  { id: 'thuy', name: 'Thủy Mệnh', emoji: '💧', weight: 20, expMul: 1.12, atkMul: 1, hpMul: 1, defMul: 1 },
  { id: 'hoa', name: 'Hỏa Mệnh', emoji: '🔥', weight: 20, expMul: 1.0, atkMul: 1.15, hpMul: 1, defMul: 1 },
  { id: 'tho', name: 'Thổ Mệnh', emoji: '⛰️', weight: 20, expMul: 1.0, atkMul: 1, hpMul: 1.05, defMul: 1.2 },
  { id: 'am', name: 'Cửu Âm Chi Thể', emoji: '🌑', weight: 6, expMul: 1.3, atkMul: 1.2, hpMul: 1.05, defMul: 1 },
  { id: 'thien', name: 'Thiên Mệnh Chi Tử', emoji: '🌈', weight: 1, expMul: 1.6, atkMul: 1.25, hpMul: 1.2, defMul: 1.2 },
];

// ---------- Vật phẩm ----------
const mat = (name, emoji, faction, price, sell, desc) => ({ name, emoji, type: 'mat', faction, price, sell, desc });
const use = (name, emoji, faction, price, sell, desc, effect) => ({ name, emoji, type: 'use', faction, price, sell, desc, effect });
const weapon = (name, emoji, faction, atk, price, sell, desc) => ({ name, emoji, type: 'weapon', faction, atk, price, sell, desc });
const armor = (name, emoji, faction, def, hp, price, sell, desc) => ({ name, emoji, type: 'armor', faction, def, hp, price, sell, desc });

const ITEMS = {
  // ===== Đạo sĩ: nguyên liệu =====
  giay_vang: mat('Giấy Bùa Vàng', '📜', 'dao', 60, 25, 'Giấy vàng dùng để vẽ bùa.'),
  chu_sa: mat('Chu Sa', '🟥', 'dao', 140, 60, 'Bột son đỏ giúp bùa linh nghiệm.'),
  mau_cho_den: mat('Máu Chó Đen', '🩸', 'dao', 260, 110, 'Khắc tinh của tà ma.'),
  gao_nep: mat('Gạo Nếp', '🍚', 'dao', 90, 40, 'Rải lên cương thi sẽ khiến nó bỏng rát.'),
  go_dao: mat('Gỗ Đào Ngàn Năm', '🌳', 'dao', null, 900, 'Gỗ quý luyện pháp bảo. (Chỉ tìm được ở nghĩa địa)'),
  // ===== Đạo sĩ: bùa chú =====
  boa_tu_dao: use('Bùa Tụ Đạo', '📜', 'dao', 250, 100, 'Tăng một lượng nhỏ đạo hạnh.', { type: 'exp', amount: 120 }),
  boa_thanh_tam: use('Bùa Thanh Tâm', '🔔', 'dao', 400, 150, 'Xóa thời gian chờ của /luyencong.', { type: 'resetcd' }),
  boa_tru_ta: use('Bùa Trừ Tà', '🧿', 'dao', 600, 250, '+40% sát thương trong trận đánh kế tiếp.', { type: 'combat', amount: 40 }),
  boa_ho_menh: use('Bùa Hộ Mệnh', '🛡️', 'dao', 1500, 600, '+15% tỉ lệ độ kiếp thành công (lần kế tiếp).', { type: 'kiep', amount: 15 }),
  thanh_tam_hoan: use('Thanh Tâm Hoàn', '🔮', 'dao', 1200, 500, 'Tăng lượng lớn đạo hạnh.', { type: 'exp', amount: 500 }),

  // ===== Ma: nguyên liệu =====
  hon_phach: mat('Hồn Phách Lang Thang', '👻', 'ma', 60, 25, 'Mảnh hồn tàn của kẻ chết oan.'),
  oan_khi: mat('Oán Khí Châu', '🔮', 'ma', 140, 60, 'Châu ngưng tụ oán khí.'),
  am_moc: mat('Âm Mộc', '🪵', 'ma', 260, 110, 'Gỗ mọc nơi âm địa.'),
  huyet_oan: mat('Tâm Huyết Oán Quỷ', '🩸', 'ma', null, 900, 'Giọt máu đen của oán quỷ. (Chỉ có từ chiến lợi phẩm / nghĩa địa)'),
  // ===== Ma: đan =====
  oan_chau: use('Oán Châu', '🔮', 'ma', 250, 100, 'Tăng một lượng nhỏ âm khí.', { type: 'exp', amount: 120 }),
  hon_dan: use('Hồn Đan', '💠', 'ma', 400, 150, 'Xóa thời gian chờ của /luyencong.', { type: 'resetcd' }),
  ma_khi_chu: use('Ma Khí Chú', '🌀', 'ma', 600, 250, '+40% sát thương trong trận đánh kế tiếp.', { type: 'combat', amount: 40 }),
  huyet_oan_dan: use('Huyết Oán Đan', '🩸', 'ma', 1500, 600, '+15% tỉ lệ độ kiếp thành công (lần kế tiếp).', { type: 'kiep', amount: 15 }),
  cuu_u_ma_dan: use('Cửu U Ma Đan', '😈', 'ma', 1200, 500, 'Tăng lượng lớn âm khí.', { type: 'exp', amount: 500 }),

  // ===== Cương thi: nguyên liệu =====
  tinh_huyet: mat('Tinh Huyết', '🩸', 'thi', 60, 25, 'Máu tươi giàu dương khí.'),
  xuong_co: mat('Xương Cổ', '🦴', 'thi', 140, 60, 'Xương từ ngôi mộ ngàn năm.'),
  nguyet_thach: mat('Nguyệt Quang Thạch', '🌕', 'thi', 260, 110, 'Đá hút ánh trăng.'),
  tu_khi_thao: mat('Tử Khí Thảo', '🥀', 'thi', 90, 40, 'Cỏ mọc trên đất mộ.'),
  bat_hoa_cot: mat('Bất Hóa Cốt', '💀', 'thi', null, 900, 'Cốt không thể mục. (Chỉ có từ chiến lợi phẩm / nghĩa địa)'),
  // ===== Cương thi: thi đan =====
  thi_dan: use('Thi Đan', '🟤', 'thi', 250, 100, 'Tăng một lượng nhỏ thi khí.', { type: 'exp', amount: 120 }),
  nguyet_hoa_dan: use('Nguyệt Hoa Đan', '🌙', 'thi', 400, 150, 'Xóa thời gian chờ của /luyencong.', { type: 'resetcd' }),
  thi_doc_tan: use('Thi Độc Tán', '☠️', 'thi', 600, 250, '+40% sát thương trong trận đánh kế tiếp.', { type: 'combat', amount: 40 }),
  bat_hoa_dan: use('Bất Hóa Thi Đan', '🛡️', 'thi', 1500, 600, '+15% tỉ lệ độ kiếp thành công (lần kế tiếp).', { type: 'kiep', amount: 15 }),
  thien_nien_thi_dan: use('Thiên Niên Thi Đan', '🔶', 'thi', 1200, 500, 'Tăng lượng lớn thi khí.', { type: 'exp', amount: 500 }),

  // ===== Pháp bảo Đạo sĩ =====
  kiem_go_dao: weapon('Kiếm Gỗ Đào', '🗡️', 'dao', 8, 300, 120, 'Kiếm gỗ đào trừ tà, vũ khí nhập môn.'),
  kiem_dong_tien: weapon('Kiếm Đồng Tiền', '⚔️', 'dao', 30, 2000, 800, 'Kiếm xâu bằng tiền đồng cổ.'),
  that_tinh_kiem: weapon('Thất Tinh Bảo Kiếm', '🌠', 'dao', 65, 8000, 3200, 'Bảo kiếm khắc bảy vì sao.'),
  tram_yeu_kiem: weapon('Trảm Yêu Thần Kiếm', '🌩️', 'dao', 160, 50000, 20000, 'Thần kiếm khiến yêu ma khiếp vía.'),
  loi_kich_kiem: weapon('Lôi Kích Đào Mộc Kiếm', '⚡', 'dao', 95, null, 9000, 'Gỗ đào bị sét đánh ngàn năm. (Chỉ tìm được ở nghĩa địa)'),
  dao_bao_tho: armor('Đạo Bào Vải Thô', '👘', 'dao', 6, 40, 300, 120, 'Áo đạo sĩ bằng vải thô.'),
  dao_bao_bat_quai: armor('Đạo Bào Bát Quái', '🥋', 'dao', 20, 150, 2500, 1000, 'Đạo bào thêu đồ Bát Quái.'),
  hoang_bao_thien_su: armor('Hoàng Bào Thiên Sư', '🧥', 'dao', 55, 500, 12000, 5000, 'Áo bào vàng của bậc Thiên Sư.'),
  cuu_thien_bao: armor('Cửu Thiên Huyền Bào', '🛡️', 'dao', 95, 900, null, 15000, 'Bào phục truyền từ cửu thiên. (Chỉ tìm được ở nghĩa địa)'),

  // ===== Pháp bảo Ma =====
  mong_vuot_quy: weapon('Móng Vuốt Quỷ', '🦴', 'ma', 8, 300, 120, 'Móng vuốt sắc lạnh của quỷ.'),
  oan_hon_phien: weapon('Oán Hồn Phiên', '🚩', 'ma', 30, 2000, 800, 'Phướn nhốt oán hồn.'),
  cau_hon_toa: weapon('Cửu U Câu Hồn Tỏa', '⛓️', 'ma', 65, 8000, 3200, 'Xích câu hồn từ cõi U Minh.'),
  diet_the_ma_dao: weapon('Diệt Thế Ma Đao', '🗡️', 'ma', 160, 50000, 20000, 'Ma đao thấm máu vạn người.'),
  huyet_ma_phien: weapon('Huyết Ma Phiên', '🩸', 'ma', 95, null, 9000, 'Phướn nhuộm máu ma vương. (Chỉ tìm được ở nghĩa địa)'),
  ao_choang_den: armor('Áo Choàng Đen', '🧥', 'ma', 6, 40, 300, 120, 'Áo choàng đen như màn đêm.'),
  quy_y_u_minh: armor('Quỷ Y U Minh', '🥼', 'ma', 20, 150, 2500, 1000, 'Y phục dệt từ sương âm.'),
  ma_giap_dia_nguc: armor('Ma Giáp Địa Ngục', '😈', 'ma', 55, 500, 12000, 5000, 'Giáp rèn trong lửa địa ngục.'),
  cuu_u_ma_y: armor('Cửu U Ma Y', '🛡️', 'ma', 95, 900, null, 15000, 'Ma y của Ma Đế cổ đại. (Chỉ tìm được ở nghĩa địa)'),

  // ===== Pháp bảo Cương thi =====
  mong_tay_thi_doc: weapon('Móng Tay Thi Độc', '🧟', 'thi', 8, 300, 120, 'Móng tay đen tẩm thi độc.'),
  xich_quan_tai: weapon('Xích Sắt Quan Tài', '⛓️', 'thi', 30, 2000, 800, 'Xích sắt quấn quanh quan tài cổ.'),
  thi_trao_dong: weapon('Cương Thi Trảo Đồng', '🦾', 'thi', 65, 8000, 3200, 'Vuốt đồng cứng như thép.'),
  hong_vuong_trao: weapon('Hống Vương Trảo', '🐲', 'thi', 160, 50000, 20000, 'Vuốt của Hống, Thi Tổ.'),
  han_bat_trao: weapon('Hạn Bạt Trảo', '🔥', 'thi', 95, null, 9000, 'Vuốt của Hạn Bạt. (Chỉ tìm được ở nghĩa địa)'),
  ao_liem_cu: armor('Áo Liệm Cũ', '👘', 'thi', 6, 40, 300, 120, 'Áo liệm rách của người đã khuất.'),
  giap_dong_co: armor('Giáp Đồng Cổ', '🥋', 'thi', 20, 150, 2500, 1000, 'Giáp đồng đào từ mộ cổ.'),
  thi_giap_hac_thiet: armor('Thi Giáp Hắc Thiết', '⚫', 'thi', 55, 500, 12000, 5000, 'Giáp hắc thiết bất hoại.'),
  kim_cuong_thi_giap: armor('Kim Cương Thi Giáp', '🛡️', 'thi', 95, 900, null, 15000, 'Thi giáp đao thương bất nhập. (Chỉ tìm được ở nghĩa địa)'),
};

// ---------- Công thức chế tạo (theo phái) ----------
const RECIPES = {
  dao: {
    boa_tu_dao: { need: { giay_vang: 2, chu_sa: 1 }, chance: 75 },
    boa_thanh_tam: { need: { giay_vang: 1, chu_sa: 1 }, chance: 70 },
    boa_tru_ta: { need: { giay_vang: 1, chu_sa: 1, mau_cho_den: 1 }, chance: 65 },
    thanh_tam_hoan: { need: { gao_nep: 2, chu_sa: 2, mau_cho_den: 1 }, chance: 60 },
    boa_ho_menh: { need: { giay_vang: 2, mau_cho_den: 1, go_dao: 1 }, chance: 50 },
  },
  ma: {
    oan_chau: { need: { hon_phach: 2, oan_khi: 1 }, chance: 75 },
    hon_dan: { need: { hon_phach: 1, am_moc: 1 }, chance: 70 },
    ma_khi_chu: { need: { oan_khi: 1, hon_phach: 1, am_moc: 1 }, chance: 65 },
    cuu_u_ma_dan: { need: { hon_phach: 2, oan_khi: 2, huyet_oan: 1 }, chance: 60 },
    huyet_oan_dan: { need: { oan_khi: 2, am_moc: 1, huyet_oan: 1 }, chance: 50 },
  },
  thi: {
    thi_dan: { need: { tinh_huyet: 2, xuong_co: 1 }, chance: 75 },
    nguyet_hoa_dan: { need: { nguyet_thach: 1, tinh_huyet: 1 }, chance: 70 },
    thi_doc_tan: { need: { tinh_huyet: 1, xuong_co: 1, tu_khi_thao: 1 }, chance: 65 },
    thien_nien_thi_dan: { need: { tinh_huyet: 2, xuong_co: 2, nguyet_thach: 1 }, chance: 60 },
    bat_hoa_dan: { need: { nguyet_thach: 2, tu_khi_thao: 1, bat_hoa_cot: 1 }, chance: 50 },
  },
};

// ---------- Mục tiêu hành đạo (theo phái) ----------
// power = hệ số so với chỉ số nền của người chơi cùng cảnh giới
const HUNTS = {
  dao: [
    { name: 'Cô Hồn Dã Quỷ', emoji: '👻', minRealm: 0, power: 0.55, money: [20, 50], drops: [{ id: 'giay_vang', chance: 0.4 }] },
    { name: 'Tử Thi Mới Trỗi Dậy', emoji: '🧟', minRealm: 0, power: 0.7, money: [30, 70], drops: [{ id: 'giay_vang', chance: 0.3 }, { id: 'gao_nep', chance: 0.25 }] },
    { name: 'Quỷ Nhập Tràng', emoji: '👺', minRealm: 1, power: 0.85, money: [40, 90], drops: [{ id: 'chu_sa', chance: 0.3 }] },
    { name: 'Hồ Ly Tinh', emoji: '🦊', minRealm: 2, power: 1.0, money: [60, 120], drops: [{ id: 'chu_sa', chance: 0.3 }, { id: 'mau_cho_den', chance: 0.12 }] },
    { name: 'Bạch Mao Cương Thi', emoji: '🧟‍♂️', minRealm: 3, power: 1.15, money: [80, 150], drops: [{ id: 'mau_cho_den', chance: 0.25 }, { id: 'boa_tu_dao', chance: 0.1 }] },
    { name: 'Lệ Quỷ Áo Đỏ', emoji: '👘', minRealm: 5, power: 1.3, money: [120, 220], drops: [{ id: 'mau_cho_den', chance: 0.3 }, { id: 'thanh_tam_hoan', chance: 0.06 }] },
    { name: 'Quỷ Vương', emoji: '😈', minRealm: 7, power: 1.6, money: [200, 350], drops: [{ id: 'go_dao', chance: 0.12 }, { id: 'thanh_tam_hoan', chance: 0.1 }] },
    { name: 'Hạn Bạt', emoji: '🔥', minRealm: 9, power: 2.0, money: [350, 600], drops: [{ id: 'go_dao', chance: 0.2 }, { id: 'boa_ho_menh', chance: 0.1 }] },
  ],
  ma: [
    { name: 'Lữ Khách Lạc Đường', emoji: '🚶', minRealm: 0, power: 0.55, money: [20, 50], drops: [{ id: 'hon_phach', chance: 0.4 }] },
    { name: 'Kẻ Trộm Mộ', emoji: '⛏️', minRealm: 0, power: 0.7, money: [30, 70], drops: [{ id: 'hon_phach', chance: 0.3 }, { id: 'am_moc', chance: 0.25 }] },
    { name: 'Thầy Bói Dỏm', emoji: '🔮', minRealm: 1, power: 0.85, money: [40, 90], drops: [{ id: 'oan_khi', chance: 0.3 }] },
    { name: 'Đạo Đồng Tập Sự', emoji: '👦', minRealm: 2, power: 1.0, money: [60, 120], drops: [{ id: 'oan_khi', chance: 0.3 }, { id: 'huyet_oan', chance: 0.08 }] },
    { name: 'Thầy Cúng Làng', emoji: '🧙', minRealm: 3, power: 1.15, money: [80, 150], drops: [{ id: 'am_moc', chance: 0.3 }, { id: 'oan_chau', chance: 0.1 }] },
    { name: 'Đạo Sĩ Trừ Tà', emoji: '⚔️', minRealm: 5, power: 1.3, money: [120, 220], drops: [{ id: 'huyet_oan', chance: 0.15 }, { id: 'cuu_u_ma_dan', chance: 0.06 }] },
    { name: 'Pháp Sư Mao Sơn', emoji: '🎋', minRealm: 7, power: 1.6, money: [200, 350], drops: [{ id: 'huyet_oan', chance: 0.2 }, { id: 'cuu_u_ma_dan', chance: 0.1 }] },
    { name: 'Thiên Sư', emoji: '🌟', minRealm: 9, power: 2.0, money: [350, 600], drops: [{ id: 'huyet_oan', chance: 0.3 }, { id: 'huyet_oan_dan', chance: 0.1 }] },
  ],
  thi: [
    { name: 'Dân Làng Đêm Khuya', emoji: '🏮', minRealm: 0, power: 0.55, money: [20, 50], drops: [{ id: 'tinh_huyet', chance: 0.4 }] },
    { name: 'Thợ Săn Gan Dạ', emoji: '🏹', minRealm: 0, power: 0.7, money: [30, 70], drops: [{ id: 'tinh_huyet', chance: 0.3 }, { id: 'xuong_co', chance: 0.25 }] },
    { name: 'Lính Canh Làng', emoji: '💂', minRealm: 1, power: 0.85, money: [40, 90], drops: [{ id: 'xuong_co', chance: 0.3 }] },
    { name: 'Võ Sư Quyền Cước', emoji: '🥋', minRealm: 2, power: 1.0, money: [60, 120], drops: [{ id: 'nguyet_thach', chance: 0.25 }, { id: 'tu_khi_thao', chance: 0.2 }] },
    { name: 'Thầy Cúng Làng', emoji: '🧙', minRealm: 3, power: 1.15, money: [80, 150], drops: [{ id: 'tu_khi_thao', chance: 0.3 }, { id: 'thi_dan', chance: 0.1 }] },
    { name: 'Đạo Sĩ Trừ Tà', emoji: '⚔️', minRealm: 5, power: 1.3, money: [120, 220], drops: [{ id: 'bat_hoa_cot', chance: 0.12 }, { id: 'thien_nien_thi_dan', chance: 0.06 }] },
    { name: 'Pháp Sư Mao Sơn', emoji: '🎋', minRealm: 7, power: 1.6, money: [200, 350], drops: [{ id: 'bat_hoa_cot', chance: 0.2 }, { id: 'thien_nien_thi_dan', chance: 0.1 }] },
    { name: 'Thiên Sư', emoji: '🌟', minRealm: 9, power: 2.0, money: [350, 600], drops: [{ id: 'bat_hoa_cot', chance: 0.3 }, { id: 'bat_hoa_dan', chance: 0.1 }] },
  ],
};

const QUE = [
  { ten: 'Càn ☰ (Trời)', y: 'Dương khí vượng, hành sự chính trực sẽ thành. Chớ kiêu ngạo kẻo họa đến.' },
  { ten: 'Khôn ☷ (Đất)', y: 'Nhu thuận, nhẫn nại, đức dày chở vật. Hợp tích lũy, không hợp tranh đấu.' },
  { ten: 'Chấn ☳ (Sấm)', y: 'Biến động bất ngờ, tuy giật mình nhưng là cơ hội đổi mới. Giữ bình tĩnh.' },
  { ten: 'Tốn ☴ (Gió)', y: 'Việc tiến triển từ từ, thuận theo hoàn cảnh. Nên nghe lời người từng trải.' },
  { ten: 'Khảm ☵ (Nước)', y: 'Hiểm trở trùng trùng, nhưng giữ vững lòng tin sẽ vượt qua. Cẩn thận tiền bạc.' },
  { ten: 'Ly ☲ (Lửa)', y: 'Sáng suốt, danh tiếng nổi lên. Cẩn thận nóng nảy làm hỏng việc.' },
  { ten: 'Cấn ☶ (Núi)', y: 'Nên dừng lại suy xét, tĩnh tâm. Chưa phải lúc hành động lớn.' },
  { ten: 'Đoài ☱ (Hồ)', y: 'Vui vẻ, giao tiếp thuận lợi, có tin mừng. Tránh lời nói đãi bôi.' },
];

const DAO_NGON = [
  'Đạo cao một thước, ma cao một trượng.',
  'Tâm chính thì bùa linh, tâm tà thì phép hỏng.',
  'Chính khí tồn nội, tà không thể xâm.',
  'Gạo nếp, máu chó đen, kiếm gỗ đào — ba thứ cứu mạng đêm khuya.',
  'Đã vào nghĩa địa thì đừng hỏi giờ, chỉ cần biết khi nào trời sáng.',
  'Cương thi sợ nhất là hơi thở người sống... nên đừng thở mạnh.',
  'Thuận theo tự nhiên, đừng cưỡng cầu.',
  'Biết người là trí, biết mình mới là sáng.',
  'Họa là chỗ phúc nương tựa, phúc là chỗ họa ẩn nấp.',
  'Một lá bùa vẽ sai, mất mạng như chơi.',
  'Người sống sợ ma, ma lại sợ người có chính khí.',
  'Nước mềm yếu nhất mà thắng được cái cứng rắn nhất.',
];

module.exports = {
  STAGES, REALMS, FACTIONS, ROOTS, ITEMS, RECIPES, HUNTS, QUE, DAO_NGON,
};
