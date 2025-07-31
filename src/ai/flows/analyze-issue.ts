'use server';

/**
 * @fileOverview Analyzes a vehicle issue described by a mechanic and suggests potential causes.
 *
 * - analyzeIssue - A function that takes a description of a vehicle issue and returns a list of potential causes.
 * - AnalyzeIssueInput - The input type for the analyzeIssue function.
 * - AnalyzeIssueOutput - The return type for the analyzeIssue function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleSearch} from '../tools/google-search';

const AnalyzeIssueInputSchema = z.object({
  issueDescription: z.string().describe('The description of the vehicle issue provided by the mechanic.'),
});
export type AnalyzeIssueInput = z.infer<typeof AnalyzeIssueInputSchema>;

const AnalyzeIssueOutputSchema = z.object({
  possibleCauses: z.array(
    z.string().describe('A potential cause of the described vehicle issue.')
  ).describe('A list of potential causes for the described vehicle issue, ordered by probability.'),
  clarificationQuestions: z.array(
    z.string().describe('A question to ask the mechanic to clarify the issue.')
  ).optional().describe('A list of questions to ask the mechanic to clarify the issue, if the provided information is insufficient.'),
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
  prompt: `You are an AI assistant helping mechanics diagnose vehicle issues.

The mechanic has described the following issue: {{{issueDescription}}}

Based on this description, provide a list of possible causes for the issue, ordered by probability (most likely first). Use the googleSearch tool to look up information about the vehicle and issue to provide a more accurate diagnosis. If the description is vague or unclear, provide a list of questions to ask the mechanic in order to clarify the issue. The questions should be specific and relevant to narrowing down the possible causes.

Output the possible causes and clarification questions (if any) in a JSON format.
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
