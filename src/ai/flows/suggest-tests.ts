'use server';
/**
 * @fileOverview File ini mendefinisikan alur Genkit untuk menyarankan tes spesifik yang dapat dilakukan mekanik untuk mendiagnosis masalah kendaraan.
 *
 * - suggestTests - Fungsi yang menyarankan tes berdasarkan masalah yang dijelaskan dan penyebab potensial.
 * - SuggestTestsInput - Tipe input untuk fungsi suggestTests.
 * - SuggestTestsOutput - Tipe kembalian untuk fungsi suggestTests.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTestsInputSchema = z.object({
  issueDescription: z.string().describe('Deskripsi mekanik tentang masalah kendaraan, termasuk gejala, suara, dan kode kesalahan.'),
  potentialCauses: z.string().describe('Daftar penyebab potensial masalah, yang diidentifikasi pada langkah sebelumnya.'),
});
export type SuggestTestsInput = z.infer<typeof SuggestTestsInputSchema>;

const SuggestTestsOutputSchema = z.object({
  suggestedTests: z.string().describe('Daftar tes yang disarankan yang dapat dilakukan mekanik, seperti pemeriksaan sensor atau pemindaian OBD-II.'),
});
export type SuggestTestsOutput = z.infer<typeof SuggestTestsOutputSchema>;

export async function suggestTests(input: SuggestTestsInput): Promise<SuggestTestsOutput> {
  return suggestTestsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTestsPrompt',
  input: {schema: SuggestTestsInputSchema},
  output: {schema: SuggestTestsOutputSchema},
  prompt: `Anda adalah asisten AI yang membantu mekanik mendiagnosis masalah kendaraan.

Mekanik telah menjelaskan masalah berikut: {{{issueDescription}}}

Berdasarkan deskripsi ini, penyebab potensial berikut telah diidentifikasi:
{{{potentialCauses}}}

Sarankan tes spesifik yang dapat dilakukan mekanik untuk mempersempit kemungkinan penyebab. Jadilah spesifik dan sarankan pengukuran atau pemeriksaan konkret yang dapat dilakukan. Misalnya, "Periksa resistansi sensor X" atau "Lakukan pemindaian OBD-II dan periksa kode kesalahan yang terkait dengan sistem bahan bakar". Fokus pada tes yang dapat membantu membedakan antara penyebab potensial yang tercantum di atas. Berikan daftar tes yang disarankan dalam bentuk bernomor.

Hanya keluarkan daftar tes yang disarankan. Jangan sertakan pernyataan pembuka atau penutup apa pun.
`,
});

const suggestTestsFlow = ai.defineFlow(
  {
    name: 'suggestTestsFlow',
    inputSchema: SuggestTestsInputSchema,
    outputSchema: SuggestTestsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
