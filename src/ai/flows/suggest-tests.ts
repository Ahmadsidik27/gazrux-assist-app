'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting specific tests a mechanic can perform to diagnose a vehicle issue.
 *
 * - suggestTests - A function that suggests tests based on the described issue and potential causes.
 * - SuggestTestsInput - The input type for the suggestTests function.
 * - SuggestTestsOutput - The return type for the suggestTests function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTestsInputSchema = z.object({
  issueDescription: z.string().describe('The mechanic\'s description of the vehicle issue, including symptoms, sounds, and error codes.'),
  potentialCauses: z.string().describe('A list of potential causes for the issue, identified in a previous step.'),
});
export type SuggestTestsInput = z.infer<typeof SuggestTestsInputSchema>;

const SuggestTestsOutputSchema = z.object({
  suggestedTests: z.string().describe('A list of suggested tests the mechanic can perform, such as sensor checks or OBD-II scans.'),
});
export type SuggestTestsOutput = z.infer<typeof SuggestTestsOutputSchema>;

export async function suggestTests(input: SuggestTestsInput): Promise<SuggestTestsOutput> {
  return suggestTestsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTestsPrompt',
  input: {schema: SuggestTestsInputSchema},
  output: {schema: SuggestTestsOutputSchema},
  prompt: `You are an AI assistant helping a mechanic diagnose a vehicle issue.

The mechanic has described the following issue: {{{issueDescription}}}

Based on this description, the following potential causes have been identified:
{{{potentialCauses}}}

Suggest specific tests the mechanic can perform to narrow down the possible causes. Be specific and suggest concrete measurements or checks that can be done. For example, "Check the resistance of sensor X" or "Perform an OBD-II scan and check for error codes related to the fuel system". Focus on tests that can help differentiate between the potential causes listed above. Provide a numbered list of the suggested tests.

Output only the list of suggested tests. Do not include any introductory or concluding remarks.
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
