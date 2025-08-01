# Gazrux Assist: Partner AI di Garasi Anda

Ini adalah aplikasi Next.js yang dirancang untuk membantu mekanik dalam mendiagnosis dan memperbaiki masalah kendaraan dengan cepat dan akurat.

## Konfigurasi Wajib (Agar Aplikasi Berfungsi)

Aplikasi ini **TIDAK AKAN BERFUNGSI** sampai Anda menyelesaikan langkah-langkah konfigurasi di bawah ini. Anda perlu memberikan "kunci" API agar aplikasi dapat terhubung ke layanan Google.

### Langkah 1: Buat File Konfigurasi `.env`

Di direktori utama proyek Anda, buat file baru dan beri nama `.env`.

### Langkah 2: Isi File `.env` Anda

Buka file `.env` yang baru saja Anda buat dan isi setiap variabel dengan nilai yang benar. Salin template di bawah ini dan tempelkan ke dalam file `.env` Anda.

```
SERPAPI_API_KEY=""
DRIVE_FOLDER_ID=""
GOOGLE_APPLICATION_CREDENTIALS_JSON=''
```

#### 1. `SERPAPI_API_KEY` (Untuk Pencarian Web)
- Kunjungi [SerpApi](https://serpapi.com/) dan daftar untuk mendapatkan akun.
- Dapatkan kunci API Anda dari dashboard.
- Tempelkan di file `.env` di dalam tanda kutip: `SERPAPI_API_KEY="kunci_api_anda_di_sini"`

#### 2. `DRIVE_FOLDER_ID` (Folder Manual PDF Anda)
- Buat sebuah folder di Google Drive Anda.
- Letakkan semua file PDF manual perbaikan di dalam folder ini.
- Buka folder tersebut, dan salin ID folder dari URL. Contoh: `https://drive.google.com/drive/folders/INI_ADALAH_ID_FOLDER_ANDA`
- Tempelkan di file `.env`: `DRIVE_FOLDER_ID="id_folder_anda_di_sini"`

#### 3. `GOOGLE_APPLICATION_CREDENTIALS_JSON` (Untuk Akses Google Drive)
- **Aktifkan Drive API**: Buka [Google Cloud Console](https://console.cloud.google.com/apis/library/drive.googleapis.com) dan aktifkan Google Drive API untuk proyek Anda.
- **Buat Akun Layanan**: Buka [Halaman Akun Layanan](https://console.cloud.google.com/iam-admin/serviceaccounts), pilih proyek Anda, dan buat akun layanan baru. Anda bisa menamainya `gazrux-assist-service`.
- **Buat Kunci JSON**: Setelah akun layanan dibuat, klik pada akun tersebut, buka tab "Keys", klik "Add Key" -> "Create new key", pilih **JSON**, dan unduh file kredensialnya.
- **Bagikan Folder Drive**: Kembali ke folder Google Drive Anda. Klik kanan -> "Share" -> dan bagikan folder tersebut dengan alamat email akun layanan yang baru saja Anda buat (contoh: `gazrux-assist-service@nama-proyek-anda.iam.gserviceaccount.com`). Beri akses sebagai "Viewer" atau "Content manager".
- **Tempelkan Kredensial**: Buka file JSON yang Anda unduh, salin **SELURUH ISINYA**, dan tempelkan ke file `.env` di dalam tanda kutip tunggal.
  `GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", ...}'`

### Langkah 3: Restart Aplikasi Anda

Setelah semua variabel di file `.env` terisi, hentikan server pengembangan Anda (dengan Ctrl+C) dan jalankan kembali (`npm run dev`). Aplikasi sekarang akan berfungsi dengan benar.
