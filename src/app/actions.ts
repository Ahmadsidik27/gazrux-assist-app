'use server';

import { analyzeIssue as analyzeIssueFlow } from '@/ai/flows/analyze-issue';
import { suggestTests as suggestTestsFlow } from '@/ai/flows/suggest-tests';
import { explainConcept as explainConceptFlow } from '@/ai/flows/explain-concept';
import { findManual as findManualFlow } from '@/ai/flows/find-manual';

// Helper function to check for required environment variables
const checkEnvVars = (requiredVars: string[]) => {
    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        throw new Error(`Kesalahan Konfigurasi: Variabel lingkungan berikut tidak diatur di file .env Anda: ${missingVars.join(', ')}. Silakan merujuk ke README.md untuk instruksi.`);
    }
}

export async function analyzeIssue(issueDescription: string) {
  checkEnvVars(['SERPAPI_API_KEY', 'DRIVE_FOLDER_ID', 'GOOGLE_APPLICATION_CREDENTIALS_JSON']);
  if (!issueDescription || issueDescription.trim().length < 10) {
    throw new Error('Harap berikan deskripsi masalah yang lebih detail.');
  }
  try {
    const result = await analyzeIssueFlow({ issueDescription });
    return result;
  } catch (error) {
    console.error('Error in analyzeIssue action:', error);
    if (error instanceof Error && error.message.startsWith('Kesalahan Konfigurasi')) {
        throw error;
    }
    throw new Error('Gagal berkomunikasi dengan layanan AI. Silakan periksa konfigurasi kunci API Anda dan coba lagi nanti.');
  }
}

export async function suggestTests(issueDescription: string, potentialCause: string) {
    if (!issueDescription || !potentialCause) {
        throw new Error('Informasi yang diperlukan untuk menyarankan tes tidak lengkap.');
    }
    try {
        const result = await suggestTestsFlow({
            issueDescription,
            potentialCauses: potentialCause,
        });
        return result;
    } catch (error) {
        console.error('Error in suggestTests action:', error);
        throw new Error('Gagal berkomunikasi dengan layanan AI. Silakan periksa konfigurasi kunci API Anda dan coba lagi nanti.');
    }
}

export async function explainConcept(topic: string) {
  checkEnvVars(['SERPAPI_API_KEY', 'DRIVE_FOLDER_ID', 'GOOGLE_APPLICATION_CREDENTIALS_JSON']);
  if (!topic || topic.trim().length < 2) {
    throw new Error('Harap berikan topik yang valid untuk dijelaskan.');
  }
  try {
    const result = await explainConceptFlow({ topic });
    return result;
  } catch (error) {
    console.error('Error in explainConcept action:', error);
     if (error instanceof Error && error.message.startsWith('Kesalahan Konfigurasi')) {
        throw error;
    }
    throw new Error('Gagal berkomunikasi dengan layanan AI. Silakan periksa konfigurasi kunci API Anda dan coba lagi nanti.');
  }
}

export async function findManual(query: string) {
  checkEnvVars(['SERPAPI_API_KEY', 'DRIVE_FOLDER_ID', 'GOOGLE_APPLICATION_CREDENTIALS_JSON']);
  if (!query || query.trim().length < 3) {
    throw new Error('Harap berikan kueri pencarian yang lebih spesifik.');
  }
  try {
    const result = await findManualFlow({ query });
    return result;
  } catch (error) {
    console.error('Error in findManual action:', error);
     if (error instanceof Error && error.message.startsWith('Kesalahan Konfigurasi')) {
        throw error;
    }
    throw new Error('Gagal berkomunikasi dengan layanan AI. Silakan periksa konfigurasi kunci API Anda dan coba lagi nanti.');
  }
}
