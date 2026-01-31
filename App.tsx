
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Layout, Download, FileSpreadsheet, 
  CheckCircle, Loader2, PlayCircle, Eye, Trash2, 
  ChevronLeft, ChevronRight, Share2, Sparkles, 
  Lock, Settings, X, Save, History, Clock, Home, ArrowLeft
} from 'lucide-react';
import { Slide, Presentation, SiteSettings } from './types';
import { extractTextFromDocx, extractTextFromXlsx } from './lib/fileParsers';
import { generatePresentationData } from './services/geminiService';
import { SlidePreview } from './components/SlidePreview';
import { supabase } from './lib/supabaseClient';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const DEFAULT_SETTINGS: SiteSettings = {
  hero_badge: "Yangi avlod prezentatsiya generatori",
  hero_title_part1: "Fayllaringizni",
  hero_title_gradient: "Jonli Slaydlarga",
  hero_subtitle: "Word yoki Excel faylini yuklang. Bizning sun'iy intellektimiz uning mazmunini o'qib, mavzuga mos rasmlar va professional slaydlar to'plamini tayyorlab beradi.",
  upload_box_title: "Faylni shu yerga tashlang",
  upload_box_desc: "Word yoki Excel fayllari (max 20MB)",
  footer_brand_name: "AI Taqdimot Master"
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  
  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Admin Panel states
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // Load settings and history
  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (data && !error) setSettings(data);
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
      fetchHistory(); // Refresh list
    } catch (err) {
      console.error("Save to history error:", err);
    }
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Ushbu taqdimotni tarixdan o'chirmoqchimisiz?")) return;
    try {
      await supabase.from('presentations').delete().eq('id', id);
      fetchHistory();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const loadFromHistory = (item: any) => {
    setPresentation(item.data);
    setActiveSlide(0);
    setIsHistoryOpen(false);
    setStatus('Tarixdan yuklandi');
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
      
      // Save to history automatically
      await saveToHistory(genPresentation, uploadedFile.name);
      
    } catch (error: any) {
      alert(`Xatolik: ${error.message}`);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.user === 'shohruz' && loginForm.pass === 'shohruz') {
      setIsAuthenticated(true);
      setIsLoginOpen(false);
      setIsAdminOpen(true);
    } else {
      alert('Login yoki parol noto\'g\'ri!');
    }
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      const { error } = await supabase.from('site_settings').upsert({ id: 1, ...settings });
      if (error) throw error;
      alert('Sozlamalar saqlandi!');
      setIsAdminOpen(false);
    } catch (err) {
      alert('Xatolik yuz berdi.');
    } finally {
      setSaveLoading(false);
    }
  };

  const exportToPPTX = () => {
    if (!presentation) return;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    presentation.slides.forEach((slide) => {
      const pptSlide = pptx.addSlide();
      pptSlide.background = { color: '1A202C' };
      pptSlide.addText(slide.title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 36, bold: true, color: 'FFFFFF', align: 'left' });
      const contentText = slide.content.join('\n\n');
      pptSlide.addText(contentText, { x: 0.5, y: 1.8, w: '90%', h: 4, fontSize: 20, color: 'CBD5E0', bullet: true, valign: 'top' });
    });
    pptx.writeFile({ fileName: `${presentation.title.replace(/\s+/g, '_')}.pptx` });
  };

  const exportToPDF = async () => {
    if (!presentation || !slideContainerRef.current) return;
    setLoading(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const slides = Array.from(slideContainerRef.current.children);
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i] as HTMLElement;
        const canvas = await html2canvas(slide, { scale: 3, useCORS: true, logging: false, allowTaint: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      }
      pdf.save(`${presentation.title.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    setFile(null);
    setPresentation(null);
    setStatus('');
    setActiveSlide(0);
  };

  const reset = () => {
    if (confirm("Haqiqatan ham ushbu taqdimotni yopib, yangisini boshlamoqchimisiz?")) {
      goHome();
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100">
      {loading && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-indigo-50 z-[100]">
          <div className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-progress w-1/3 shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><History size={20} /></div>
                <h3 className="text-2xl font-black">Yaratilganlar Tarixi</h3>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <Clock size={64} className="mx-auto mb-4" />
                  <p className="text-xl font-bold">Hozircha tarix bo'sh</p>
                </div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadFromHistory(item)}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 truncate">{item.title}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                          {new Date(item.created_at).toLocaleDateString()} • {item.data.slides.length} slayd
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteFromHistory(item.id, e)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black">Admin Kirish</h3>
              <button onClick={() => setIsLoginOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">Login</label>
                <input type="text" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none" placeholder="shohruz" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">Parol</label>
                <input type="password" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                <Lock size={18} /> Kirish
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {isAdminOpen && isAuthenticated && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white pb-4 border-b border-slate-100 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Settings size={20} /></div>
                <h3 className="text-2xl font-black">Saytni tahrirlash</h3>
              </div>
              <button onClick={() => setIsAdminOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Badge Matni', key: 'hero_badge' },
                { label: 'Sarlavha (Oddiy)', key: 'hero_title_part1' },
                { label: 'Sarlavha (Gradient)', key: 'hero_title_gradient' },
                { label: 'Subtitr', key: 'hero_subtitle', type: 'textarea' },
                { label: 'Yuklash box sarlavhasi', key: 'upload_box_title' },
                { label: 'Yuklash box subtitri', key: 'upload_box_desc' },
                { label: 'Brand nomi', key: 'footer_brand_name' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-bold text-slate-500 mb-1">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea value={(settings as any)[field.key]} onChange={e => setSettings({...settings, [field.key]: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200 h-32" />
                  ) : (
                    <input type="text" value={(settings as any)[field.key]} onChange={e => setSettings({...settings, [field.key]: e.target.value})} className="w-full px-5 py-4 rounded-xl border border-slate-200" />
                  )}
                </div>
              ))}
              <button onClick={handleSaveSettings} disabled={saveLoading} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                {saveLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Supabase-ga saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={goHome}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <Sparkles size={28} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">{settings.footer_brand_name}</h1>
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Sifatli tahlil & Dizayn</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Tarix"
            >
              <History size={20} />
            </button>
            
            {!presentation && (
              <button 
                onClick={() => isAuthenticated ? setIsAdminOpen(true) : setIsLoginOpen(true)}
                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Admin Panel"
              >
                <Settings size={20} />
              </button>
            )}
            
            {presentation && (
              <>
                <button 
                  onClick={goHome} 
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-5 py-2.5 rounded-2xl font-black transition-all border border-indigo-100"
                  title="Bosh sahifa"
                >
                  <Home size={18} /> <span className="hidden md:inline">Bosh sahifa</span>
                </button>
                <div className="w-[1px] h-8 bg-slate-200 mx-1 hidden sm:block"></div>
                <button onClick={exportToPPTX} className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-2xl font-bold transition-all shadow-lg">
                  <Download size={18} /> <span className="hidden sm:inline">PPTX</span>
                </button>
                <button onClick={exportToPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold transition-all shadow-lg">
                  <FileText size={18} /> <span className="hidden sm:inline">PDF</span>
                </button>
                <button onClick={reset} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-10">
        {!presentation ? (
          <div className="max-w-4xl mx-auto text-center space-y-16 py-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest mb-4">
                <Sparkles size={14} /> {settings.hero_badge}
              </div>
              <h2 className="text-6xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                {settings.hero_title_part1} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{settings.hero_title_gradient}</span> <br />
                aylantiring
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                {settings.hero_subtitle}
              </p>
            </div>

            <div 
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`
                relative border-4 border-dashed rounded-[3rem] p-24 transition-all cursor-pointer group overflow-hidden
                ${loading ? 'bg-indigo-50 border-indigo-200 pointer-events-none' : 'bg-white border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/20'}
              `}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".docx,.xlsx,.xls" className="hidden" />
              <div className="flex flex-col items-center relative z-10">
                {loading ? (
                  <div className="space-y-8">
                    <div className="relative flex items-center justify-center">
                       <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-ping"></div>
                       <Loader2 className="w-20 h-20 text-indigo-600 animate-spin" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{status}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex -space-x-6 mb-10">
                      <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-blue-600 shadow-2xl shadow-blue-100 ring-1 ring-slate-100 group-hover:-translate-y-4 transition-transform duration-500"><FileText size={48} /></div>
                      <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-2xl shadow-emerald-100 ring-1 ring-slate-100 group-hover:translate-y-4 transition-transform duration-500"><FileSpreadsheet size={48} /></div>
                    </div>
                    <p className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{settings.upload_box_title}</p>
                    <p className="text-slate-400 font-bold text-xl">{settings.upload_box_desc}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-180px)] sticky top-28 backdrop-blur-sm">
                  <div className="p-6 border-b border-slate-100 bg-white/50 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Slaydlar</h3>
                    <div className="px-2 py-1 rounded-md bg-indigo-600 text-[10px] font-black text-white">{presentation.slides.length}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {presentation.slides.map((slide, idx) => (
                      <button key={slide.id} onClick={() => setActiveSlide(idx)}
                        className={`w-full text-left p-4 rounded-[1.5rem] transition-all border-2 ${activeSlide === idx ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-transparent border-transparent hover:bg-white/80 text-slate-400'}`}
                      >
                        <div className="flex items-center gap-4">
                           <span className={`flex-shrink-0 w-10 h-10 rounded-xl text-xs font-black flex items-center justify-center ${activeSlide === idx ? 'bg-indigo-600 text-white rotate-6' : 'bg-slate-200 text-slate-500'}`}>{idx + 1}</span>
                           <p className={`text-sm font-black truncate ${activeSlide === idx ? 'text-slate-900' : 'text-slate-400'}`}>{slide.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Bottom Navigation in Sidebar */}
                  <div className="p-4 border-t border-slate-100 bg-white/50">
                    <button 
                      onClick={goHome}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-slate-900 text-white font-black hover:bg-black transition-all shadow-lg"
                    >
                      <ArrowLeft size={18} /> Bosh sahifaga qaytish
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-9 space-y-10">
                <div className="flex items-end justify-between px-4">
                   <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{presentation.title}</h2>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Slayd: {activeSlide + 1} / {presentation.slides.length}</p>
                   </div>
                   <div className="flex gap-3">
                      <button disabled={activeSlide === 0} onClick={() => setActiveSlide(prev => prev - 1)} className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-800 transition-all disabled:opacity-30"><ChevronLeft size={28} /></button>
                      <button disabled={activeSlide === presentation.slides.length - 1} onClick={() => setActiveSlide(prev => prev + 1)} className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white transition-all disabled:opacity-30"><ChevronRight size={28} /></button>
                   </div>
                </div>
                <div className="bg-slate-100 rounded-[3rem] p-8 shadow-inner ring-1 ring-slate-200">
                  <SlidePreview slide={presentation.slides[activeSlide]} index={activeSlide} />
                </div>
              </div>
            </div>

            <div className="hidden" aria-hidden="true">
              <div ref={slideContainerRef} className="flex flex-col gap-20">
                {presentation.slides.map((s, i) => (
                  <div key={s.id} className="w-[1920px] h-[1080px] shrink-0">
                    <SlidePreview slide={s} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 px-6 border-t border-slate-100 mt-12 bg-white">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><Sparkles size={20} /></div>
             <p className="font-black text-slate-900">{settings.footer_brand_name}</p>
           </div>
           <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} Barcha huquqlar himoyalangan. Sun'iy intellekt tomonidan yaratilgan.</p>
           <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 bg-slate-50 rounded-full hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all">
             <ArrowLeft size={20} className="rotate-90" />
           </button>
        </div>
      </footer>

      <style>{`
        @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .animate-progress { animation: progress 2s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default App;
