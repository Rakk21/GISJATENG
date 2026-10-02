# SIG Jawa Tengah

Dashboard WebGIS untuk menjelajahi batas administratif Jawa Tengah, mencari wilayah, dan melihat analisis statistik.

## Struktur proyek

```text
app/          Halaman, UI dashboard, API proxy, dan stylesheet Next.js
backend/      API FastAPI, model database, skema, dan migrasi Alembic
public/       Aset publik, termasuk GeoJSON kabupaten/kota Jawa Tengah
tests/        Tes aset peta dan dashboard
```

## Menjalankan aplikasi

Gunakan Node.js 20.9 atau lebih baru dan Python 3.10.

```powershell
npm install
py -3.10 -m venv backend/venv
.\backend\venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Atur `DATABASE_URL` pada `backend/.env` sesuai database lokal. Setelah backend siap:

```powershell
npm run dev
```

Frontend berjalan pada `http://localhost:3000`; API berjalan pada port `8080`. Script terpisah tersedia sebagai `npm run dev:frontend` dan `npm run dev:backend`.

## Memeriksa proyek

```powershell
npm run build
npm run lint
npm test
```

Peta saat ini menggunakan geometri kabupaten/kota dari GeoJSON di `public/`. Dataset anggota, suara, dan penduduk belum menjadi data backend; mode Admin menerima CSV sebagai pratinjau sementara di browser, bukan penyimpanan permanen.
