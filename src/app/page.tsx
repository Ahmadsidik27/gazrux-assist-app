'use client';

import { useState, useTransition, Fragment } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  'periksa tekanan bahan bakar': {
    title: 'Prosedur: Periksa Tekanan Bahan Bakar',
    image: { src: 'https://placehold.co/400x300', hint: 'diagram sistem bahan bakar' },
    steps: [
      "Sambungkan pengukur tekanan bahan bakar ke port servis rel bahan bakar.",
      "Putar kunci kontak ke posisi 'ON' tanpa menyalakan mesin.",
      "Catat pembacaan tekanan.",
      "Nyalakan mesin dan catat tekanan saat idle."
    ],
    specs: "Tekanan yang diharapkan: 40-60 PSI (tergantung model)."
  },
  'periksa busi': {
    title: 'Prosedur: Periksa Busi',
    image: { src: 'https://placehold.co/400x300', hint: 'busi mesin' },
    steps: [
      "Lepaskan terminal negatif baterai.",
      "Lepaskan koil pengapian atau kabel busi.",
      "Gunakan kunci busi, lepaskan setiap busi dengan hati-hati.",
      "Periksa elektroda dari keausan, endapan, atau kerusakan."
    ],
    specs: "Periksa manual untuk celah busi yang benar. Ganti jika perlu."
  },
  'pindai obd-ii untuk kode': {
    title: 'Prosedur: Pindai OBD-II untuk Kode',
    image: { src: 'https://placehold.co/400x300', hint: 'port pemindai obd2' },
    steps: [
      "Temukan port OBD-II, biasanya di bawah dasbor di sisi pengemudi.",
      "Sambungkan pemindai OBD-II.",
      "Putar kunci kontak ke posisi 'ON'.",
      "Ikuti instruksi pemindai untuk membaca Kode Masalah Diagnostik (DTC)."
    ],
    specs: "Catat semua kode aktif atau yang tertunda untuk diagnosis lebih lanjut."
  },
};

const findRepairGuide = (testName: string): RepairGuide | null => {
  const lowerTestName = testName.toLowerCase();
  const foundKey = Object.keys(repairGuides).find(key => lowerTestName.includes(key));
  return foundKey ? repairGuides[foundKey] : null;
};

function MarkdownContent({ content }: { content: string }) {
  const parts = content.split(/(!\[.*?\]\(.*?\)|\|.*?\|)/g).filter(Boolean);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {parts.map((part, index) => {
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
                data-ai-hint={alt.toLowerCase()}
              />
            </div>
          );
        }
        
        const tableMatch = part.match(/\|(.*?)\|/);
        if (tableMatch) {
          const rows = content.split('\n').map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell));
          if (rows.length < 2) return <p key={index}>{part}</p>;
          const header = rows[0];
          const body = rows.slice(2); 

          return (
             <div key={index} className="my-4 overflow-x-auto">
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
        }

        return <p key={index}>{part}</p>
      })}
    </div>
  );
}

function RepairGuideDialog({ open, onOpenChange, testName }: { open: boolean; onOpenChange: (open: boolean) => void; testName: string | null }) {
  if (!testName) return null;

  const guide = findRepairGuide(testName);

  if (!guide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Panduan Perbaikan Tidak Tersedia</DialogTitle>
            <DialogDescription>
              Panduan langkah demi langkah yang terperinci untuk &quot;{testName}&quot; tidak tersedia di manual simulasi kami.
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
          <DialogDescription>Ikuti langkah-langkah ini dengan cermat. Lihat manual bengkel resmi untuk spesifikasi terperinci.</DialogDescription>
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
            <h4 className="font-semibold mb-2">Langkah-langkah:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {guide.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Spesifikasi:</h4>
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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">AutoAssist AI</h1>
                <p className="text-sm text-muted-foreground">Partner AI Anda di garasi</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative w-48 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari manual (simulasi)" className="pl-9" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="beginner-mode" className="text-sm font-medium">Mode Pemula</Label>
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
              <CardTitle className="flex items-center gap-2"><Wrench className="w-6 h-6 text-primary"/> Jelaskan Masalah Kendaraan</CardTitle>
              <CardDescription>Masukkan semua gejala, suara aneh, atau kode kesalahan yang Anda miliki. Semakin detail, semakin baik diagnosisnya.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-2">
                <Textarea
                  placeholder="contoh: 'Mobilnya adalah Honda Civic 2015. Terdengar bunyi klik saat mencoba menyalakan, tetapi mesin tidak mau berputar. Lampu dasbor menyala.'"
                  rows={5}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  disabled={isAnalyzing}
                />
                <Button onClick={handleDiagnose} disabled={isAnalyzing || !issueDescription}>
                  {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isAnalyzing ? 'Menganalisis...' : 'Diagnosis Masalah'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {isAnalyzing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="w-6 h-6 text-primary" />Diagnosis AI Sedang Berlangsung</CardTitle>
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
                <CardTitle className="flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Hasil Diagnosis</CardTitle>
                <CardDescription>Berdasarkan deskripsi Anda, berikut adalah kemungkinan penyebab dan beberapa pertanyaan klarifikasi.</CardDescription>
              </CardHeader>
              <CardContent>
                {isBeginnerMode && (
                  <Alert className="mb-4 bg-primary/10 border-primary/20">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Tips untuk Pemula</AlertTitle>
                    <AlertDescription>Ini hanyalah kemungkinan penyebab. Menjalankan tes yang disarankan sangat penting untuk memastikan masalah sebenarnya.</AlertDescription>
                  </Alert>
                )}
                <Accordion type="multiple" defaultValue={['causes']} className="w-full">
                  {analysis.possibleCauses.length > 0 && (
                  <AccordionItem value="causes">
                    <AccordionTrigger className="text-base font-semibold">Kemungkinan Penyebab</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {analysis.possibleCauses.map((causeInfo, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-background">
                          <p className="font-medium">{causeInfo.cause}</p>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <MarkdownContent content={causeInfo.details} />
                          </div>
                          <Button 
                            variant="secondary"
                            size="sm"
                            className="mt-2"
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
                            <div className="mt-4 pl-4 border-l-2 border-primary/50 space-y-2">
                              <h4 className="font-semibold text-sm">Tes yang Disarankan:</h4>
                              <ul className="list-none space-y-2">
                                {testSuggestions[causeInfo.cause]!.data!.split('\n').filter(line => line.trim()).map((test, testIndex) => (
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
                      <AccordionTrigger className="text-base font-semibold">Pertanyaan Klarifikasi</AccordionTrigger>
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
