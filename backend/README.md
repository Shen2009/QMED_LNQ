# Q-Med Backend

Backend nay duoc viet bang Python standard library de chay duoc ngay, khong can cai package ngoai.
Ban hien tai tap trung vao API cho frontend Expo, luu lich su bang SQLite va co AI engine demo.

## Chay server

```bash
python3 backend/app.py
```

Mac dinh server chay tai:

```text
http://localhost:6789
```

Frontend Expo dang cau hinh goi API tai:

```text
http://localhost:6789/api
```

Co the doi cong/host bang bien moi truong:

```bash
QMED_PORT=6790 QMED_HOST=0.0.0.0 python3 backend/app.py
```

## API chinh

- `GET /health`: kiem tra server.
- `POST /api/ai/analyze`: phan tich demo cho Face rPPG, Stress, Blood Pressure, Heartbeat.
- `POST /api/rppg/analyze-signal`: phan tich rPPG tu chuoi tin hieu RGB/green-channel.
- `GET /api/measurements`: lay lich su do tu SQLite.
- `GET /api/measurements?type=Stress&limit=20`: loc lich su theo loai va gioi han so dong.
- `GET /api/measurements/summary`: thong ke tong so ket qua, so luong theo loai va ket qua moi nhat.
- `GET /api/measurements/{id}`: lay chi tiet mot ket qua do.
- `POST /api/measurements`: luu mot ket qua do.
- `DELETE /api/measurements`: xoa toan bo lich su.
- `DELETE /api/measurements/{id}`: xoa mot ket qua do.
- `POST /api/qbot/messages`: Q-Bot tra loi dua tren lich su do va cau hoi.

## Vi du goi AI demo

```bash
curl -X POST http://localhost:6789/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"type":"face_rppg","duration":15,"sessionId":"demo-1"}'
```

## Vi du goi rPPG signal

Endpoint nay nhan mau mau theo thoi gian da trich xuat tu vung mat tren frontend.
Co the gui `greenSignal` hoac `rgbSamples`.

```bash
curl -X POST http://localhost:6789/api/rppg/analyze-signal \
  -H "Content-Type: application/json" \
  -d '{"fps":30,"greenSignal":[120,121,123,122,121,120,119,118]}'
```

Vi du tren chi minh hoa format. rPPG can it nhat khoang 6 giay tin hieu hop le,
nen khi dung that frontend can gui khoang 180 mau neu quay 30 FPS. Ket qua chi
phuc vu demo, khong dung de chan doan y te.

## Cau truc backend

- `app.py`: HTTP routing, CORS, JSON response.
- `config.py`: cau hinh host, port, version va gioi han request body.
- `storage.py`: SQLite repository cho lich su do.
- `validators.py`: validate va normalize payload truoc khi luu.
- `services/ai_engine.py`: AI inference demo, san cho viec cam model that.
- `services/qbot_service.py`: logic tra loi Q-Bot backend.
- `services/rppg_service.py`: rPPG signal processing tu RGB/green-channel.

## Ghi chu ve AI model

Trong workspace hien tai khong con checkpoint/model train that. File `services/ai_engine.py`
dang la lop inference gia lap co cau truc san. Khi tim lai model that, thay logic trong
`analyze_measurement()` bang code load model va predict.
