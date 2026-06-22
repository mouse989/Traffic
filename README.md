# Traffic - Hệ Thống Quét QR + Định Vị GPS

Hệ thống thu thập dữ liệu hiện trường: nhân viên quét mã QR → ghi nhận GPS, thời gian, IP.
Admin giám sát qua web panel với bản đồ trực quan.

## Kiến Trúc

```
[Flutter Mobile App] ←HTTP→ [Single Binary: traffic.exe / traffic]
                                    │
                          FastAPI + React + SQLite
                          (1 file duy nhất, không cần cài đặt thêm)
```

---

## Quick Start (Development)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
python -m app.main
# Server: http://localhost:8000
# API docs: http://localhost:8000/api/docs
# Default admin: username=admin / password=admin1234
```

### 2. Frontend (Web Admin)
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 3. Mobile App
```bash
cd mobile
# Chỉnh sửa lib/core/constants.dart: apiBaseUrl = 'http://<IP-máy-dev>:8000'
flutter pub get
flutter run
```

---

## Build Single Binary (Production)

### Yêu cầu
- Python 3.10+
- Node.js 18+
- `pip install pyinstaller`

### Build
```bash
# Build cho Windows (chạy lệnh này trên Windows):
python build.py
# Output: backend/dist/traffic.exe

# Build cho Linux (chạy lệnh này trên Linux):
python build.py
# Output: backend/dist/traffic
```

---

## Deploy

### Cấu hình bắt buộc
Tạo file `.env` **cạnh** file exe:
```env
SECRET_KEY=<chuỗi ngẫu nhiên 64 ký tự>
# Sinh bằng: python -c "import secrets; print(secrets.token_hex(32))"
```

### Windows Server
```powershell
# Copy traffic.exe và .env vào C:\traffic\
# Cài NSSM (https://nssm.cc) để chạy như Windows Service:
nssm install Traffic "C:\traffic\traffic.exe"
nssm set Traffic AppDirectory "C:\traffic"
nssm start Traffic
# Mở firewall:
netsh advfirewall firewall add rule name="Traffic" dir=in action=allow protocol=TCP localport=8000
```

### Linux (Ubuntu/Debian)
```bash
# Copy traffic và .env vào /opt/traffic/
chmod +x /opt/traffic/traffic

# Tạo systemd service:
sudo tee /etc/systemd/system/traffic.service > /dev/null << 'EOF'
[Unit]
Description=Traffic QR Scanner System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/traffic
ExecStart=/opt/traffic/traffic
Restart=always
RestartSec=5
EnvironmentFile=/opt/traffic/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now traffic
sudo ufw allow 8000/tcp
```

### Sau khi khởi động
- Web Admin: `http://<IP-server>:8000`
- Đăng nhập: `admin` / `admin1234` → **Đổi ngay lập tức!**
- Database: file `traffic.db` tự tạo cạnh exe

---

## Mobile App - Cấu hình

Trước khi build APK/IPA, chỉnh `mobile/lib/core/constants.dart`:
```dart
static const String apiBaseUrl = 'http://<IP-server>:8000';
```

Build APK:
```bash
cd mobile
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| QR Scanner | Camera scan với `mobile_scanner` package |
| Anti-batch scan | 1 ký tự ngẫu nhiên phải nhập đúng trước khi gửi |
| Anti fake GPS | Android: `isMocked` flag từ OS; iOS: accuracy heuristic |
| JWT Auth | Access token 15 phút + Refresh token 7 ngày |
| RBAC | ADMIN (toàn quyền) / STAFF (chỉ scan) |
| Web Admin | Filter theo user/ngày, data table, bản đồ Leaflet |
| Offline mode | Lưu SQLite cục bộ, sync khi có mạng |
| IP tracking | Server tự trích xuất từ header, không tin client |
| Single binary | 1 file exe/binary chứa toàn bộ server + web panel |

---

## Cấu trúc Dự án

```
Traffic/
├── backend/      FastAPI + SQLite + JWT
├── frontend/     ReactJS + Vite + Leaflet map
├── mobile/       Flutter (Android + iOS)
├── build.py      Build script → single binary
└── README.md
```
