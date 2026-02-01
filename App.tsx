
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Layout, CheckCircle, Loader2, PlayCircle, Eye, Trash2, 
  ChevronLeft, ChevronRight, Share2, Sparkles, 
  Lock, Settings, X, Save, History, Clock, Home, ArrowLeft, RefreshCcw, Image as ImageIcon, ExternalLink, AlertTriangle
} from 'lucide-react';
import { Slide, Presentation, SiteSettings } from './types';
import { extractTextFromDocx, extractTextFromXlsx } from './lib/fileParsers';
import { generatePresentationData } from './services/geminiService';
import { SlidePreview } from './components/SlidePreview';
import { supabase } from './lib/supabaseClient';

const DEFAULT_SETTINGS: SiteSettings = {
  hero_badge: "Yangi avlod prezentatsiya generatori",
  hero_title_part1: "Fayllaringizni",
  hero_title_gradient: "Jonli Slaydlarga",
  hero_subtitle: "Word yoki Excel faylini yuklang. Bizning sun'iy intellektimiz uning mazmunini o'qib, mavzuga mos rasmlar va professional slaydlar to'plamini tayyorlab beradi.",
  upload_box_title: "Faylni shu yerga tashlang",
  upload_box_desc: "Word yoki Excel fayllari (max 20MB)",
  footer_brand_name: "AI Taqdimot Master",
  hero_image_url: "",
  logo_url: "",
  bg_image_url: ""
};

// Fixed App component to ensure it returns valid JSX and has a default export
const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (data && !error) setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (err) {
      console.warn("Supabase settings error, using defaults.");
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && !error) setHistory(data);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const saveToHistory = async (pres: Presentation, fileName: string) => {
    try {
      await supabase.from('presentations').insert([
        { title: pres.title, data: pres, file_name: fileName }
      ]);
      fetchHistory();
    } catch (err) {
      console.error("Save to history error:", err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setPresentation(null);
    setStatus('Fayl mazmuni o\'qilmoqda...');

    try {
      let content = '';
      if (uploadedFile.name.endsWith('.docx')) {
        content = await extractTextFromDocx(uploadedFile);
      } else if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
        content = await extractTextFromXlsx(uploadedFile);
      } else {
        throw new Error('Faqat Word (.docx) yoki Excel (.xlsx) fayllari qo\'llab-quvvatlanadi.');
      }

      if (!content.trim()) throw new Error('Fayl ichida matn topilmadi.');

      setStatus('AI mazmunni tahlil qilib, rasmlar tanlamoqda...');
      const genPresentation = await generatePresentationData(content, uploadedFile.name);
      setPresentation(genPresentation);
      setStatus('Taqdimot tayyor!');
      
      await saveToHistory(genPresentation, uploadedFile.name);
      
    } catch (error: any) {
      alert(error.message || 'Xatolik yuz berdi');
      setStatus('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tight">{settings.footer_brand_name}</span>
          </div>
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <History size={18} />
            <span className="text-sm font-bold">Tarix</span>
          </button>
        </div>
      </header>

      <main className="pt-20">
        {!presentation ? (
          <div className="max-w-5xl mx-auto px-6 py-20 lg:py-32 text-center">
            <div className="space-y-8 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles size={14} />
                <span className="text-xs font-black uppercase tracking-widest">{settings.hero_badge}</span>
              </div>
              <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-[1.1]">
                {settings.hero_title_part1} <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  {settings.hero_title_gradient}
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {settings.hero_subtitle}
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative aspect-[16/9] bg-slate-900 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-6 group-hover:border-indigo-500/50 transition-all">
                  {loading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-indigo-500" size={48} />
                      <p className="text-indigo-300 font-bold animate-pulse">{status}</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <Upload className="text-indigo-400" size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{settings.upload_box_title}</h3>
                        <p className="text-slate-500">{settings.upload_box_desc}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".docx,.xlsx,.xls"
              />
            </div>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setPresentation(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold"
              >
                <ArrowLeft size={20} />
                Yangi yuklash
              </button>
              <h2 className="text-2xl font-black">{presentation.title}</h2>
              <div className="flex items-center gap-3">
                <button className="px-6 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">
                  Eksport
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-9">
                <SlidePreview slide={presentation.slides[activeSlide]} index={activeSlide} />
              </div>
              <div className="lg:col-span-3 space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                {presentation.slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSlide(i)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${
                      activeSlide === i 
                        ? 'bg-indigo-600 border-indigo-400 shadow-lg' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-widest font-black opacity-50 mb-1">Slide {i + 1}</span>
                    <span className="font-bold truncate block">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-12 flex justify-center items-center gap-8">
              <button 
                disabled={activeSlide === 0}
                onClick={() => setActiveSlide(prev => prev - 1)}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-20 border border-white/10"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-xl font-black text-slate-500">
                <span className="text-white">{activeSlide + 1}</span> / {presentation.slides.length}
              </span>
              <button 
                disabled={activeSlide === presentation.slides.length - 1}
                onClick={() => setActiveSlide(prev => prev + 1)}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-20 border border-white/10"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}
      </main>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border-l border-white/10 h-full flex flex-col p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black">Tarix</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setPresentation(item.data);
                    setActiveSlide(0);
                    setIsHistoryOpen(false);
                  }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all"
                >
                  <h4 className="font-bold mb-2">{item.title}</h4>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
