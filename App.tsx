
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Layout, CheckCircle, Loader2, Trash2, 
  ChevronLeft, ChevronRight, Sparkles, 
  Lock, Settings, X, Save, History, Clock, Home, ArrowLeft, RefreshCcw, 
  Image as ImageIcon, Eye, Download, Edit3, BarChart3, Library, LogOut, AlertTriangle, Database
} from 'lucide-react';
import { Slide, Presentation, SiteSettings } from './types';
import { extractTextFromDocx, extractTextFromXlsx } from './lib/fileParsers';
import { generatePresentationData } from './services/geminiService';
import { SlidePreview } from './components/SlidePreview';
import { supabase } from './lib/supabaseClient';
import { exportToPptx, exportToPdf } from './lib/exportUtils';

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

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'library' | 'settings'>('dashboard');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<'pptx' | 'pdf' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await fetchSettings();
    await fetchHistory();
  };

  const fetchSettings = async () => {
    try {
      setDbStatus('checking');
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (error) {
        console.error("Supabase Error:", error);
        setDbStatus('error');
        setDbErrorMessage(error.message);
        // Xatolik bo'lsa ham default settings o'rnatamiz
        setSettings(DEFAULT_SETTINGS);
      } else {
        setDbStatus('connected');
        setDbErrorMessage(null);
        if (data) {
          // Bazadan kelgan ma'lumotlarni default bilan birlashtiramiz
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    } catch (err: any) {
      setDbStatus('error');
      setDbErrorMessage(err.message || "Noma'lum ulanish xatosi");
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setHistory(data);
    } catch (err) {
      console.error("History fetch error:", err);
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
      const { error } = await supabase.from('site_settings').upsert({ 
        id: 1, 
        ...settings,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      alert('Barcha o\'zgarishlar muvaffaqiyatli saqlandi!');
      fetchSettings(); 
    } catch (err: any) {
      console.error(err);
      alert(`Xatolik: ${err.message || 'Supabase-ga ulanib bo\'lmadi'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const saveToHistory = async (pres: Presentation, fileName: string) => {
    try {
      await supabase.from('presentations').insert([
        { title: pres.title, data: pres, file_name: fileName }
      ]);
      fetchHistory();
    } catch (err) {
      console.error("History save error:", err);
    }
  };

  const deleteFromHistory = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Ushbu taqdimotni butunlay o'chirmoqchimisiz?")) return;
    try {
      const { error } = await supabase.from('presentations').delete().eq('id', id);
      if (error) throw error;
      fetchHistory();
    } catch (err) {
      alert("O'chirishda xatolik yuz berdi. Supabase huquqlarini tekshiring.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setPresentation(null);
    setStatus('Fayl mazmuni tahlil qilinmoqda...');

    try {
      let content = '';
      if (uploadedFile.name.endsWith('.docx')) {
        content = await extractTextFromDocx(uploadedFile);
      } else if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
        content = await extractTextFromXlsx(uploadedFile);
      } else {
        throw new Error('Faqat Word (.docx) yoki Excel (.xlsx) fayllari qabul qilinadi.');
      }

      if (!content.trim()) throw new Error('Fayl ichida matn topilmadi.');

      setStatus('AI slaydlar va mos rasmlar yaratmoqda...');
      const genPresentation = await generatePresentationData(content, uploadedFile.name);
      setPresentation(genPresentation);
      setStatus('Taqdimot tayyor!');
      
      await saveToHistory(genPresentation, uploadedFile.name);
      
    } catch (error: any) {
      alert(error.message || 'Xatolik yuz berdi');
      setStatus('Xatolik yuz berdi');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSlide = (updatedSlide: Slide) => {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    newSlides[activeSlide] = updatedSlide;
    setPresentation({ ...presentation, slides: newSlides });
  };

  const handleExportPptx = async () => {
    if (!presentation) return;
    setExportLoading('pptx');
    try {
      await exportToPptx(presentation);
    } catch (error) {
      alert("PPTX yuklab olishda xatolik yuz berdi.");
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportPdf = async () => {
    if (!presentation) return;
    setExportLoading('pdf');
    try {
      await exportToPdf(presentation, 'active-slide-preview');
    } catch (error) {
      alert("PDF yuklab olishda xatolik yuz berdi.");
    } finally {
      setExportLoading(null);
    }
  };

  const goHome = () => {
    setPresentation(null);
    setFile(null);
    setActiveSlide(0);
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFromHistory = (item: any) => {
    setPresentation(item.data);
    setActiveSlide(0);
    setIsAdminOpen(false);
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {settings.bg_image_url && (
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
          <img src={settings.bg_image_url} alt="" className="w-full h-full object-cover blur-[80px]" />
        </div>
      )}

      <header className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={goHome}>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-105 transition-all">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="text-white" size={24} />
              )}
            </div>
            <span className="text-2xl font-black tracking-tighter group-hover:text-indigo-400 transition-colors">{settings.footer_brand_name}</span>
          </div>

          <div className="flex items-center gap-3">
            {dbStatus === 'error' && (
              <div 
                title={dbErrorMessage || "Ulanish xatosi"}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase cursor-help"
              >
                <AlertTriangle size={14} /> DB Xatosi
              </div>
            )}
            <button 
              onClick={() => isAuthenticated ? setIsAdminOpen(true) : setIsLoginOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all border border-white/10 text-white font-black shadow-lg shadow-indigo-600/20"
            >
              <Lock size={18} />
              <span className="hidden md:inline">Admin Panel</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 relative z-10">
        {!presentation ? (
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-32 text-center">
            <div className="space-y-8 mb-20 animate-in fade-in slide-in-from-top-10 duration-1000">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles size={16} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{settings.hero_badge}</span>
              </div>
              <h1 className="text-6xl lg:text-9xl font-black tracking-tighter leading-[0.9]">
                {settings.hero_title_part1} <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  {settings.hero_title_gradient}
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                {settings.hero_subtitle}
              </p>
              
              {settings.hero_image_url && (
                <div className="mt-16 max-w-4xl mx-auto rounded-[3rem] overflow-hidden border-8 border-white/5 shadow-2xl relative group">
                   <div className="absolute inset-0 bg-indigo-500/10 mix-blend-overlay group-hover:opacity-0 transition-opacity"></div>
                   <img src={settings.hero_image_url} alt="Hero" className="w-full h-auto object-cover max-h-[500px]" />
                </div>
              )}
            </div>

            <div className="max-w-3xl mx-auto">
              <div 
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`group relative cursor-pointer overflow-hidden rounded-[3.5rem] p-1 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x"></div>
                <div className="relative bg-slate-900/90 backdrop-blur-3xl rounded-[3.4rem] p-16 lg:p-24 flex flex-col items-center justify-center gap-8 border border-white/10 hover:bg-slate-900/50 transition-all">
                  {loading ? (
                    <div className="flex flex-col items-center gap-6">
                      <Loader2 className="animate-spin text-indigo-400" size={64} />
                      <p className="text-2xl font-black text-indigo-300 animate-pulse">{status}</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-28 h-28 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                        <Upload className="text-indigo-400" size={40} />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-4xl font-black tracking-tight">{settings.upload_box_title}</h3>
                        <p className="text-slate-500 text-lg">{settings.upload_box_desc}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".docx,.xlsx,.xls" />
            </div>
          </div>
        ) : (
          <div className="max-w-[1500px] mx-auto px-6 py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
              <div className="flex items-center gap-6">
                <button onClick={goHome} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-4xl font-black tracking-tight">{presentation.title}</h2>
              </div>
              <div className="flex gap-4">
                 <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-6 py-4 rounded-2xl font-black transition-all flex items-center gap-3 border ${
                    isEditing 
                      ? 'bg-emerald-600 border-emerald-400 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                 >
                   {isEditing ? <CheckCircle size={20} /> : <Edit3 size={20} />}
                   {isEditing ? "Tayyor" : "Tahrirlash"}
                 </button>
                 <button 
                  onClick={handleExportPptx}
                  disabled={!!exportLoading}
                  className="px-8 py-4 bg-indigo-600 rounded-2xl font-black hover:bg-indigo-700 shadow-xl transition-all flex items-center gap-3 disabled:opacity-50"
                 >
                   {exportLoading === 'pptx' ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                   PPTX
                 </button>
                 <button 
                  onClick={handleExportPdf}
                  disabled={!!exportLoading}
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black hover:bg-white/10 transition-all flex items-center gap-3 disabled:opacity-50"
                 >
                   {exportLoading === 'pdf' ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                   PDF
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-9">
                <div id="active-slide-preview" className="w-full shadow-[0_0_100px_rgba(99,102,241,0.2)] rounded-[2.5rem]">
                  <SlidePreview 
                    slide={presentation.slides[activeSlide]} 
                    index={activeSlide} 
                    isEditing={isEditing}
                    onUpdate={handleUpdateSlide}
                  />
                </div>
                <div className="mt-12 flex items-center justify-center gap-10">
                  <button 
                    disabled={activeSlide === 0}
                    onClick={() => setActiveSlide(prev => prev - 1)}
                    className="w-16 h-16 rounded-full bg-white/5 hover:bg-indigo-600 border border-white/10 flex items-center justify-center transition-all disabled:opacity-20"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <div className="text-4xl font-black tabular-nums">
                    {activeSlide + 1} <span className="text-slate-600">/ {presentation.slides.length}</span>
                  </div>
                  <button 
                    disabled={activeSlide === presentation.slides.length - 1}
                    onClick={() => setActiveSlide(prev => prev + 1)}
                    className="w-16 h-16 rounded-full bg-white/5 hover:bg-indigo-600 border border-white/10 flex items-center justify-center transition-all disabled:opacity-20"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                {presentation.slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSlide(i)}
                    className={`w-full p-6 rounded-3xl text-left transition-all border group ${
                      activeSlide === i 
                        ? 'bg-indigo-600 border-indigo-400 shadow-2xl' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className={`block text-[10px] font-black uppercase mb-2 ${activeSlide === i ? 'text-white/60' : 'text-slate-500'}`}>Slayd {i + 1}</span>
                    <span className="font-bold text-sm block truncate group-hover:translate-x-1 transition-transform">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADMIN LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center mb-8 mx-auto shadow-xl shadow-indigo-600/30">
               <Lock className="text-white" size={32} />
            </div>
            <h3 className="text-3xl font-black mb-8 text-center tracking-tight">Admin Kirish</h3>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-2">Login</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={loginForm.user}
                  onChange={e => setLoginForm({...loginForm, user: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-2">Parol</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-950 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={loginForm.pass}
                  onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">Tizimga kirish</button>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="w-full text-slate-500 font-bold hover:text-white transition-colors">Yopish</button>
            </form>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE ADMIN PANEL */}
      {isAdminOpen && isAuthenticated && (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col md:flex-row animate-in slide-in-from-bottom duration-500">
          {/* Sidebar */}
          <div className="w-full md:w-80 bg-slate-900 border-r border-white/5 flex flex-col p-8 gap-8 overflow-y-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Settings className="text-white" size={24} />
              </div>
              <div>
                <h4 className="font-black text-xl tracking-tight">Boshqaruv</h4>
                <p className="text-xs font-bold text-slate-500">ADMIN PANEL</p>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => setAdminTab('dashboard')}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${adminTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <BarChart3 size={20} /> Dashboard
              </button>
              <button 
                onClick={() => setAdminTab('library')}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${adminTab === 'library' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <Library size={20} /> Kutubxona
              </button>
              <button 
                onClick={() => setAdminTab('settings')}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${adminTab === 'settings' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <RefreshCcw size={20} /> Sayt Sozlamalari
              </button>
            </nav>

            <div className="mt-auto space-y-4">
               <div className={`px-6 py-4 rounded-2xl border space-y-2 transition-all ${dbStatus === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5'}`}>
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-500 uppercase">DB Status</p>
                   {dbStatus === 'error' && <AlertTriangle size={12} className="text-red-500" />}
                 </div>
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
                   <span className="text-xs font-bold capitalize">{dbStatus}</span>
                 </div>
                 {dbErrorMessage && (
                   <p className="text-[9px] text-red-400/80 font-medium leading-tight truncate mt-1">{dbErrorMessage}</p>
                 )}
               </div>
               <button onClick={goHome} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm text-slate-400 hover:bg-white/5 transition-all">
                 <Home size={20} /> Asosiyga qaytish
               </button>
               <button onClick={() => { setIsAuthenticated(false); setIsAdminOpen(false); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm text-red-400 hover:bg-red-500/10 transition-all">
                 <LogOut size={20} /> Chiqish
               </button>
            </div>
          </div>

          {/* Main Admin Content */}
          <div className="flex-1 overflow-y-auto bg-slate-950 p-8 lg:p-12 custom-scrollbar">
             <div className="max-w-6xl mx-auto">
               
               {/* TAB: DASHBOARD */}
               {adminTab === 'dashboard' && (
                 <div className="space-y-12 animate-in slide-in-from-right-10 duration-500">
                   <header>
                     <h2 className="text-5xl font-black tracking-tighter mb-4">Salom, Admin!</h2>
                     <p className="text-xl text-slate-400 font-medium">Tizimdagi umumiy holat va statistikalar.</p>
                   </header>

                   {dbStatus === 'error' && (
                     <div className="p-8 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-start gap-6 animate-in zoom-in duration-500">
                        <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
                          <Database className="text-white" size={28} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-red-400">Ma'lumotlar bazasida xatolik!</h4>
                          <p className="text-slate-400 font-medium">Supabase bazasida ba'zi ustunlar yoki jadvallar topilmadi. Iltimos, SQL Editor-ga kerakli kodni joylang.</p>
                          <div className="bg-black/40 p-3 rounded-xl font-mono text-xs text-red-300 border border-red-500/10 mt-4">
                            Xato kodi: {dbErrorMessage || "Noma'lum"}
                          </div>
                        </div>
                     </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="p-10 rounded-[2.5rem] bg-indigo-600/10 border border-indigo-500/20 space-y-6">
                       <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                         <FileText className="text-white" size={32} />
                       </div>
                       <div>
                         <p className="text-5xl font-black">{history.length}</p>
                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Jami Taqdimotlar</p>
                       </div>
                     </div>
                     <div className="p-10 rounded-[2.5rem] bg-emerald-600/10 border border-emerald-500/20 space-y-6">
                       <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                         <CheckCircle className="text-white" size={32} />
                       </div>
                       <div>
                         <p className="text-5xl font-black">{dbStatus === 'connected' ? 'Active' : 'Offline'}</p>
                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Server Holati</p>
                       </div>
                     </div>
                     <div className="p-10 rounded-[2.5rem] bg-amber-600/10 border border-amber-500/20 space-y-6">
                       <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20">
                         <Clock className="text-white" size={32} />
                       </div>
                       <div>
                         <p className="text-5xl font-black">{new Date().toLocaleDateString('uz-UZ')}</p>
                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-2">Sana</p>
                       </div>
                     </div>
                   </div>

                   <div className="p-12 rounded-[3.5rem] bg-white/5 border border-white/5 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full group-hover:bg-indigo-600/10 transition-all"></div>
                     <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Sparkles size={24} className="text-indigo-400" /> Tizim Faoliyati</h3>
                     <ul className="space-y-6">
                       <li className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                         <div className={`w-3 h-3 rounded-full ${dbStatus === 'connected' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-red-500'}`}></div>
                         <p className="text-slate-300 font-bold">Supabase API ulanishi {dbStatus === 'connected' ? 'barqaror' : 'mavjud emas'}.</p>
                       </li>
                       <li className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                         <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                         <p className="text-slate-300 font-bold">Gemini AI (gemini-3-flash-preview) ishchi holatda.</p>
                       </li>
                       <li className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                         <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                         <p className="text-slate-300 font-bold">Avtomatik rasmlar kutubxonasi loremflickr orqali yuklanmoqda.</p>
                       </li>
                     </ul>
                   </div>
                 </div>
               )}

               {/* TAB: LIBRARY */}
               {adminTab === 'library' && (
                 <div className="space-y-12 animate-in slide-in-from-right-10 duration-500">
                   <header className="flex items-center justify-between">
                     <div>
                       <h2 className="text-5xl font-black tracking-tighter mb-4">Tizim Kutubxonasi</h2>
                       <p className="text-xl text-slate-400 font-medium">Barcha yaratilgan taqdimotlar ustidan to'liq nazorat.</p>
                     </div>
                   </header>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {history.length === 0 ? (
                       <div className="col-span-full py-40 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10">
                         <Library size={80} className="mx-auto text-slate-800 mb-8" />
                         <p className="text-2xl font-black text-slate-700">Hozircha hech qanday taqdimot yaratilmagan.</p>
                       </div>
                     ) : (
                       history.map((item) => (
                         <div key={item.id} className="group bg-white/5 border border-white/5 p-8 rounded-[3rem] hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all flex flex-col shadow-lg">
                           <div className="flex justify-between items-start mb-6">
                             <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                               <FileText className="text-indigo-400" size={28} />
                             </div>
                             <button 
                              onClick={(e) => deleteFromHistory(item.id, e)}
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                             >
                               <Trash2 size={20} />
                             </button>
                           </div>
                           <h4 className="text-xl font-black mb-4 line-clamp-2 tracking-tight leading-tight">{item.title}</h4>
                           <div className="mt-auto space-y-6">
                             <div className="flex items-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                               <span className="flex items-center gap-2"><Clock size={14} /> {new Date(item.created_at).toLocaleDateString()}</span>
                               <span className="flex items-center gap-2"><Layout size={14} /> {item.data.slides.length} SLAYD</span>
                             </div>
                             <button 
                               onClick={() => openFromHistory(item)}
                               className="w-full py-5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 border border-indigo-500/20"
                             >
                               <Eye size={20} /> Ko'rish
                             </button>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               )}

               {/* TAB: SETTINGS */}
               {adminTab === 'settings' && (
                 <div className="space-y-12 animate-in slide-in-from-right-10 duration-500">
                   <header className="flex items-center justify-between">
                     <div>
                       <h2 className="text-5xl font-black tracking-tighter mb-4">Sayt Dizayni</h2>
                       <p className="text-xl text-slate-400 font-medium">Asosiy sahifa matnlari va brending sozlamalari.</p>
                     </div>
                     <button 
                        onClick={handleSaveSettings} 
                        disabled={saveLoading}
                        className="px-12 py-6 bg-indigo-600 rounded-[2.5rem] font-black text-xl flex items-center gap-4 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50"
                      >
                        {saveLoading ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />} Saqlash
                      </button>
                   </header>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white/5 p-12 rounded-[4rem] border border-white/5">
                    {[
                      { label: 'Badge (Yuqori matn)', key: 'hero_badge' },
                      { label: 'Sarlavha (Oddiy qism)', key: 'hero_title_part1' },
                      { label: 'Sarlavha (Gradient qism)', key: 'hero_title_gradient' },
                      { label: 'Kichik sarlavha (Subtitr)', key: 'hero_subtitle', type: 'textarea' },
                      { label: 'Yuklash oynasi sarlavhasi', key: 'upload_box_title' },
                      { label: 'Yuklash oynasi izohi', key: 'upload_box_desc' },
                      { label: 'Brand nomi', key: 'footer_brand_name' },
                      { label: 'Logo Rasm URL', key: 'logo_url', type: 'image' },
                      { label: 'Hero Rasm URL', key: 'hero_image_url', type: 'image' },
                      { label: 'Fon Rasm URL', key: 'bg_image_url', type: 'image' },
                    ].map(field => (
                      <div key={field.key} className={field.type === 'textarea' || field.type === 'image' ? 'md:col-span-2' : ''}>
                        <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.3em] ml-2">{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea 
                            value={(settings as any)[field.key] || ''} 
                            onChange={e => setSettings({...settings, [field.key]: e.target.value})} 
                            className="w-full bg-slate-950 border border-white/5 px-8 py-6 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 min-h-[160px] text-lg font-medium transition-all" 
                          />
                        ) : field.type === 'image' ? (
                          <div className="flex flex-col md:flex-row gap-8">
                            <input 
                              type="text" 
                              value={(settings as any)[field.key] || ''} 
                              onChange={e => setSettings({...settings, [field.key]: e.target.value})} 
                              className="flex-1 bg-slate-950 border border-white/5 px-8 py-6 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm transition-all" 
                              placeholder="https://..."
                            />
                            {(settings as any)[field.key] && (
                              <div className="w-28 h-28 rounded-[2rem] bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0 shadow-2xl">
                                <img src={(settings as any)[field.key]} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            value={(settings as any)[field.key] || ''} 
                            onChange={e => setSettings({...settings, [field.key]: e.target.value})} 
                            className="w-full bg-slate-950 border border-white/5 px-8 py-6 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 font-black text-2xl transition-all" 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                 </div>
               )}

             </div>
          </div>
        </div>
      )}

      <footer className="py-24 px-6 border-t border-white/5 bg-slate-950/30 mt-32 text-center relative z-10">
        <p className="text-slate-500 text-sm font-bold tracking-tight">© {new Date().getFullYear()} {settings.footer_brand_name}. Created with AI Brilliance.</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
        @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 15s ease infinite; }
      `}</style>
    </div>
  );
};

export default App;
