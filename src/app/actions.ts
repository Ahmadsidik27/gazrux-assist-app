'use server';

import { analyzeIssue as analyzeIssueFlow } from '@/ai/flows/analyze-issue';
import { suggestTests as suggestTestsFlow } from '@/ai/flows/suggest-tests';

export async function analyzeIssue(issueDescription: string) {
  if (!issueDescription || issueDescription.trim().length < 10) {
    throw new Error('Please provide a more detailed description of the issue.');
  }
  try {
    const result = await analyzeIssueFlow({ issueDescription });
    return result;
  } catch (error) {
    console.error('Error in analyzeIssue action:', error);
    throw new Error('Failed to communicate with the AI service. Please try again later.');
  }
}

export async function suggestTests(issueDescription: string, potentialCause: string) {
    if (!issueDescription || !potentialCause) {
        throw new Error('Missing required information to suggest tests.');
    }
    try {
        const result = await suggestTestsFlow({
            issueDescription,
            potentialCauses: potentialCause,
        });
        return result;
    } catch (error) {
        console.error('Error in suggestTests action:', error);
        throw new Error('Failed to communicate with the AI service. Please try again later.');
    }
}
