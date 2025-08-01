# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Konfigurasi

Aplikasi ini memerlukan beberapa kunci API dan variabel lingkungan untuk berfungsi dengan benar, terutama untuk fitur pencarian.

### Langkah-langkah Konfigurasi

1.  **Buat file `.env`**: Salin file `env.template` menjadi file baru bernama `.env` di root proyek Anda.
    
    ```bash
    cp .env.template .env
    ```

2.  **Dapatkan Kunci API SerpApi**:
    *   Kunjungi [SerpApi](https://serpapi.com/) dan daftar untuk mendapatkan akun.
    *   Dapatkan kunci API Anda dari dashboard SerpApi.
    *   Tambahkan kunci tersebut ke file `.env` Anda:
        `SERPAPI_API_KEY="kunci_api_serpapi_anda"`

3.  **Siapkan Kredensial Google Cloud & Drive**:
    *   **Buat Akun Layanan**: Buka [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts), pilih proyek Anda, dan buat akun layanan baru. Beri nama (misalnya, `gazrux-assist-service-account`).
    *   **Buat Kunci JSON**: Setelah akun layanan dibuat, buka tab "Keys", klik "Add Key", pilih "Create new key", dan unduh file kredensial dalam format JSON.
    *   **Aktifkan Google Drive API**: Di [Google Cloud Console](https://console.cloud.google.com/apis/library/drive.googleapis.com), pastikan Google Drive API diaktifkan untuk proyek Anda.
    *   **Bagikan Folder Google Drive**:
        *   Buat folder di Google Drive Anda tempat Anda akan menyimpan semua manual perbaikan PDF.
        *   Dapatkan **ID Folder**. ID ini ada di URL (misalnya, `https://drive.google.com/drive/folders/ID_FOLDER_ANDA_ADA_DI_SINI`).
        *   Klik kanan pada folder, pilih "Share", dan bagikan folder tersebut dengan alamat email akun layanan yang Anda buat tadi (misalnya, `nama-akun-layanan@nama-proyek-anda.iam.gserviceaccount.com`). Berikan setidaknya akses "Viewer".
        *   Tambahkan ID folder ke file `.env` Anda: `DRIVE_FOLDER_ID="id_folder_google_drive_anda"`
    *   **Konfigurasi Kredensial JSON**: Salin **seluruh isi** file JSON yang Anda unduh dan tempelkan ke file `.env` Anda di dalam tanda kutip:
        `GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", ...}'`

4.  **Restart Aplikasi**: Setelah mengisi semua variabel di file `.env`, hentikan dan jalankan kembali server pengembangan Anda agar perubahan diterapkan.

# gazrux-assist-app