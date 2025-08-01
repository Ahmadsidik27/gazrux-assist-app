'use server';
/**
 * @fileOverview Alat untuk melakukan pencarian Google menggunakan SerpApi.
 * 
 * - googleSearch - Alat Genkit yang menerima kueri pencarian dan mengembalikan hasil pencarian.
 */

import { ai } from '@/ai/genkit';
import { getJson } from 'serpapi';
import { z } from 'zod';

export const googleSearch = ai.defineTool(
  {
    name: 'googleSearch',
    description: 'Melakukan pencarian Google untuk mendapatkan informasi dari web. Gunakan ini untuk menemukan informasi tentang masalah kendaraan, kode kesalahan, dan prosedur perbaikan.',
    inputSchema: z.object({
      query: z.string().describe('Kueri pencarian.'),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          title: z.string(),
          link: z.string(),
          snippet: z.string(),
        })
      ),
    }),
  },
  async (input) => {
    try {
        const response = await getJson({
            engine: 'google',
            q: input.query,
            api_key: process.env.SERPAPI_API_KEY,
        });

        const results = response.organic_results?.map((result: any) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
        })) || [];
        
        return { results };
    } catch (error) {
        console.error('Error performing Google search:', error);
        return { results: [] };
    }
  }
);
