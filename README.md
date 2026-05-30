# ระบบลงทะเบียนเบอร์โทร + หลังบ้าน

ระบบเก็บเบอร์โทรผู้ลงทะเบียน พร้อมหน้าหลังบ้านมี login สำหรับดูรายชื่อ

## Stack
- Node.js + Express
- SQLite (better-sqlite3)
- express-session

## Run

```bash
npm install
npm start
```

เปิด http://localhost:3000

## URLs
- `/` — หน้าลงทะเบียน
- `/login.html` — เข้าระบบหลังบ้าน
- `/admin.html` — หลังบ้าน (ต้อง login)

## Admin credentials (default)
- user: `admin`
- pass: `admin1234`

เปลี่ยนได้ผ่าน env vars:

```bash
ADMIN_USER=xxx ADMIN_PASS=yyy SESSION_SECRET=random-long-string npm start
```

## API
- `POST /api/register` — `{ phone }` ลงทะเบียน
- `POST /api/login` — `{ username, password }`
- `POST /api/logout`
- `GET /api/registrations` — (auth) ดูรายชื่อ
- `DELETE /api/registrations/:id` — (auth) ลบ
