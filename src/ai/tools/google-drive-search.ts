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

export const searchGoogleDrive = ai.defineTool(
  {
    name: 'searchGoogleDrive',
    description: 'Mencari file di Google Drive berdasarkan nama file atau konten. Berguna untuk menemukan manual perbaikan, buletin layanan teknis (TSB), diagram pengkabelan, dan dokumentasi internal lainnya.',
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
      // PENTING: Untuk produksi, gunakan otentikasi OAuth2 atau akun layanan.
      // Menggunakan hanya kunci API akan memberikan akses baca-saja ke file yang dibagikan secara publik.
      const drive = google.drive({
        version: 'v3',
        auth: process.env.GOOGLE_API_KEY, // Kunci API untuk akses dasar
      });

      const response = await drive.files.list({
        q: `fullText contains '${input.query}' or name contains '${input.query}'`,
        fields: 'files(id, name, mimeType, webViewLink, fullFileExtension, description)',
        // fields: 'files(id, name, mimeType, webViewLink)',
        // Untuk pencarian yang lebih baik, korpus 'USER' atau 'DOMAIN' dapat digunakan dengan OAuth2.
        // corpora: 'user', 
        pageSize: 5, // Batasi jumlah hasil
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
