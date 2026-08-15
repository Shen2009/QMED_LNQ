# Q-Med Backend

Backend nay duoc viet bang Python standard library de chay duoc ngay, khong can cai package ngoai.

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

## API chinh

- `GET /health`: kiem tra server.
- `POST /api/ai/analyze`: phan tich demo cho Face rPPG, Stress, Blood Pressure, Heartbeat.
- `GET /api/measurements`: lay lich su do tu SQLite.
- `POST /api/measurements`: luu mot ket qua do.
- `DELETE /api/measurements`: xoa toan bo lich su.
- `DELETE /api/measurements/{id}`: xoa mot ket qua do.
- `POST /api/qbot/messages`: Q-Bot tra loi dua tren lich su do va cau hoi.

## Ghi chu ve AI model

Trong workspace hien tai khong con checkpoint/model train that. File `services/ai_engine.py`
dang la lop inference gia lap co cau truc san. Khi tim lai model that, thay logic trong
`analyze_measurement()` bang code load model va predict.
