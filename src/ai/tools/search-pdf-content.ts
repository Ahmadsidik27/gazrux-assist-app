'use server';

/**
 * @fileOverview Alat untuk mengunduh file PDF dari Google Drive dan mencari konten teksnya.
 * 
 * - searchPdfContentTool - Alat Genkit yang menerima ID file Google Drive dan kueri pencarian,
 *   lalu mengembalikan cuplikan dari dalam PDF yang cocok dengan kueri.
 */

import { ai } from '@/ai/genkit';
import { google } from 'googleapis';
import { z } from 'zod';
import pdf from 'pdf-parse';
import { Readable } from 'stream';

// Skema untuk output
const PdfSearchResultSchema = z.object({
  snippets: z.array(z.string()).describe("Daftar cuplikan teks dari dalam PDF yang mengandung kata kunci pencarian."),
  matchFound: z.boolean().describe("Benar jika setidaknya satu kecocokan ditemukan di dalam konten file."),
});

async function getAuthenticatedDriveClient() {
  let credentials;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({
    version: 'v3',
    auth: auth,
  });
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export const searchPdfContentTool = ai.defineTool(
  {
    name: 'searchPdfContent',
    description: 'Mencari kata kunci di dalam konten file PDF tertentu yang tersimpan di Google Drive. Gunakan ini untuk memverifikasi apakah sebuah manual atau dokumen benar-benar berisi informasi yang dicari.',
    inputSchema: z.object({
      fileId: z.string().describe('ID file Google Drive yang akan diunduh dan dicari.'),
      query: z.string().describe('Teks atau kata kunci yang akan dicari di dalam konten PDF.'),
    }),
    outputSchema: PdfSearchResultSchema,
  },
  async (input) => {
    try {
      const drive = await getAuthenticatedDriveClient();

      // Unduh file dari Google Drive
      const response = await drive.files.get(
        { fileId: input.fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const fileBuffer = await streamToBuffer(response.data as Readable);
      
      // Parse konten PDF menjadi teks
      const data = await pdf(fileBuffer);
      const content = data.text;
      
      const snippets: string[] = [];
      const queryLower = input.query.toLowerCase();
      const sentences = content.split(/[.!?]/); // Split teks menjadi kalimat-kalimat
      
      let matchFound = false;

      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes(queryLower)) {
            matchFound = true;
            // Ambil cuplikan dengan beberapa konteks di sekitarnya
            const index = sentence.toLowerCase().indexOf(queryLower);
            const start = Math.max(0, index - 50);
            const end = Math.min(sentence.length, index + queryLower.length + 50);
            const snippet = `...${sentence.substring(start, end)}...`;
            
            // Hindari duplikat
            if (!snippets.some(s => s.includes(snippet.substring(5, -5)))) {
                 snippets.push(snippet);
            }
        }
      });

      return {
        matchFound,
        snippets: snippets.slice(0, 5), // Batasi hingga 5 cuplikan agar tidak terlalu panjang
      };

    } catch (error: any) {
      console.error(`Error processing PDF fileId ${input.fileId}:`, error);
      // Jika terjadi error, kembalikan hasil bahwa tidak ada yang cocok
      return { matchFound: false, snippets: [] };
    }
  }
);
