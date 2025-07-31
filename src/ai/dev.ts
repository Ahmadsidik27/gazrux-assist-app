import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-issue.ts';
import '@/ai/flows/suggest-tests.ts';
import '@/ai/flows/explain-concept.ts';
import '@/ai/flows/find-manual.ts';
import '@/ai/tools/google-search.ts';
import '@/ai/tools/google-drive-search.ts';
