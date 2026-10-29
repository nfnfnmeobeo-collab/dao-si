# ☯️ Đạo Sĩ Bot v3.2

## Chạy bot (5 bước)
1. Cài **Node.js 18 trở lên** (kiểm tra: `node -v`).
2. Mở thư mục này trong terminal, chạy: `npm install`
3. Đổi tên file `.env.example` thành `.env` rồi điền token:
   ```
   DISCORD_TOKEN=token_bot_cua_ban
   GUILD_ID=id_server_cua_ban   (không bắt buộc, có thì lệnh hiện ngay)
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
| `Thiếu DISCORD_TOKEN` | Tạo file `.env` (không phải `.env.example`), dán token, không có dấu cách/ngoặc kép thừa |
| `Token bot sai hoặc đã bị reset` | Developer Portal → Bot → **Reset Token**, dán token mới |
| `Node.js quá cũ` | Cài Node 18+ (khuyên dùng 20 hoặc 22) |
| Bot online nhưng gõ `/` không thấy lệnh | Điền `GUILD_ID` vào `.env` rồi chạy lại; kiểm tra bot được mời với quyền `applications.commands`. Lệnh toàn cầu mất tới ~1 giờ mới hiện |
| Lệnh có nhưng báo "ứng dụng không phản hồi" | Xem log terminal có dòng lỗi đỏ không và gửi cho người hỗ trợ |

Dữ liệu người chơi lưu ở `data.json` (tự tạo). Nhớ sao lưu file này.
