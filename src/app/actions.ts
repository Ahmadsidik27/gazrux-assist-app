'use server';

import { analyzeIssue as analyzeIssueFlow } from '@/ai/flows/analyze-issue';
import { suggestTests as suggestTestsFlow } from '@/ai/flows/suggest-tests';

export async function analyzeIssue(issueDescription: string) {
  if (!issueDescription || issueDescription.trim().length < 10) {
    throw new Error('Harap berikan deskripsi masalah yang lebih detail.');
  }
  try {
    const result = await analyzeIssueFlow({ issueDescription });
    return result;
  } catch (error) {
    console.error('Error in analyzeIssue action:', error);
    throw new Error('Gagal berkomunikasi dengan layanan AI. Silakan coba lagi nanti.');
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
        throw new Error('Gagal berkomunikasi dengan layanan AI. Silakan coba lagi nanti.');
    }
}
