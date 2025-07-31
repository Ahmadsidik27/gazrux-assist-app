'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import type { AnalyzeIssueOutput } from '@/ai/flows/analyze-issue';
import { analyzeIssue, suggestTests } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Wrench, Lightbulb, Car, FileText, Search, AlertCircle, Loader2, ChevronsRight, Settings, FileCog } from 'lucide-react';

type TestSuggestionsState = { [cause: string]: { loading: boolean; data: string | null; error: string | null } };

type RepairGuide = {
  title: string;
  image: {
    src: string;
    hint: string;
  };
  steps: string[];
  specs: string;
};

const repairGuides: Record<string, RepairGuide> = {
  'check fuel pressure': {
    title: 'Procedure: Check Fuel Pressure',
    image: { src: 'https://placehold.co/400x300', hint: 'fuel system diagram' },
    steps: [
      "Connect fuel pressure gauge to the fuel rail service port.",
      "Turn ignition to 'ON' position without starting the engine.",
      "Record the pressure reading.",
      "Start the engine and record the pressure at idle."
    ],
    specs: "Expected pressure: 40-60 PSI (depending on model)."
  },
  'inspect spark plugs': {
    title: 'Procedure: Inspect Spark Plugs',
    image: { src: 'https://placehold.co/400x300', hint: 'engine spark plug' },
    steps: [
      "Disconnect the negative battery terminal.",
      "Remove ignition coils or spark plug wires.",
      "Using a spark plug socket, carefully remove each spark plug.",
      "Inspect the electrode for wear, deposits, or damage."
    ],
    specs: "Check manual for correct spark plug gap. Replace if necessary."
  },
  'scan obd-ii for codes': {
    title: 'Procedure: Scan OBD-II for Codes',
    image: { src: 'https://placehold.co/400x300', hint: 'obd2 scanner port' },
    steps: [
      "Locate the OBD-II port, usually under the dashboard on the driver's side.",
      "Connect the OBD-II scanner.",
      "Turn the ignition to the 'ON' position.",
      "Follow the scanner's instructions to read Diagnostic Trouble Codes (DTCs)."
    ],
    specs: "Record any active or pending codes for further diagnosis."
  },
};

const findRepairGuide = (testName: string): RepairGuide | null => {
  const lowerTestName = testName.toLowerCase();
  const foundKey = Object.keys(repairGuides).find(key => lowerTestName.includes(key));
  return foundKey ? repairGuides[foundKey] : null;
};

function RepairGuideDialog({ open, onOpenChange, testName }: { open: boolean; onOpenChange: (open: boolean) => void; testName: string | null }) {
  if (!testName) return null;

  const guide = findRepairGuide(testName);

  if (!guide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repair Guide Not Available</DialogTitle>
            <DialogDescription>
              A detailed, step-by-step guide for &quot;{testName}&quot; is not available in our simulated manual.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileCog className="w-5 h-5" /> {guide.title}</DialogTitle>
          <DialogDescription>Follow these steps carefully. Refer to the official workshop manual for detailed specifications.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
            <Image
              src={guide.image.src}
              alt={guide.title}
              width={300}
              height={225}
              className="rounded-lg border shadow-sm"
              data-ai-hint={guide.image.hint}
            />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {guide.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Specifications:</h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{guide.specs}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [isAnalyzing, startAnalysisTransition] = useTransition();
  const [isSuggesting, startSuggestionTransition] = useTransition();

  const [issueDescription, setIssueDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalyzeIssueOutput | null>(null);
  const [testSuggestions, setTestSuggestions] = useState<TestSuggestionsState>({});
  const [isBeginnerMode, setIsBeginnerMode] = useState(false);
  const [dialogTest, setDialogTest] = useState<string | null>(null);

  const handleDiagnose = async () => {
    if (issueDescription.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please provide a more detailed description (at least 10 characters).',
      });
      return;
    }
    
    startAnalysisTransition(async () => {
      setAnalysis(null);
      setTestSuggestions({});
      try {
        const result = await analyzeIssue(issueDescription);
        setAnalysis(result);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: e instanceof Error ? e.message : 'An unknown error occurred.',
        });
      }
    });
  };

  const handleSuggestTests = (cause: string) => {
    startSuggestionTransition(async () => {
      setTestSuggestions(prev => ({ ...prev, [cause]: { loading: true, data: null, error: null } }));
      try {
        const result = await suggestTests(issueDescription, cause);
        setTestSuggestions(prev => ({ ...prev, [cause]: { loading: false, data: result.suggestedTests, error: null } }));
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
        setTestSuggestions(prev => ({ ...prev, [cause]: { loading: false, data: null, error: errorMsg } }));
        toast({
          variant: 'destructive',
          title: 'Could not get suggestions',
          description: errorMsg,
        });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">AutoAssist AI</h1>
                <p className="text-sm text-muted-foreground">Your AI partner in the garage</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative w-48 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search manual (simulated)" className="pl-9" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="beginner-mode" className="text-sm font-medium">Beginner Mode</Label>
                <Switch id="beginner-mode" checked={isBeginnerMode} onCheckedChange={setIsBeginnerMode} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="w-6 h-6 text-primary"/> Describe the Vehicle's Issue</CardTitle>
              <CardDescription>Enter all symptoms, strange sounds, or error codes you have. The more detail, the better the diagnosis.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-2">
                <Textarea
                  placeholder="e.g., 'The car is a 2015 Honda Civic. It makes a clicking sound when trying to start, but the engine won't turn over. The dashboard lights are on.'"
                  rows={5}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  disabled={isAnalyzing}
                />
                <Button onClick={handleDiagnose} disabled={isAnalyzing || !issueDescription}>
                  {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isAnalyzing ? 'Analyzing...' : 'Diagnose Issue'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {isAnalyzing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="w-6 h-6 text-primary" />AI Diagnosis in Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          )}

          {analysis && !isAnalyzing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Diagnosis Results</CardTitle>
                <CardDescription>Based on your description, here are the potential causes and some clarifying questions.</CardDescription>
              </CardHeader>
              <CardContent>
                {isBeginnerMode && (
                  <Alert className="mb-4 bg-primary/10 border-primary/20">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Beginner's Tip</AlertTitle>
                    <AlertDescription>These are just potential causes. Running the suggested tests is crucial to confirm the actual problem.</AlertDescription>
                  </Alert>
                )}
                <Accordion type="multiple" defaultValue={['causes']} className="w-full">
                  {analysis.possibleCauses.length > 0 && (
                  <AccordionItem value="causes">
                    <AccordionTrigger className="text-base font-semibold">Potential Causes</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {analysis.possibleCauses.map((cause, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-background">
                          <p className="font-medium">{cause}</p>
                          <Button 
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleSuggestTests(cause)}
                            disabled={testSuggestions[cause]?.loading || isSuggesting}
                          >
                             {(testSuggestions[cause]?.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Suggest Tests & Procedures
                          </Button>

                          {testSuggestions[cause]?.loading && <Skeleton className="h-20 w-full mt-2" />}
                          
                          {testSuggestions[cause]?.error && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{testSuggestions[cause]?.error}</AlertDescription>
                            </Alert>
                          )}
                          
                          {testSuggestions[cause]?.data && (
                            <div className="mt-4 pl-4 border-l-2 border-primary/50 space-y-2">
                              <h4 className="font-semibold text-sm">Suggested Tests:</h4>
                              <ul className="list-none space-y-2">
                                {testSuggestions[cause]!.data!.split('\n').filter(line => line.trim()).map((test, testIndex) => (
                                  <li key={testIndex}>
                                    <button onClick={() => setDialogTest(test)} className="w-full text-left p-2 rounded-md hover:bg-accent/50 transition-colors flex items-center justify-between group">
                                      <span className="text-sm">{test.replace(/^\d+\.\s*/, '')}</span>
                                      <ChevronsRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                  )}
                  {analysis.clarificationQuestions && analysis.clarificationQuestions.length > 0 && (
                    <AccordionItem value="questions">
                      <AccordionTrigger className="text-base font-semibold">Clarification Questions</AccordionTrigger>
                      <AccordionContent className="pt-2">
                         <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                            {analysis.clarificationQuestions.map((q, i) => <li key={i}>{q}</li>)}
                         </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <RepairGuideDialog open={!!dialogTest} onOpenChange={(isOpen) => !isOpen && setDialogTest(null)} testName={dialogTest} />
    </div>
  );
}
