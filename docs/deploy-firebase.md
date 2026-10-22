# Deploy plan: Firebase / Google Cloud

แผนเอา KU Grad Kiosk ขึ้น production บน Firebase (Blaze plan) + Google Cloud
สถานะ: **แผน ยังไม่ได้ลงมือ** — มีโค้ดที่ต้องแก้ก่อน deploy (หัวข้อ 4)

---

## 1. ภาพรวม

```
 ตู้ kiosk (Chrome kiosk mode)                      มือถือคนสแกน QR
 ├─ โหลดหน้าเว็บ + MediaPipe ──────┐                       │
 ├─ WebRTC stream กล้อง ⇄ Decart   │                       │
 │   (ใส่ชุด realtime, ตรงไม่ผ่านเรา) │                       │
 └─ /api/* ───────────────┐        ▼                       ▼
                          │   Firebase Hosting (CDN)  ◄────┘  /p/{id}, /photos/{id}.jpg
                          │    ├─ kiosk/dist, /assets  (static)
                          └──► └─ rewrite /api /photos /p ──► Cloud Run: FastAPI (asia-southeast1)
                                                              ├─ Secret Manager: DECART_API_KEY
                                                              ├─ Cloud Storage: รูป (ลบเองหลัง 7 วัน)
                                                              └─ Firestore: consent, นับรูปต่อวัน
```

งานหนัก (stream ใส่ชุด, ตัดคนออกจากฉาก, ประกอบรูป) ทำ **บนเครื่องตู้** ทั้งหมด
backend เบามาก: ออก token ให้ Decart, ใส่กรอบรูป, เก็บรูป, ทำ QR → spec server ต่ำ แต่ **spec เครื่องตู้สำคัญ**

## 2. Service ที่ใช้

| Service | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| **Firebase Hosting** | เสิร์ฟหน้า kiosk (`kiosk/dist` ~43MB รวม MediaPipe), `/assets` (ฉาก, รูปชุด, tiles ~6MB) ผ่าน CDN และ rewrite `/api/**`, `/photos/**`, `/p/**` ไป Cloud Run | ผูก custom domain + SSL ฟรี (domain นี้คือที่ QR ชี้ไป) timeout ของ rewrite = 60 วิ (เราใช้ไม่ถึง) |
| **Cloud Run** | FastAPI backend (container) | request-based billing จ่ายเฉพาะตอนมี request |
| **Artifact Registry** | เก็บ container image ของ backend | สร้างอัตโนมัติตอน `gcloud run deploy --source` |
| **Secret Manager** | `DECART_API_KEY` | mount เป็น env ให้ Cloud Run ห้ามใส่ใน image / git |
| **Cloud Storage** (bucket ของ Firebase Storage) | รูปที่ถ่าย `photos/<id>.jpg` | private, lifecycle rule **ลบเมื่ออายุ 7 วัน** (PDPA) |
| **Firestore** | `consents/{session}`, `photos/{id}` (เวลาสร้าง) ไว้นับ MAX_PER_DAY | ตั้ง TTL policy ลบ doc รูปหลัง 7 วันคู่กับ bucket |
| **Firebase Authentication** | login ตู้ (1 account ต่อตู้) ให้เฉพาะตู้เรียก `/api/realtime-token` และ `/api/generate` ได้ | กันคนนอกยิง API ให้เราเสียเงิน Decart (หัวข้อ 4.3) |
| **Cloud Logging / Monitoring** | log, alert เมื่อ 5xx หรือ latency สูง | มีให้อยู่แล้ว |
| **Cloud Billing budget alert** | เตือนเมื่อค่าใช้จ่ายเกินงบ | ตั้งทั้งฝั่ง GCP และดู usage ฝั่ง Decart |

Region: **asia-southeast1 (Singapore)** ทุกตัว — ใกล้ไทย รองรับ Hosting rewrite และ Firestore ครบ
(region Bangkok `asia-southeast3` มีข้อจำกัดบางฟีเจอร์ของ Cloud Run เช่น domain mapping จึงยังไม่แนะนำ)

ไม่ใช้: Cloud Functions (FastAPI อยู่บน Cloud Run ตรงๆ ได้เลย), Firebase App Hosting (ไม่รองรับ Python), Cloud SQL / Redis (ข้อมูลน้อย Firestore พอ)

## 3. Spec

### 3.1 Cloud Run (backend)

| ค่า | แนะนำ | เหตุผล |
|---|---|---|
| CPU | **1 vCPU** | งานต่อ request คือเปิด JPEG 1080×1920 ใส่กรอบ เซฟ (~0.2–0.5 วิ) |
| Memory | **1 GiB** | Pillow ใช้ ~30–50MB ต่อรูป × concurrency |
| Concurrency | **20** | |
| Min instances | **1 ระหว่างวันงาน**, 0 นอกวันงาน | กัน cold start ตอนกดถ่าย (Python + Pillow start ~2–4 วิ) |
| Max instances | **5** | 3,000 รูป/วัน ≈ ไม่ถึง 1 รูป/วินาทีตอน peak 1 instance ก็รับไหว ที่เหลือเผื่อ |
| Timeout | 30 วิ | |
| Region | asia-southeast1 | |

### 3.2 Storage / Firestore

- รูป ~0.4–0.6MB/รูป × สูงสุด 3,000/วัน × 7 วัน ≈ **สูงสุด ~12GB** ในเวลาใดเวลาหนึ่ง
- Firestore: ~2 writes ต่อคน (consent + photo) → 3,000 คน ≈ 6,000 writes/วัน

### 3.3 เครื่องตู้ (ฝั่ง client — สำคัญที่สุด)

ตู้ต้องรับ WebRTC 720p จาก Decart + ตัดพื้นหลังด้วย GPU ทุกเฟรม พร้อมกัน

| อุปกรณ์ | ขั้นต่ำที่แนะนำ |
|---|---|
| เครื่อง | Mini PC Intel Core i5 Gen 12+ (Iris Xe) / AMD Ryzen 5 7000+ (Radeon 680M+) หรือ Mac mini M1+ |
| RAM / Disk | 16GB / SSD 256GB |
| Browser | Chrome stable, kiosk mode, เปิด hardware acceleration (WebGL ต้องใช้ได้) |
| จอ | แนวตั้ง 1080×1920 touch (UI ออกแบบ 9:16) |
| กล้อง | USB webcam ที่ให้ 1280×720 @30fps ได้ (เช่น Logitech C920/C922/Brio) **ติดตั้งแนวตั้งตรง** (โค้ดยังไม่รองรับกล้องหมุน) |
| เน็ต | **สาย LAN**, ≥10 Mbps ขึ้น/ลง ต่อตู้, เสถียร; firewall ต้องปล่อย **WebRTC (UDP)** ไป Decart — เน็ตสถานที่จัดงานมักบล็อก ต้องทดสอบหน้างานก่อน |
| แสง | ไฟหน้าคนแบบ soft ให้ตัดพื้นหลังได้คม |

## 4. โค้ดที่ต้องแก้ก่อน deploy

1. **Storage → Cloud Storage + Firestore** — ตอนนี้ [storage.py](../backend/app/services/storage.py) เขียนลง disk ซึ่ง Cloud Run ไม่เก็บไว้ (instance หายไฟล์หาย)
   - `save_photo` → upload ไป bucket + doc ใน Firestore
   - `photo_path`/`get_photo` → stream จาก bucket
   - `sweep` → ลบทิ้ง (bucket lifecycle ลบให้) เหลือแค่นับ `photos` ที่ `created_at` > 24 ชม. ด้วย Firestore `count()`
   - `consents` → Firestore
2. **Dockerfile** สำหรับ backend (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`) ใส่ `assets/` เข้า image ด้วย (ใช้ทำ `/api/gown` และกรอบรูป)
3. **กันคนนอกยิง API** — ตอนนี้ใครก็ได้ที่รู้ URL ขอ token Decart ได้ = เสียเงินเรา
   - ตู้ login Firebase Auth (account ต่อตู้ ตั้งครั้งเดียวตอนติดตั้ง) ส่ง ID token มากับ `/api/consent`, `/api/realtime-token`, `/api/generate`
   - backend ตรวจด้วย `firebase-admin`
   - เพิ่มเพดานจำนวน token ต่อวันใน backend (คล้าย MAX_PER_DAY)
4. **จำกัดเวลา stream** — stream Decart คิดเงินทุกวินาทีที่อยู่หน้ากล้อง ถ้าคนเดินหนีค้างหน้ากล้องจะรันจน idle timeout (60 วิ) ควรตัด stream เมื่อเกินเช่น 45 วิ หรือลด idle timeout เฉพาะหน้ากล้อง
5. **Config** — `PUBLIC_URL` = custom domain, เพิ่ม `STORAGE_BUCKET`; เลิกเสิร์ฟ `kiosk/dist` จาก FastAPI ใน production (Hosting ทำแทน — เก็บไว้ใช้ตอน dev ได้)
6. **Build script** — copy `backend/assets/{backgrounds,tiles}` เข้า `kiosk/dist/assets` ก่อน `firebase deploy`

## 5. ขั้นตอน deploy (หลังแก้หัวข้อ 4)

```sh
# 0) ครั้งแรก
firebase login && firebase projects:create ku-grad-kiosk-2026   # หรือใช้ project ที่มี แล้วเปิด Blaze
gcloud config set project ku-grad-kiosk-2026
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com firestore.googleapis.com storage.googleapis.com

# key: อ่านจากไฟล์ ไม่พิมพ์ลง command line (กันติด shell history)
gcloud secrets create decart-api-key --data-file=path/to/decart-key.txt

# bucket ลบรูปอัตโนมัติเมื่ออายุ 7 วัน
echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":7}}]}' > lifecycle.json
gcloud storage buckets update gs://<bucket> --lifecycle-file=lifecycle.json

# 1) backend
gcloud run deploy ku-grad-api --source backend --region asia-southeast1 \
  --cpu 1 --memory 1Gi --concurrency 20 --min-instances 1 --max-instances 5 --timeout 30 \
  --set-secrets DECART_API_KEY=decart-api-key:latest \
  --set-env-vars PUBLIC_URL=https://<domain>,STORAGE_BUCKET=<bucket>,SAVE_STEPS=false

# 2) kiosk
cd kiosk && bun run build && cd .. && firebase deploy --only hosting
```

`firebase.json`:

```json
{
  "hosting": {
    "public": "kiosk/dist",
    "rewrites": [
      { "source": "/api/**",    "run": { "serviceId": "ku-grad-api", "region": "asia-southeast1" } },
      { "source": "/photos/**", "run": { "serviceId": "ku-grad-api", "region": "asia-southeast1" } },
      { "source": "/p/**",      "run": { "serviceId": "ku-grad-api", "region": "asia-southeast1" } },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      { "source": "/static/**",    "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "/mediapipe/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000" }] },
      { "source": "/assets/**",    "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600" }] },
      { "source": "/index.html",   "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
    ]
  }
}
```

หลังวันงาน: `gcloud run services update ku-grad-api --min-instances 0` เพื่อไม่เสียค่า instance ค้าง

## 6. ค่าใช้จ่ายโดยประมาณ

| รายการ | คิดยังไง | ประมาณ |
|---|---|---|
| **Decart realtime** | $0.02/วินาที ที่อยู่หน้ากล้อง; สมมติ 30–60 วิ/คน | **$0.60–1.20 ต่อคน** → 3,000 คน ≈ **$1,800–3,600/วัน** |
| Cloud Run | 1 instance ค้าง (min=1) + request ไม่กี่พัน/วัน | หลักสิบ $/เดือนช่วงงาน, ~0 นอกงาน |
| Cloud Storage | ~12GB สูงสุด | < $1/เดือน |
| Firestore | ~6,000 writes/วัน | อยู่ใน/ใกล้ free tier |
| Hosting | ตู้โหลดหน้าเว็บครั้งเดียวแล้ว cache, คนสแกนโหลดรูป ~0.5MB | ไม่กี่ $/เดือน |

**ต้นทุนเกือบทั้งหมดคือ Decart** ฝั่ง Google หลักสิบ $ ต่อเดือน
ตัวเลข Google เป็นค่าประมาณ ให้เช็คกับหน้า pricing ปัจจุบันก่อนเสนอราคา

## 7. Checklist ก่อนวันงาน

- [ ] ทดสอบเน็ตสถานที่: WebRTC ไป Decart ผ่าน, latency, ความเร็วต่อตู้
- [ ] ตั้ง budget alert (GCP) + ดู usage / spending limit ฝั่ง Decart
- [ ] `SAVE_STEPS=false`
- [ ] ข้อความ PDPA ตรงกับระยะเก็บ 7 วัน และระบุ Decart เป็นผู้ประมวลผล
- [ ] ใส่ `backgrounds/ku.jpg` และ `frames/` ให้ครบ
- [ ] ทดสอบ QR บนมือถือผ่าน custom domain จริง
- [ ] min-instances = 1 ก่อนเปิดงาน, = 0 หลังจบ

## 8. คำถามที่ต้องตอบก่อนลงมือ

1. กี่ตู้ และวัน/เวลาจัดงาน (กำหนด min/max instances และงบ Decart)
2. Domain ที่ QR ชี้ไป (เช่น subdomain ของ ku.ac.th หรือของบริษัท)
3. Google Cloud project / billing account ของใคร (KU หรือบริษัท)
4. งบ Decart ต่อวัน — จะให้ระบบหยุดรับคนเมื่อถึงเพดานไหม
5. เก็บ consent record กี่วัน (รูปลบ 7 วัน แต่หลักฐาน consent อาจต้องเก็บนานกว่า — ถาม DPO)
