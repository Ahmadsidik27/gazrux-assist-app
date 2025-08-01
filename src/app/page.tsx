'use client';

import { useState, useTransition, Fragment } from 'react';
import Image from 'next/image';
import type { AnalyzeIssueOutput } from '@/ai/flows/analyze-issue';
import { analyzeIssue, suggestTests, explainConcept, findManual } from './actions';
import type { ExplainConceptOutput } from '@/ai/flows/explain-concept';
import type { FindManualOutput } from '@/ai/flows/find-manual';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Wrench, BookOpen, Search, AlertCircle, Loader2, HelpCircle, FileType, FileSearch, Link as LinkIcon, HardDrive, Gem } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


type TestSuggestionsState = { [cause: string]: { loading: boolean; data: string | null; error: string | null } };

// Helper function to detect if content contains Google Drive links and format them
const renderDriveLinks = (content: string) => {
    // Basic check for Google Drive link pattern from the tool
    if (content.includes("https://drive.google.com/file/d/")) {
        const lines = content.split('\n');
        return (
            <ul className="list-none space-y-2">
                {lines.map((line, index) => {
                    const match = line.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        const title = match[1];
                        const url = match[2];
                        return (
                             <li key={index} className="flex items-start gap-2">
                                <FileType className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {title}
                                </a>
                            </li>
                        )
                    }
                    return null; // Ignore lines that are not drive links
                }).filter(Boolean)}
            </ul>
        )
    }
    return null;
}

function MarkdownContent({ content }: { content: string }) {
  // Try to render as a drive link list first
  const driveLinks = renderDriveLinks(content);
  if (driveLinks) {
      return driveLinks;
  }

  // A more robust regex to handle various Markdown elements gracefully.
  const parts = content.split(/(\n\n|`{3}[\s\S]*?`{3}|!\[.*?\]\(.*?\)|\|-+\|)/g).filter(Boolean);

  let tableRows: string[][] = [];

  const renderTable = () => {
    if (tableRows.length < 2) return null;
    const header = tableRows[0];
    const body = tableRows.slice(1);
    const renderedTable = (
      <div className="my-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {header.map((head, i) => <TableHead key={i}>{head}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {body.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
    tableRows = [];
    return renderedTable;
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {parts.map((part, index) => {
        // Handle images
        if (part.startsWith('![')) {
          const imageMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
          if (imageMatch) {
            const alt = imageMatch[1];
            const src = imageMatch[2];
            return (
              <div key={index} className="my-4 flex justify-center">
                <Image
                  src={src}
                  alt={alt}
                  width={400}
                  height={300}
                  className="rounded-lg border shadow-sm"
                  data-ai-hint={alt.toLowerCase().split(' ').slice(0, 2).join(' ')}
                />
              </div>
            );
          }
        }
        
        // Handle code blocks
        if (part.startsWith('```')) {
            return (
                <pre key={index} className="bg-muted p-3 rounded-md overflow-x-auto">
                    <code>{part.replace(/```/g, '')}</code>
                </pre>
            );
        }

        // Handle tables
        if (part.includes('|')) {
          const rows = part.split('\n').filter(row => row.trim().startsWith('|') && row.trim().endsWith('|'));
          rows.forEach(row => {
            const cells = row.split('|').map(cell => cell.trim()).slice(1, -1);
            if (cells.length > 0 && !/^-+$/.test(cells[0])) { // Ignore separator line
              tableRows.push(cells);
            }
          });
          // If this is the last part or the next part isn't a table part, render the table
          const nextPartIsTable = index + 1 < parts.length && parts[index+1].includes('|');
          if (!nextPartIsTable && tableRows.length > 0) {
            return <Fragment key={index}>{renderTable()}</Fragment>;
          }
          return null;
        }

        // Handle lists and paragraphs
        const listItems = part.trim().split('\n').map(line => line.trim());
        if (listItems.every(item => item.startsWith('- ') || item.startsWith('* ') || /^\d+\.\s/.test(item))) {
            return (
                <ul key={index} className="list-disc pl-5 space-y-1">
                    {listItems.map((item, i) => <li key={i}>{item.replace(/(- |\* |^\d+\.\s)/, '')}</li>)}
                </ul>
            );
        }
        
        // Default to paragraph
        return part.trim() && <p key={index}>{part.trim()}</p>;
      })}
    </div>
  );
}

const GazruxLogo = () => (
    <Image
      src="/logo.png"
      alt="Gazrux Logo"
      width={40}
      height={40}
      className="rounded-md"
    />
);

export default function Home() {
  const { toast } = useToast();
  const [isAnalyzing, startAnalysisTransition] = useTransition();
  const [isSuggesting, startSuggestionTransition] = useTransition();
  const [isExplaining, startExplanationTransition] = useTransition();
  const [isFinding, startFindingTransition] = useTransition();

  const [activeTab, setActiveTab] = useState('diagnose');
  const [issueDescription, setIssueDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalyzeIssueOutput | null>(null);
  const [testSuggestions, setTestSuggestions] = useState<TestSuggestionsState>({});
  
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeResult, setKnowledgeResult] = useState<ExplainConceptOutput | null>(null);

  const [manualQuery, setManualQuery] = useState('');
  const [manualResult, setManualResult] = useState<FindManualOutput | null>(null);

  const clearState = (tab: string) => {
    if(tab !== 'diagnose') {
      setAnalysis(null);
      setTestSuggestions({});
    }
    if (tab !== 'knowledge') {
      setKnowledgeResult(null);
    }
    if(tab !== 'manuals') {
      setManualResult(null);
    }
  }
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    clearState(value);
  }

  const handleDiagnose = async () => {
    if (issueDescription.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Kesalahan Input',
        description: 'Harap berikan deskripsi yang lebih detail (minimal 10 karakter).',
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
          title: 'Analisis Gagal',
          description: e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.',
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
          title: 'Tidak dapat memperoleh saran',
          description: errorMsg,
        });
      }
    });
  };

  const handleExplainConcept = async () => {
    if (knowledgeQuery.trim().length < 2) {
      toast({
        variant: 'destructive',
        title: 'Kesalahan Input',
        description: 'Harap masukkan topik yang ingin Anda ketahui.',
      });
      return;
    }
    startExplanationTransition(async () => {
      setKnowledgeResult(null);
      try {
        const result = await explainConcept(knowledgeQuery);
        setKnowledgeResult(result);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Penjelasan Gagal',
          description: e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.',
        });
      }
    });
  };

  const handleFindManual = async () => {
    if (manualQuery.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Kesalahan Input',
        description: 'Harap berikan kueri pencarian yang lebih spesifik.',
      });
      return;
    }

    startFindingTransition(async () => {
      setManualResult(null);
      try {
        const result = await findManual(manualQuery);
        setManualResult(result);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Pencarian Manual Gagal',
          description: e instanceof Error ? e.message : 'Terjadi kesalahan yang tidak diketahui.',
        });
      }
    });
  };

  const renderSkeleton = () => (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <GazruxLogo />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Gazrux Assist</h1>
                <p className="text-sm text-muted-foreground">Partner AI Anda di garasi</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <CardHeader>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="diagnose"><Wrench className="w-4 h-4 mr-2"/>Diagnosis</TabsTrigger>
                        <TabsTrigger value="manuals"><FileSearch className="w-4 h-4 mr-2"/>Workshop Manual</TabsTrigger>
                        <TabsTrigger value="knowledge"><BookOpen className="w-4 h-4 mr-2"/>Pusat Pengetahuan</TabsTrigger>
                    </TabsList>
                </CardHeader>

                <CardContent>
                    {/* Diagnosis Tab */}
                    <TabsContent value="diagnose">
                         <CardDescription className="mb-4 text-center">Jelaskan masalah kendaraan untuk mendapatkan analisis dan kemungkinan penyebab.</CardDescription>
                         <div className="grid w-full gap-2">
                            <Textarea
                                placeholder="contoh: 'Honda Civic 2015. Bunyi klik saat start, tapi mesin tidak mau berputar. Lampu dasbor menyala...'"
                                rows={5}
                                value={issueDescription}
                                onChange={(e) => setIssueDescription(e.target.value)}
                                disabled={isAnalyzing}
                                className="text-base"
                            />
                            <Button onClick={handleDiagnose} disabled={isAnalyzing || !issueDescription} size="lg">
                                {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isAnalyzing ? 'Menganalisis...' : 'Diagnosis Masalah'}
                            </Button>
                        </div>
                    </TabsContent>
                    
                    {/* Manuals Tab */}
                    <TabsContent value="manuals">
                      <CardDescription className="mb-4 text-center">
                        Cari manual bengkel, TSB, atau panduan perbaikan.
                      </CardDescription>
                      <div className="flex flex-col h-full justify-between gap-2">
                        <Input
                          placeholder="contoh: 'manual perbaikan Toyota Avanza'"
                          value={manualQuery}
                          onChange={(e) => setManualQuery(e.target.value)}
                          disabled={isFinding}
                          className="text-base"
                        />
                        <Button onClick={handleFindManual} disabled={isFinding || !manualQuery} size="lg">
                          {isFinding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Cari Manual
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Knowledge Tab */}
                    <TabsContent value="knowledge">
                        <CardDescription className="mb-4 text-center">Punya pertanyaan tentang teknologi atau istilah otomotif?</CardDescription>
                        <div className="flex flex-col h-full justify-between gap-2">
                          <Input
                            placeholder="contoh: 'Apa itu ADAS?'"
                            value={knowledgeQuery}
                            onChange={(e) => setKnowledgeQuery(e.target.value)}
                            disabled={isExplaining}
                            className="text-base"
                          />
                          <Button onClick={handleExplainConcept} disabled={isExplaining || !knowledgeQuery} size="lg">
                            {isExplaining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Jelaskan Konsep
                          </Button>
                        </div>
                    </TabsContent>
                </CardContent>
            </Tabs>
          </Card>

           {/* --- Universal Results Area --- */}
           <div className="mt-8">
            {(isAnalyzing || isExplaining || isFinding) && renderSkeleton()}

            {knowledgeResult && !isExplaining && activeTab === 'knowledge' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" /> Penjelasan untuk: "{knowledgeQuery}"
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownContent content={knowledgeResult.explanation} />
                </CardContent>
              </Card>
            )}

            {manualResult && !isFinding && activeTab === 'manuals' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="w-6 h-6 text-primary" /> Hasil Pencarian untuk: "{manualQuery}"
                  </CardTitle>
                   {manualResult.results.length > 0 && (
                        <CardDescription>
                            Menampilkan {manualResult.results.length} hasil yang paling relevan.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {manualResult.results.length === 0 ? (
                      <div className="text-center py-10">
                        <FileSearch className="w-12 h-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Kueri Tidak Ditemukan</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Kami tidak dapat menemukan dokumen apa pun yang cocok dengan pencarian Anda.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Tips: Coba periksa ejaan Anda atau gunakan kata kunci yang berbeda.
                        </p>
                      </div>
                  ) : (
                    manualResult.results.map((result, index) => (
                      <a 
                        key={index}
                        href={result.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                            {result.source === 'Google Drive' ? <HardDrive className="w-5 h-5 mt-1 text-primary"/> : <LinkIcon className="w-5 h-5 mt-1 text-primary"/>}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-base text-primary hover:underline">{result.title}</p>
                                  {result.isPdf && <Badge variant="destructive">PDF</Badge>}
                                  <Badge variant="secondary">{result.source}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                            </div>
                        </div>
                      </a>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {analysis && !isAnalyzing && activeTab === 'diagnose' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wrench className="w-6 h-6 text-primary" /> Hasil Diagnosis</CardTitle>
                  <CardDescription>Berdasarkan deskripsi Anda, berikut adalah kemungkinan penyebab dan pertanyaan klarifikasi.</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis.clarificationQuestions && analysis.clarificationQuestions.length > 0 && (
                     <Alert className="mb-4">
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>Pertanyaan Klarifikasi</AlertTitle>
                      <AlertDescription>
                         <ul className="list-disc list-inside space-y-2 mt-2">
                            {analysis.clarificationQuestions.map((q, i) => <li key={i}>{q}</li>)}
                         </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Accordion type="multiple" defaultValue={['causes']} className="w-full">
                    {analysis.possibleCauses.length > 0 && (
                    <AccordionItem value="causes">
                      <AccordionTrigger className="text-lg font-semibold">Kemungkinan Penyebab</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        {analysis.possibleCauses.map((causeInfo, i) => (
                          <div key={i} className="p-4 border rounded-lg bg-card shadow-sm">
                            <p className="font-semibold text-base">{causeInfo.cause}</p>
                            <div className="mt-2 text-sm text-muted-foreground">
                              <MarkdownContent content={causeInfo.details} />
                            </div>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => handleSuggestTests(causeInfo.cause)}
                              disabled={testSuggestions[causeInfo.cause]?.loading || isSuggesting}
                            >
                               {(testSuggestions[causeInfo.cause]?.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Sarankan Tes & Prosedur
                            </Button>

                            {testSuggestions[causeInfo.cause]?.loading && <Skeleton className="h-20 w-full mt-2" />}
                            
                            {testSuggestions[causeInfo.cause]?.error && (
                              <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Kesalahan</AlertTitle>
                                <AlertDescription>{testSuggestions[causeInfo.cause]?.error}</AlertDescription>
                              </Alert>
                            )}
                            
                            {testSuggestions[causeInfo.cause]?.data && (
                              <div className="mt-4 pl-4 border-l-4 border-primary/50 space-y-2">
                                <h4 className="font-semibold">Tes yang Disarankan:</h4>
                                <ul className="list-none space-y-2">
                                  {testSuggestions[causeInfo.cause]!.data!.split('\n').filter(line => line.trim()).map((test, testIndex) => (
                                    <li key={testIndex}>
                                      <p className="text-sm">{test.replace(/^\d+\.\s*/, '')}</p>

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
                  </Accordion>
                </CardContent>
              </Card>
            )}
           </div>
        </div>
      </main>
    </div>
  );
}
