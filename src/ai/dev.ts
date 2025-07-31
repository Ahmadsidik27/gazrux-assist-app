import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-issue.ts';
import '@/ai/flows/suggest-tests.ts';