'use server';
/**
 * @fileOverview A tool for performing Google searches using SerpApi.
 * 
 * - googleSearch - A Genkit tool that takes a search query and returns search results.
 */

import { ai } from '@/ai/genkit';
import { getJson } from 'serpapi';
import { z } from 'zod';

export const googleSearch = ai.defineTool(
  {
    name: 'googleSearch',
    description: 'Performs a Google search to get information from the web. Use this to find information about vehicle issues, error codes, and repair procedures.',
    inputSchema: z.object({
      query: z.string().describe('The search query.'),
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
  }
);
