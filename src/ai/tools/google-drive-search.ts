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

const DRIVE_FOLDER_ID = '0B9pVa3_DLWq7Q2FNcFdaMHFwdVE';

export const searchGoogleDrive = ai.defineTool(
  {
    name: 'searchGoogleDrive',
    description: `Mencari file di dalam folder Google Drive tertentu (${DRIVE_FOLDER_ID}) berdasarkan nama file atau konten. Berguna untuk menemukan manual perbaikan, buletin layanan teknis (TSB), diagram pengkabelan, dan dokumentasi internal lainnya.`,
    inputSchema: z.object({
      query: z.string().describe('Kueri pencarian (misalnya, "manual perbaikan Honda Civic 2015 P0301").'),
    }),
    outputSchema: z.object({
      files: z.array(FileSearchResultSchema).describe('Daftar file yang cocok dari Google Drive.'),
    }),
  },
  async (input) => {
    try {
      // Inisialisasi Google Drive API Client
      // PENTING: Otentikasi saat ini menggunakan Kunci API.
      // Ini berarti HANYA file di dalam folder yang ditentukan dan yang dibagikan secara PUBLIK ("Siapa saja yang memiliki link") yang dapat ditemukan.
      // Untuk mencari file pribadi, Anda perlu mengimplementasikan otentikasi OAuth2 atau Akun Layanan.
      const drive = google.drive({
        version: 'v3',
        auth: process.env.GOOGLE_API_KEY, 
      });

      const searchQuery = `('${DRIVE_FOLDER_ID}' in parents) and (fullText contains '${input.query}' or name contains '${input.query}')`;

      const response = await drive.files.list({
        q: searchQuery,
        fields: 'files(id, name, mimeType, webViewLink, fullFileExtension, description)',
        // Untuk pencarian yang lebih baik pada file pribadi, korpus 'USER' atau 'DOMAIN' dapat digunakan dengan OAuth2.
        // corpora: 'user', 
        pageSize: 10, // Batasi jumlah hasil
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
      console.error('Error searching Google Drive:', error.message);
      // Mengembalikan array kosong jika terjadi kesalahan agar tidak menghentikan alur
      return { files: [] };
    }
  }
);
