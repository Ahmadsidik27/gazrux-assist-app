'use server';

/**
 * @fileOverview Alur AI untuk menemukan manual bengkel, panduan perbaikan, dan dokumen teknis.
 *
 * - findManual - Fungsi yang menerima kueri dan mengembalikan daftar manual yang relevan.
 * - FindManualInput - Tipe input untuk fungsi findManual.
 * - FindManualOutput - Tipe kembalian untuk fungsi findManual.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleSearch} from '../tools/google-search';
import { searchGoogleDrive } from '../tools/google-drive-search';

const FindManualInputSchema = z.object({
  query: z.string().describe('Kueri pencarian untuk manual (misalnya, "manual perbaikan Honda Civic 2018").'),
});
export type FindManualInput = z.infer<typeof FindManualInputSchema>;

const ManualResultSchema = z.object({
    title: z.string().describe('Judul dokumen atau halaman web.'),
    link: z.string().url().describe('URL ke sumber daya.'),
    snippet: z.string().describe('Cuplikan singkat yang menjelaskan konten.'),
    source: z.enum(['Google Drive', 'Web']).describe('Sumber hasil (Google Drive atau Web).'),
    isPdf: z.boolean().describe('Apakah tautan tersebut kemungkinan besar adalah file PDF.'),
});

const FindManualOutputSchema = z.object({
  results: z.array(ManualResultSchema).describe('Daftar manual dan dokumen yang ditemukan.'),
});
export type FindManualOutput = z.infer<typeof FindManualOutputSchema>;

export async function findManual(input: FindManualInput): Promise<FindManualOutput> {
  return findManualFlow(input);
}

const findManualPrompt = ai.definePrompt({
  name: 'findManualPrompt',
  input: {schema: FindManualInputSchema},
  output: {schema: FindManualOutputSchema},
  tools: [googleSearch, searchGoogleDrive],
  prompt: `Anda adalah asisten AI yang berspesialisasi dalam menemukan dokumentasi teknis otomotif.

Pengguna mencari dokumen untuk: {{{query}}}

Tugas Anda adalah menggunakan alat yang tersedia untuk menemukan manual bengkel, buletin layanan teknis (TSB), panduan perbaikan, atau diagram pengkabelan yang paling relevan.

Lakukan proses berikut:
1.  **Analisis Kueri Pengguna**: Pertama, analisis permintaan pengguna untuk mengidentifikasi komponen kunci:
    -   Merek Kendaraan (misal: Honda, Toyota)
    -   Model Kendaraan (misal: Civic, Avanza)
    -   Tahun Kendaraan (misal: 2018)
    -   Kata Kunci Spesifik (misal: 'rem', 'diagram kelistrikan', 'kode P0301')
    
2.  **Buat Kueri Pencarian Cerdas**: Gunakan komponen yang diidentifikasi untuk membuat kueri pencarian yang sangat spesifik. Contoh: Jika pengguna meminta "diagram rem honda civic 2018", kueri pencarian yang baik adalah "Honda Civic 2018 diagram kabel rem".

3.  **Prioritaskan Google Drive**: Selalu cari di Google Drive terlebih dahulu menggunakan alat 'searchGoogleDrive' dengan kueri cerdas Anda. Dokumen internal ini adalah yang paling dapat diandalkan.
4.  **Cari di Web**: Jika tidak ada hasil yang relevan dari Google Drive, atau untuk melengkapi hasilnya, gunakan 'googleSearch'.
5.  **Fokus pada PDF**: Berikan prioritas tinggi pada tautan yang tampaknya mengarah ke file PDF, karena ini sering kali merupakan manual yang sebenarnya. Tetapkan bidang 'isPdf' ke true untuk hasil ini.
6.  **Kualitas di atas Kuantitas**: Kembalikan hanya hasil yang paling relevan. Jangan sertakan tautan ke forum atau postingan blog yang tidak jelas kecuali jika mereka secara langsung menyediakan manual.

Gabungkan hasil dari kedua alat dan format menjadi daftar tunggal. Untuk setiap hasil, berikan judul, tautan, cuplikan singkat, sumber ('Google Drive' atau 'Web'), dan apakah itu PDF.`,
});

const findManualFlow = ai.defineFlow(
  {
    name: 'findManualFlow',
    inputSchema: FindManualInputSchema,
    outputSchema: FindManualOutputSchema,
  },
  async (input) => {
    const { output } = await findManualPrompt(input);
    return output!;
  }
);
