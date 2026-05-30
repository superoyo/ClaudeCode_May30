# ระบบลงทะเบียนเบอร์โทร + หลังบ้าน

ระบบเก็บเบอร์โทรผู้ลงทะเบียน พร้อมหน้าหลังบ้านมี login สำหรับดูรายชื่อ

## Stack
- Node.js + Express
- **PostgreSQL** (ผ่าน `pg`)
- express-session

## Deploy บน Railway

1. สร้าง project บน Railway → connect repo นี้
2. ในโปรเจกต์เดียวกัน กด **+ New → Database → Add PostgreSQL**
3. Railway จะ inject `DATABASE_URL` ให้อัตโนมัติ (ดูได้ใน Variables)
4. กรอก env vars เพิ่ม:
   - `ADMIN_USER` = ชื่อผู้ใช้ admin
   - `ADMIN_PASS` = รหัสผ่าน admin
   - `SESSION_SECRET` = สตริงสุ่มยาว ๆ
   - `NODE_ENV` = `production`
5. Deploy — Railway auto-detect Node จาก `package.json` และรัน `npm start`

ตาราง `registrations` จะถูกสร้างอัตโนมัติเมื่อ server start ครั้งแรก

## Local dev

ต้องมี Postgres รัน — ใช้ Docker:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:16
export DATABASE_URL=postgres://postgres:pass@localhost:5432/postgres
npm install
npm start
```

หรือใช้ public URL ของ Railway Postgres ก็ได้

## URLs
- `/` — หน้าลงทะเบียน
- `/login.html` — เข้าระบบหลังบ้าน
- `/admin.html` — หลังบ้าน (ต้อง login)

## Default admin
- user: `admin`
- pass: `admin1234`

**เปลี่ยนก่อน deploy จริง** ผ่าน env vars

## API
- `POST /api/register` — `{ phone }` ลงทะเบียน
- `POST /api/login` — `{ username, password }`
- `POST /api/logout`
- `GET /api/registrations` — (auth) ดูรายชื่อ
- `DELETE /api/registrations/:id` — (auth) ลบ
