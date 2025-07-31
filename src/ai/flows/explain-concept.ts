'use server';

/**
 * @fileOverview Menjelaskan konsep otomotif menggunakan pencarian Google untuk akurasi.
 *
 * - explainConcept - Fungsi yang menerima topik otomotif dan mengembalikan penjelasannya.
 * - ExplainConceptInput - Tipe input untuk fungsi explainConcept.
 * - ExplainConceptOutput - Tipe kembalian untuk fungsi explainConcept.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleSearch} from '../tools/google-search';

const ExplainConceptInputSchema = z.object({
  topic: z.string().describe('Topik atau konsep otomotif yang akan dijelaskan.'),
});
export type ExplainConceptInput = z.infer<typeof ExplainConceptInputSchema>;

const ExplainConceptOutputSchema = z.object({
  explanation: z.string().describe('Penjelasan rinci tentang topik tersebut, diformat sebagai Markdown.'),
});
export type ExplainConceptOutput = z.infer<typeof ExplainConceptOutputSchema>;

export async function explainConcept(input: ExplainConceptInput): Promise<ExplainConceptOutput> {
  return explainConceptFlow(input);
}

const explainConceptPrompt = ai.definePrompt({
  name: 'explainConceptPrompt',
  input: {schema: ExplainConceptInputSchema},
  output: {schema: ExplainConceptOutputSchema},
  tools: [googleSearch],
  prompt: `Anda adalah seorang ahli teknologi otomotif. Jelaskan konsep berikut: {{{topic}}}.

Gunakan alat googleSearch untuk mengumpulkan informasi yang akurat dan terkini.

Berikan penjelasan yang jelas, ringkas, dan mudah dipahami. Gunakan format Markdown, termasuk daftar berpoin atau bernomor, untuk menyusun informasi agar mudah dibaca. Mulailah penjelasan secara langsung tanpa kalimat pembuka yang berlebihan.
`,
});

const explainConceptFlow = ai.defineFlow(
  {
    name: 'explainConceptFlow',
    inputSchema: ExplainConceptInputSchema,
    outputSchema: ExplainConceptOutputSchema,
  },
  async input => {
    const {output} = await explainConceptPrompt(input);
    return output!;
  }
);
