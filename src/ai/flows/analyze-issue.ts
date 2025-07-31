'use server';

/**
 * @fileOverview Menganalisis masalah kendaraan yang dijelaskan oleh seorang mekanik dan menyarankan kemungkinan penyebabnya.
 *
 * - analyzeIssue - Fungsi yang menerima deskripsi masalah kendaraan dan mengembalikan daftar kemungkinan penyebab.
 * - AnalyzeIssueInput - Tipe input untuk fungsi analyzeIssue.
 * - AnalyzeIssueOutput - Tipe kembalian untuk fungsi analyzeIssue.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleSearch} from '../tools/google-search';

const AnalyzeIssueInputSchema = z.object({
  issueDescription: z.string().describe('Deskripsi masalah kendaraan yang diberikan oleh mekanik.'),
});
export type AnalyzeIssueInput = z.infer<typeof AnalyzeIssueInputSchema>;

const AnalyzeIssueOutputSchema = z.object({
  possibleCauses: z.array(
    z.object({
      cause: z.string().describe('Kemungkinan penyebab dari masalah kendaraan yang dijelaskan.'),
      details: z.string().describe('Penjelasan rinci tentang penyebab ini, dapat mencakup tabel atau gambar berformat Markdown.'),
    })
  ).describe('Daftar kemungkinan penyebab masalah kendaraan yang dijelaskan, diurutkan berdasarkan probabilitas.'),
  clarificationQuestions: z.array(
    z.string().describe('Pertanyaan untuk diajukan kepada mekanik untuk mengklarifikasi masalah.')
  ).optional().describe('Daftar pertanyaan untuk diajukan kepada mekanik untuk mengklarifikasi masalah, jika informasi yang diberikan tidak cukup.'),
});
export type AnalyzeIssueOutput = z.infer<typeof AnalyzeIssueOutputSchema>;

export async function analyzeIssue(input: AnalyzeIssueInput): Promise<AnalyzeIssueOutput> {
  return analyzeIssueFlow(input);
}

const analyzeIssuePrompt = ai.definePrompt({
  name: 'analyzeIssuePrompt',
  input: {schema: AnalyzeIssueInputSchema},
  output: {schema: AnalyzeIssueOutputSchema},
  tools: [googleSearch],
  prompt: `Anda adalah asisten AI yang membantu mekanik mendiagnosis masalah kendaraan.

Mekanik telah menjelaskan masalah berikut: {{{issueDescription}}}

Berdasarkan deskripsi ini, berikan daftar kemungkinan penyebab masalah, diurutkan berdasarkan probabilitas (paling mungkin terlebih dahulu). Untuk setiap penyebab, berikan nama penyebab ('cause') dan penjelasan rinci ('details'). Penjelasan rinci harus mudah dipahami. Jika penjelasannya panjang, gunakan daftar bernomor atau poin-poin untuk memecahnya. Penjelasan juga dapat mencakup tabel berformat Markdown untuk data terstruktur atau tautan gambar jika relevan. Gunakan alat googleSearch untuk mencari informasi tentang kendaraan dan masalah untuk memberikan diagnosis yang lebih akurat.

Contoh format tabel Markdown:
| Komponen | Status | Rekomendasi |
|---|---|---|
| Baterai | Lemah | Isi daya atau ganti |
| Alternator | Tidak mengisi daya | Periksa sabuk dan koneksi |

Contoh format gambar Markdown:
![Diagram sistem pengapian](https://placehold.co/400x300.png)

Jika deskripsinya tidak jelas atau tidak jelas, berikan daftar pertanyaan untuk diajukan kepada mekanik untuk mengklarifikasi masalah.

Keluarkan kemungkinan penyebab (dengan detail) dan pertanyaan klarifikasi (jika ada) dalam format JSON.
`,
});

const analyzeIssueFlow = ai.defineFlow(
  {
    name: 'analyzeIssueFlow',
    inputSchema: AnalyzeIssueInputSchema,
    outputSchema: AnalyzeIssueOutputSchema,
  },
  async input => {
    const {output} = await analyzeIssuePrompt(input);
    return output!;
  }
);
