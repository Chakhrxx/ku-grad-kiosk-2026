# Deploy plan: Firebase / Google Cloud

แผนเอา KU Grad Kiosk ขึ้น production บน Firebase (Blaze plan) + Google Cloud
สถานะ: **workflow deploy พร้อมแล้ว ยังไม่ได้ deploy จริง** มีโค้ดที่ต้องแก้ก่อน deploy (หัวข้อ 4) และต้องตั้ง Google Cloud ครั้งแรก (หัวข้อ 9)

---

## 1. ภาพรวม

```
 ตู้ kiosk (Chrome kiosk mode, กล้อง Femto Bolt 4K)   มือถือคนสแกน QR
 ├─ โหลดหน้าเว็บ + MediaPipe ──────┐                       │
 └─ /api/* ───────────────┐        ▼                       ▼
                          │   Firebase Hosting (CDN)  ◄────┘  /p/{id}, /photos/{id}.jpg
                          │    ├─ kiosk/dist, /assets  (static)
                          └──► └─ rewrite /api /photos /p ──► Cloud Run: FastAPI (asia-southeast1)
                                                              ├─ /api/dress ⇄ Decart batch job (ใส่ชุดตอนถ่าย)
                                                              ├─ /api/matte, /api/upscale: โมเดล ONNX บน CPU
                                                              ├─ Secret Manager: DECART_API_KEY
                                                              ├─ Cloud Storage: รูป (ลบเองหลัง 7 วัน)
                                                              └─ Firestore: consent, นับรูปต่อวัน
```

ตอนกดถ่าย ตู้อัดคลิป 1 วิ ส่งไป `/api/dress` (Decart ใส่ชุดเป็น batch job) → ดึงเฟรมมาใส่หน้าจริงจากกล้อง
→ `/api/upscale` (Real-ESRGAN ขยาย ×4) → `/api/matte` (IS-Net ตัดคนออกจากห้อง) → ประกอบกับฉาก **บนตู้** → `/api/generate` เก็บรูป ทำ QR

backend **ไม่เบาแล้ว**: ตัดคนและขยายภาพบน CPU (หัวข้อ 3.1) ส่วนตู้ก็ยังต้องแรง เพราะรัน MediaPipe, อัดคลิป และประกอบรูปจากภาพ 4K
ใช้แค่ Decart **batch** ไม่มี realtime stream แล้ว (โหมด `stream` ปิดใน [solution.ts](../kiosk/src/lib/solution.ts) โค้ดยังเก็บไว้)

## 2. Service ที่ใช้

| Service | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| **Firebase Hosting** | เสิร์ฟหน้า kiosk (`kiosk/dist` ~43MB รวม MediaPipe), `/assets` (ฉาก, รูปชุด, tiles ~6MB) ผ่าน CDN และ rewrite `/api/**`, `/photos/**`, `/p/**` ไป Cloud Run | ผูก custom domain + SSL ฟรี (domain นี้คือที่ QR ชี้ไป) timeout ของ rewrite = **60 วิ** ทุก `/api` ต้องเสร็จในนี้ (หัวข้อ 3.1) |
| **Cloud Run** | FastAPI backend (container) รวมโมเดล IS-Net + Real-ESRGAN ใน image | request-based billing จ่ายตอนมี request + ค่า idle ของ min instance |
| **Artifact Registry** | เก็บ container image ของ backend | สร้างอัตโนมัติตอน `gcloud run deploy --source` |
| **Secret Manager** | `DECART_API_KEY` | mount เป็น env ให้ Cloud Run ห้ามใส่ใน image / git |
| **Cloud Storage** (bucket ของ Firebase Storage) | รูปที่ถ่าย `photos/<id>.jpg` | private, lifecycle rule **ลบเมื่ออายุ 7 วัน** (PDPA) |
| **Firestore** | `consents/{session}`, `photos/{id}` (เวลาสร้าง) ไว้นับ MAX_PER_DAY | ตั้ง TTL policy ลบ doc รูปหลัง 7 วันคู่กับ bucket |
| **Firebase Authentication** | login ตู้ (1 account ต่อตู้) ให้เฉพาะตู้เรียก `/api` ที่เสียเงินได้ (`/api/dress`, `/api/generate`, ...) | กันคนนอกยิง API ให้เราเสียเงิน Decart (หัวข้อ 4.3) |
| **Cloud Logging / Monitoring** | log, alert เมื่อ 5xx หรือ latency สูง | มีให้อยู่แล้ว |
| **Cloud Billing budget alert** | เตือนเมื่อค่าใช้จ่ายเกินงบ | ตั้งทั้งฝั่ง GCP และดู usage ฝั่ง Decart |

Region: **asia-southeast1 (Singapore)** ทุกตัว — ใกล้ไทย รองรับ Hosting rewrite และ Firestore ครบ
(region Bangkok `asia-southeast3` มีข้อจำกัดบางฟีเจอร์ของ Cloud Run เช่น domain mapping จึงยังไม่แนะนำ)

ไม่ใช้: Cloud Functions (FastAPI อยู่บน Cloud Run ตรงๆ ได้เลย), Firebase App Hosting (ไม่รองรับ Python), Cloud SQL / Redis (ข้อมูลน้อย Firestore พอ)

## 3. Spec

### 3.1 Cloud Run (backend)

| ค่า | แนะนำ | เหตุผล |
|---|---|---|
| CPU | **4 vCPU** | upscale จาก 720p ใช้ ~12 วิบนเครื่อง dev (M1) และใช้ทุก core: CPU มากขึ้นเสร็จเร็วขึ้น ค่าต่อรูปแทบเท่าเดิม (คิดเป็น vCPU-วินาที) บวก matte อีกหลายวิ |
| Memory | **4 GiB** | โมเดล IS-Net 179MB + Real-ESRGAN ค้างใน memory, ภาพผลลัพธ์ ×4 (2880×5120) ต่อ request |
| Concurrency | **10** | งานกิน CPU: รับพร้อมกันมากไปจะแย่ง core จนเกิน timeout ให้ Cloud Run เพิ่ม instance แทน |
| Min instances | **1 ระหว่างวันงาน**, 0 นอกวันงาน | กัน cold start (Python + โหลดโมเดล ONNX) workflow deploy ไม่แตะค่านี้ ต้องตั้งเอง (หัวข้อ 5) |
| Max instances | **5** | 3,000 รูป/วัน ≈ ไม่ถึง 1 รูป/วินาทีตอน peak ที่เหลือเผื่อ |
| Timeout | **60 วิ** | เท่ากับ timeout ของ Hosting rewrite ตั้งเกินไปก็ไม่ช่วย |
| Region | asia-southeast1 | |

**ยังไม่ได้วัดบน Cloud Run จริง** (vCPU ของ Cloud Run น่าจะช้ากว่า M1) หลัง deploy ดู log `[upscale] took`, `[matte] took`, `[dress] took`:

- upscale ใกล้ 60 วิ → ลด `INPUT_WIDTH` ใน [upscale.py](../backend/app/services/upscale.py) หรือเพิ่ม CPU (ถ้า upscale ล้ม ตู้ใช้เฟรมเดิมที่ไม่คม)
- `/api/dress` รอ Decart ได้ถึง 120 วิ (`TIMEOUT_S` ใน [dress.py](../backend/app/services/dress.py)) แต่ Hosting ตัดที่ 60 วิ job ที่ช้ากว่านั้นตู้จะได้ error

### 3.2 Storage / Firestore

- รูป ~0.4–0.6MB/รูป × สูงสุด 3,000/วัน × 7 วัน ≈ **สูงสุด ~12GB** ในเวลาใดเวลาหนึ่ง
- Firestore: ~2 writes ต่อคน (consent + photo) → 3,000 คน ≈ 6,000 writes/วัน

### 3.3 เครื่องตู้ (ฝั่ง client — สำคัญที่สุด)

ตู้ต้องตัดคนด้วย MediaPipe (GPU) ระหว่างโพสท่า (โหมด `vton-live` ทุกเฟรม), อัดคลิป MP4 และประกอบรูปจากภาพ 4K ของกล้อง

| อุปกรณ์ | ขั้นต่ำที่แนะนำ |
|---|---|
| เครื่อง | **Asus Mini PC PN series** (ยังไม่ระบุรุ่นย่อย) ต้องเป็นรุ่น Intel Core i5 Gen 12+ / Core Ultra (Iris Xe ขึ้นไป) หรือ AMD Ryzen 5 7000+ (Radeon 680M+) เช่น PN64, PN65, PN53 — รุ่น Celeron / N100 (PN41, PN42) GPU อ่อนเกินไป |
| RAM / Disk | 16GB / SSD 256GB |
| Browser | Chrome stable, kiosk mode, เปิด hardware acceleration (WebGL ต้องใช้ได้) |
| จอ | แนวตั้ง 1080×1920 touch (UI ออกแบบ 9:16) |
| กล้อง | **Orbbec Femto Bolt** (ใช้แค่กล้อง RGB 4K 3840×2160 แบบ UVC ไม่ใช้ depth) ต่อ USB 3 ตรงเข้าเครื่อง ไม่ผ่าน hub **ติดตั้งแนวตั้งตรง** (โค้ดยังไม่รองรับกล้องหมุน) |
| เน็ต | **สาย LAN**, ≥10 Mbps ขึ้น/ลง ต่อตู้, เสถียร; ใช้แค่ HTTPS ไปที่ domain ของเรา (ไม่ต้องเปิด UDP) ต่อรูปส่งขึ้น ~5–10MB (คลิป, เฟรม) รับกลับ ~5MB |
| แสง | ไฟหน้าคนแบบ soft ให้ตัดพื้นหลังได้คม |

## 4. โค้ดที่ต้องแก้ก่อน deploy

1. ~~**Storage → Cloud Storage**~~ เสร็จแล้ว: ตั้ง `STORAGE_BUCKET` แล้ว [storage.py](../backend/app/services/storage.py) (`BucketStorage`) เก็บรูปที่ `photos/` และ consent ที่ `consents/` ใน bucket ไม่ตั้งก็ลง disk เหมือนเดิม (ใช้ตอน dev) ไม่ใช้ Firestore
   - id รูปขึ้นต้นด้วยวันที่ (UTC) ให้นับรูป 24 ชม. ได้ด้วยการ list แค่ 2 วันล่าสุด
   - bucket `ku-cloth-interactive.firebasestorage.app` มี lifecycle ลบเมื่ออายุ 7 วัน ทั้ง `photos/` และ `consents/` (ถ้า DPO ให้เก็บ consent นานกว่า ต้องจำกัด rule ไว้ที่ `photos/`)
   - bucket อยู่ US-EAST1 ส่วน Cloud Run อยู่ Singapore: ทุกครั้งที่อ่าน/เขียนรูปไกลขึ้นราว 0.2 วิ
2. ~~**Dockerfile** สำหรับ backend~~ เสร็จแล้ว: [backend/Dockerfile](../backend/Dockerfile) ใส่ `assets/`, `models/` และโหลด model ตัดคน (IS-Net 179MB) เข้า image ตอน build
3. **กันคนนอกยิง API** — ตอนนี้ใครก็ได้ที่รู้ URL ขอ token Decart ได้ = เสียเงินเรา
   - ตู้ login Firebase Auth (account ต่อตู้ ตั้งครั้งเดียวตอนติดตั้ง) ส่ง ID token มากับทุก `/api` ที่เสียเงิน: `/api/consent`, `/api/dress` (Decart job ละครั้ง), `/api/matte`, `/api/upscale` (CPU), `/api/generate`
   - backend ตรวจด้วย `firebase-admin`
   - เพิ่มเพดานจำนวน token ต่อวันใน backend (คล้าย MAX_PER_DAY)
4. ~~**จำกัดเวลา stream**~~ ไม่ต้องแล้ว: ไม่ใช้ realtime stream ค่า Decart คิดต่อการกดถ่าย (หัวข้อ 6)
5. **Config** — `PUBLIC_URL` = custom domain, เพิ่ม `STORAGE_BUCKET`; เลิกเสิร์ฟ `kiosk/dist` จาก FastAPI ใน production (Hosting ทำแทน — เก็บไว้ใช้ตอน dev ได้)
6. ~~**Build script**~~ เสร็จแล้ว: workflow deploy copy `backend/assets/{backgrounds,tiles}` เข้า `kiosk/dist/assets` ให้
7. ~~**Spec Cloud Run**~~ ตั้งแล้ว 4 vCPU / 4 GiB / concurrency 10 ทั้งใน workflow และหัวข้อ 5 เหลือวัดเวลาจริง (หัวข้อ 3.1)

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
  --cpu 4 --memory 4Gi --concurrency 10 --min-instances 1 --max-instances 5 --timeout 60 \
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
      { "source": "/assets/**",    "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/index.html",   "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
    ]
  }
}
```

หลังวันงาน: `gcloud run services update ku-grad-api --min-instances 0` เพื่อไม่เสียค่า instance ค้าง

## 6. ค่าใช้จ่ายโดยประมาณ

ค่าใช้จ่ายแทบทั้งหมด **คิดตามจำนวนรูป** วันไหนไม่มีคนถ่ายก็เกือบไม่เสีย

### 6.1 ต่อรูป (เหมือนกันทุกวัน)

| รายการ | คิดยังไง | ต่อรูป |
|---|---|---|
| **Decart batch** (`/api/dress`) | ~$0.04/วินาทีวิดีโอที่ได้ (720p) × คลิป 1 วิ (`CLIP_MS` ใน [clip.ts](../kiosk/src/lib/clip.ts)) = 1 job ต่อการกดถ่าย | **~$0.04** |
| Cloud Run: request | upscale + matte ~20 วิ × 4 vCPU (ประมาณ ยังไม่ได้วัด) | ~$0.003 (~1,500 รูปแรกของเดือนอยู่ใน free tier) |
| Hosting: bandwidth | ตู้รับกลับ ~4–5MB (คลิปใส่ชุด, ภาพ ×4, mask) + คนสแกนโหลดรูป ~0.5MB, ~$0.15/GB | ~$0.001 (~70 รูปแรกของวันฟรี) |
| **รวม** | | **~$0.045 (~1.5 บาท)** |

คนหนึ่งถ่ายได้ 1–3 ครั้ง (`MAX_SHOTS`) → **$0.045–0.135 ต่อคน**

### 6.2 ค่าคงที่

| รายการ | วันงาน | วันปกติ |
|---|---|---|
| Cloud Run: min instance (4 vCPU / 4 GiB 1 ตัว) | ~$2.4/วัน | 0 (ตั้ง `--min-instances 0`; ลืมปิด ≈ $70/เดือน) |
| Cloud Storage (รูปเก็บ 7 วัน ~0.5MB/รูป) | สูงสุด ~12GB < $1/เดือน | ~0 |
| Firestore (~2 writes/คน) | free tier | free tier |
| Artifact Registry, Cloud Build (image ~1GB; ลบ image เก่าเป็นระยะ) | < $1/เดือน | < $1/เดือน |
| Secret Manager, Firebase Auth, Logging | ~0 | ~0 |

### 6.3 ตัวอย่าง

| | คน/วัน | ต่อวัน | ต่อเดือน (30 วัน) |
|---|---|---|---|
| ไม่มีคนใช้ (ระบบเปิดไว้เฉยๆ) | 0 | ~$0 | **< $2** |
| วันปกติ ตู้เปิดให้ใช้ | 50 | ~$2–7 | ~$70–200 |
| วันปกติ คนเยอะ | 200 | ~$9–27 | ~$270–810 |
| วันงาน | 1,000 | ~$47–140 | |
| วันงาน | 3,000 | ~$140–410 | |

ช่วงตัวเลข = ทุกคนถ่าย 1 ครั้ง ถึงทุกคนถ่ายครบ 3 ครั้ง; Decart ~90% ของทั้งหมด

- วันปกติ min instance = 0: คนแรกหลังว่างนานรอ cold start เพิ่มหลายวินาที (Python + โหลดโมเดล)
- `MAX_PER_DAY` (ตอนนี้ 3,000) เป็นเพดานคร่าวๆ: นับรูปที่เก็บใน 24 ชม. ล่าสุด เต็มแล้ว `/api/dress` ก็หยุดรับ (แต่ job ที่ถ่ายใหม่แล้วไม่ได้เก็บไม่ถูกนับ) วันปกติลดลงได้ทาง env เช่น `MAX_PER_DAY=300`
- ราคา Decart batch $0.04/วิ มาจาก [ตัวอย่างในหน้า pricing ของ Decart](https://docs.platform.decart.ai/getting-started/pricing) ซึ่งยังไม่ตรงกับตารางในหน้าเดียวกัน ให้ยืนยันกับ Decart ก่อนเสนอราคา (ขอส่วนลด volume ได้)
- ตัวเลข Cloud Run คิดจากราคา Tier 2 (~$0.0000336/vCPU-วินาที, ~$0.0000035/GiB-วินาที) ให้เช็คกับ [หน้า pricing](https://cloud.google.com/run/pricing) และเวลาจริงจาก log
- ไม่รวม: ฮาร์ดแวร์ตู้ (Asus PN, Femto Bolt, จอ touch), เน็ตหน้างาน, domain

## 7. Checklist ก่อนวันงาน

- [ ] ทดสอบเน็ตสถานที่: ความเร็วขึ้น/ลงต่อตู้, ถ่ายจริงครบ 1 รูปไม่เกิน timeout
- [ ] วัดเวลา `[dress]`, `[upscale]`, `[matte]` บน Cloud Run จริง แต่ละตัวต้องต่ำกว่า 60 วิ
- [ ] กล้อง Femto Bolt ต่อ USB 3 ตรง ตู้เห็นภาพ 3840×2160 (log `[photo] camera 3840x2160`)
- [ ] ตั้ง budget alert (GCP) + ดู usage / spending limit ฝั่ง Decart
- [ ] `SAVE_STEPS=false`
- [ ] ข้อความ PDPA ตรงกับระยะเก็บ 7 วัน และระบุ Decart เป็นผู้ประมวลผล
- [ ] ใส่ `frames/` (ถ้ามี) ให้ครบ
- [ ] ทดสอบ QR บนมือถือผ่าน custom domain จริง
- [ ] min-instances = 1 ก่อนเปิดงาน, = 0 หลังจบ

## 8. คำถามที่ต้องตอบก่อนลงมือ

1. กี่ตู้ และวัน/เวลาจัดงาน (กำหนด min/max instances และงบ Decart)
2. Domain ที่ QR ชี้ไป (เช่น subdomain ของ ku.ac.th หรือของบริษัท)
3. Google Cloud project / billing account ของใคร (KU หรือบริษัท)
4. งบ Decart ต่อวัน — จะให้ระบบหยุดรับคนเมื่อถึงเพดานไหม
5. เก็บ consent record กี่วัน (รูปลบ 7 วัน แต่หลักฐาน consent อาจต้องเก็บนานกว่า — ถาม DPO)

## 9. Deploy (GitHub Actions)

| Workflow | ทำงานเมื่อ | ทำอะไร |
|---|---|---|
| [deploy.yml](../.github/workflows/deploy.yml) | **กดเองเท่านั้น** (Actions → Deploy → Run workflow) | backend → Cloud Run, kiosk + ฉาก/tiles → Firebase Hosting ([firebase.json](../firebase.json)) |

deploy ยังเป็นแบบกดเอง จนกว่าหัวข้อ 4 จะเสร็จ (ตอนนี้รูปยังเก็บบน disk ของ instance ซึ่งหายได้)
เสร็จแล้วค่อยเปลี่ยนเป็น deploy อัตโนมัติเมื่อ merge เข้า `main`

ตั้งค่าครั้งแรก (ไม่มี key เก็บใน GitHub เลย GitHub ขอสิทธิ์ Google ผ่าน Workload Identity Federation):

```sh
PROJECT=ku-grad-kiosk-2026
REPO=Chakhrxx/ku-grad-kiosk-2026
gcloud iam service-accounts create github-deploy --project $PROJECT
SA=github-deploy@$PROJECT.iam.gserviceaccount.com
for role in run.admin cloudbuild.builds.editor artifactregistry.admin storage.admin \
            iam.serviceAccountUser secretmanager.secretAccessor firebasehosting.admin serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $PROJECT --member serviceAccount:$SA --role roles/$role
done
gcloud iam workload-identity-pools create github --location global --project $PROJECT
gcloud iam workload-identity-pools providers create-oidc github --location global --workload-identity-pool github \
  --project $PROJECT --issuer-uri https://token.actions.githubusercontent.com \
  --attribute-mapping google.subject=assertion.sub,attribute.repository=assertion.repository \
  --attribute-condition "assertion.repository == '$REPO'"
POOL=$(gcloud iam workload-identity-pools describe github --location global --project $PROJECT --format 'value(name)')
gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT \
  --role roles/iam.workloadIdentityUser --member "principalSet://iam.googleapis.com/$POOL/attribute.repository/$REPO"
```

แล้วใน GitHub: Settings → Secrets and variables → Actions → แท็บ Variables เพิ่ม repository variables

| Variable | ค่า |
|---|---|
| `GCP_PROJECT` | project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<เลข project>/locations/global/workloadIdentityPools/github/providers/github` |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | `github-deploy@<project>.iam.gserviceaccount.com` |
| `PUBLIC_URL` | custom domain ที่ QR ชี้ไป เช่น `https://kiosk.example.com` |
