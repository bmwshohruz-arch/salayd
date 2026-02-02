
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Layout, CheckCircle, Loader2, Trash2, 
  ChevronLeft, ChevronRight, Sparkles, 
  Lock, Settings, X, Save, History, Clock, Home, ArrowLeft, RefreshCcw, Image as ImageIcon, Eye, Download, Edit3
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
  
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<'pptx' | 'pdf' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (data && !error) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (err) {
      console.warn("Supabase sozlamalarini yuklashda xatolik.");
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
      console.error("Tarixni yuklashda xatolik:", err);
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
      setIsAdminOpen(false);
      fetchSettings(); 
    } catch (err) {
      console.error(err);
      alert('Ma\'lumotlarni saqlashda xatolik yuz berdi.');
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
      console.error("Tarixga saqlashda xatolik:", err);
    }
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Ushbu taqdimotni tarixdan o'chirmoqchimisiz?")) return;
    try {
      await supabase.from('presentations').delete().eq('id', id);
      fetchHistory();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
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
      console.error("PPTX Export error:", error);
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
      console.error("PDF Export error:", error);
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
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group"
            >
              <History size={18} className="group-hover:rotate-[-20deg] transition-transform" />
              <span className="text-sm font-bold hidden md:inline">Tarix</span>
            </button>
            <button 
              onClick={() => isAuthenticated ? setIsAdminOpen(true) : setIsLoginOpen(true)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 text-slate-400 hover:text-white"
            >
              <Settings size={20} />
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
                      ? 'bg-green-600 border-green-400 hover:bg-green-700' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                 >
                   {isEditing ? <CheckCircle size={20} /> : <Edit3 size={20} />}
                   {isEditing ? "Tahrirlashni tugatish" : "Tahrirlash"}
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
                <div id="active-slide-preview" className="w-full">
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
                  <div className="text-4xl font-black">
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
                    className={`w-full p-6 rounded-3xl text-left transition-all border ${
                      activeSlide === i 
                        ? 'bg-indigo-600 border-indigo-400 shadow-2xl' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase opacity-50 mb-2">Slayd {i + 1}</span>
                    <span className="font-bold text-sm block truncate">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {isLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3"><Lock /> Admin Kirish</h3>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <input 
                type="text" 
                placeholder="Login" 
                className="w-full bg-slate-950 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                value={loginForm.user}
                onChange={e => setLoginForm({...loginForm, user: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="Parol" 
                className="w-full bg-slate-950 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                value={loginForm.pass}
                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
              />
              <button type="submit" className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all">Kirish</button>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="w-full text-slate-500 font-bold">Bekor qilish</button>
            </form>
          </div>
        </div>
      )}

      {isAdminOpen && isAuthenticated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
          <div className="bg-slate-900 border border-white/10 p-10 lg:p-14 rounded-[4rem] w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-20">
            <div className="flex items-center justify-between mb-12 sticky top-0 bg-slate-900 pb-6 border-b border-white/5 z-10">
              <h3 className="text-4xl font-black tracking-tight flex items-center gap-4"><Settings size={32} /> Sayt Sozlamalari</h3>
              <button onClick={() => setIsAdminOpen(false)} className="p-4 hover:bg-white/10 rounded-full transition-all"><X size={32} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {[
                { label: 'Badge Matni', key: 'hero_badge' },
                { label: 'Sarlavha (Normal)', key: 'hero_title_part1' },
                { label: 'Sarlavha (Gradient)', key: 'hero_title_gradient' },
                { label: 'Subtitr', key: 'hero_subtitle', type: 'textarea' },
                { label: 'Yuklash box sarlavhasi', key: 'upload_box_title' },
                { label: 'Yuklash box izohi', key: 'upload_box_desc' },
                { label: 'Brand nomi', key: 'footer_brand_name' },
                { label: 'Logo URL', key: 'logo_url', type: 'image' },
                { label: 'Hero Rasm URL', key: 'hero_image_url', type: 'image' },
                { label: 'Fon Rasm URL', key: 'bg_image_url', type: 'image' },
              ].map(field => (
                <div key={field.key} className={field.type === 'textarea' || field.type === 'image' ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-black text-slate-500 mb-4 uppercase tracking-widest">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea 
                      value={(settings as any)[field.key] || ''} 
                      onChange={e => setSettings({...settings, [field.key]: e.target.value})} 
                      className="w-full bg-slate-950 border border-white/10 px-8 py-6 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]" 
                    />
                  ) : field.type === 'image' ? (
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        value={(settings as any)[field.key] || ''} 
                        onChange={e => setSettings({...settings, [field.key]: e.target.value})} 
                        className="flex-1 bg-slate-950 border border-white/10 px-8 py-6 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" 
                        placeholder="https://..."
                      />
                      {(settings as any)[field.key] && <img src={(settings as any)[field.key]} className="w-20 h-20 rounded-2xl object-cover border border-white/10" />}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={(settings as any)[field.key] || ''} 
                      onChange={e => setSettings({...settings, [field.key]: e.target.value})} 
                      className="w-full bg-slate-950 border border-white/10 px-8 py-6 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" 
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-16 flex items-center gap-6 sticky bottom-0 bg-slate-900 pt-6 border-t border-white/5">
              <button 
                onClick={handleSaveSettings} 
                disabled={saveLoading}
                className="flex-1 bg-indigo-600 py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-2xl"
              >
                {saveLoading ? <Loader2 className="animate-spin" /> : <Save />} O'zgarishlarni Saqlash
              </button>
              <button onClick={() => setIsAdminOpen(false)} className="px-12 bg-white/5 py-6 rounded-[2rem] font-black text-xl hover:bg-white/10 transition-all border border-white/10">Bekor qilish</button>
            </div>
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 h-full flex flex-col p-10 shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-3xl font-black tracking-tight">Taqdimotlar Tarixi</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={32} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-4">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setPresentation(item.data);
                    setActiveSlide(0);
                    setIsHistoryOpen(false);
                    setIsEditing(false);
                  }}
                  className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all group relative"
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h4 className="font-black text-lg group-hover:text-indigo-400 transition-colors leading-tight">{item.title}</h4>
                    <button onClick={(e) => deleteFromHistory(item.id, e)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><FileText size={12} /> {item.data.slides.length} slayd</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="py-24 px-6 border-t border-white/5 bg-slate-950/30 mt-32 text-center">
        <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} {settings.footer_brand_name}. Barcha huquqlar himoyalangan.</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 15s ease infinite; }
      `}</style>
    </div>
  );
};

export default App;
