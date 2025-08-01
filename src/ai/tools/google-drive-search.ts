'use server';
/**
 * @fileOverview Alat untuk mencari file di Google Drive.
 * 
 * - searchGoogleDrive - Tool Genkit yang menerima kueri pencarian dan mengembalikan file yang cocok dari Google Drive.
 */

import { ai } from '@/ai/genkit';
import { google } from 'googleapis';
import { z } from 'zod';

// Skema untuk hasil pencarian file individual
const FileSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  webViewLink: z.string().describe("URL untuk melihat file di browser."),
  snippet: z.string().optional().describe("Cuplikan konten file yang relevan dengan kueri."),
});

// PENTING: ID folder Google Drive diambil dari variabel lingkungan.
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

export const searchGoogleDrive = ai.defineTool(
  {
    name: 'searchGoogleDrive',
    description: `Mencari file di dalam folder Google Drive bengkel yang spesifik, termasuk semua sub-foldernya. Berguna untuk menemukan manual perbaikan, buletin layanan teknis (TSB), dan dokumentasi internal lainnya.`,
    inputSchema: z.object({
      query: z.string().describe('Kueri pencarian (misalnya, "manual perbaikan Honda Civic 2015 P0301").'),
    }),
    outputSchema: z.object({
      files: z.array(FileSearchResultSchema).describe('Daftar file yang cocok dari Google Drive.'),
    }),
  },
  async (input) => {
    if (!DRIVE_FOLDER_ID) {
        console.error('Error: DRIVE_FOLDER_ID tidak diatur di file .env.');
        return { files: [] };
    }
    try {
      let credentials;
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      } else {
        console.error('Error: GOOGLE_APPLICATION_CREDENTIALS_JSON tidak diatur di file .env.');
        return { files: [] };
      }

      // Inisialisasi Google Drive API Client menggunakan otentikasi yang benar
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      const drive = google.drive({
        version: 'v3',
        auth: auth, 
      });

      // Kueri ini membatasi pencarian ke folder yang ditentukan dan semua sub-foldernya, lalu mencari berdasarkan nama atau konten.
      const searchQuery = `'${DRIVE_FOLDER_ID}' in parents and (fullText contains '${input.query}' or name contains '${input.query}')`;

      const response = await drive.files.list({
        q: searchQuery,
        fields: 'files(id, name, mimeType, webViewLink, fullFileExtension, description)',
        pageSize: 10, // Batasi jumlah hasil untuk menjaga kecepatan
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        snippet: file.description || '', // Gunakan deskripsi sebagai cuplikan jika tersedia
      })) || [];
      
      return { files };
    } catch (error: any) {
      console.error('Error searching Google Drive:', error);
      // Mengembalikan array kosong jika terjadi error agar aplikasi tidak crash.
      // Pertimbangkan untuk memberikan pesan error yang lebih informatif kepada pengguna jika diperlukan.
      return { files: [] };
    }
  }
);