# ☯️ Đạo Sĩ Bot v4.3

## Chạy bot (5 bước)
1. Cài **Node.js 18 trở lên** (kiểm tra: `node -v`).
2. Mở thư mục này trong terminal, chạy: `npm install`
3. Đổi tên file `.env.example` thành `.env` rồi điền token:
   ```
   DISCORD_TOKEN=token_bot_cua_ban
   GUILD_ID=id_server_cua_ban   (không bắt buộc, có thì lệnh hiện ngay)
   ADMIN_IDS=id_admin_1,id_admin_2   (không bắt buộc, dùng cho lệnh /admin)
   ```
4. Chạy: `npm start`
5. Thấy dòng `☯️ Đạo Sĩ Bot v3 đã sẵn sàng` là bot đã online.

## Mời bot vào server
Developer Portal → OAuth2 → URL Generator → tick **bot** và **applications.commands**
→ quyền: *Send Messages, Embed Links, Use Slash Commands* → mở link và chọn server.
(Bot chỉ dùng intent `Guilds`, **không cần bật Privileged Intents**.)

## Bot không online? Đối chiếu thông báo lỗi
| Thông báo | Cách sửa |
|---|---|
| `Cannot find module 'discord.js'` / `'dotenv'` | Chạy `npm install` trong đúng thư mục có `package.json` |
| `Cannot convert undefined or null to object` ở `Object.values(db.players)` | Bạn đang chạy file bản cũ. Tải lại `index.js` mới nhất (bản 3.2) |
| `Thiếu DISCORD_TOKEN` | Tạo file `.env` (không phải `.env.example`), dán token, không có dấu cách/ngoặc kép thừa |
| `Token bot sai hoặc đã bị reset` | Developer Portal → Bot → **Reset Token**, dán token mới |
| `Node.js quá cũ` | Cài Node 18+ (khuyên dùng 20 hoặc 22) |
| Bot online nhưng gõ `/` không thấy lệnh | Điền `GUILD_ID` vào `.env` rồi chạy lại; kiểm tra bot được mời với quyền `applications.commands`. Lệnh toàn cầu mất tới ~1 giờ mới hiện |
| Lệnh có nhưng báo "ứng dụng không phản hồi" | Xem log terminal có dòng lỗi đỏ không và gửi cho người hỗ trợ |

Dữ liệu người chơi lưu ở `daosi-data.json` (tự tạo). Nhớ sao lưu file này.
Nếu thư mục còn `data.json` của bản cũ, bot tự nhận dữ liệu đó (chỉ khi đúng định dạng của Đạo Sĩ Bot) và lưu sang file mới.

## Chạy trên Pterodactyl / host dạng panel
- **Tải lên đủ cả `index.js` và `package.json` bản mới**, ghi đè bản cũ. Dòng `dao-si-bot@3.2.0` trong log là bản đúng (nếu thấy `3.0.0` nghĩa là server vẫn đang chạy file cũ).
- Token: tạo file `.env` ngay cạnh `index.js` với nội dung `DISCORD_TOKEN=...`, hoặc đặt biến môi trường `DISCORD_TOKEN` trong tab Startup của panel.
- Lệnh khởi động: `npm start` (hoặc `node index.js`).

## Lưu dữ liệu & sao lưu
- Dữ liệu người chơi: `daosi-data.json` (ghi nguyên tử, tự lưu sau mỗi thay đổi và mỗi phút).
- Sao lưu tự động 30 phút/lần vào thư mục `backups/` (giữ 48 bản mới nhất).
- File chính hỏng hoặc mất → bot tự khôi phục từ bản sao lưu gần nhất khi khởi động.
- Muốn **xoá sạch dữ liệu để chơi lại từ đầu**: xoá cả `daosi-data.json` và thư mục `backups/`.
- Người chơi gõ `/luudata` để xem trạng thái lưu và tải bản sao nhân vật. Admin dùng `/admin saoluu`, `/admin xuatdata`.
