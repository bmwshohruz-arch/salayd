
import React from 'react';
import { Slide } from '../types';
// Added Layout import from lucide-react
import { Layout } from 'lucide-react';

interface SlidePreviewProps {
  slide: Slide;
  index: number;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, index }) => {
  // Use multiple fallback keywords and a unique lock to ensure unique images per slide
  const searchKeywords = slide.imageKeyword 
    ? encodeURIComponent(slide.imageKeyword.split(',').join(',')) 
    : 'abstract,technology,modern';
  
  // Using a more reliable way to fetch relevant high-quality images
  const finalImageUrl = `https://loremflickr.com/g/1920/1080/${searchKeywords}?lock=${index + 100}`;

  return (
    <div className="relative shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col aspect-[16/9] w-full transition-all duration-700 bg-black group">
      {/* Background Layer */}
      <div className="absolute inset-0">
        <img 
          src={finalImageUrl} 
          alt={slide.title} 
          className="w-full h-full object-cover transition-transform duration-[20s] ease-linear group-hover:scale-125"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80`;
          }}
        />
        {/* Dynamic Multi-layer Gradient Overlay for maximum text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>
        
        {/* Subtle blur overlay on the edges */}
        <div className="absolute inset-0 backdrop-blur-[1px]"></div>
      </div>

      {/* Slide Content */}
      <div className="relative z-10 flex flex-col h-full p-12 lg:p-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="px-5 py-2 rounded-2xl bg-indigo-600/30 backdrop-blur-xl border border-indigo-500/30 shadow-lg">
            <span className="text-xs font-black text-indigo-100 uppercase tracking-[0.3em]">
              Slayd {index + 1}
            </span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] max-w-5xl tracking-tight">
            {slide.title}
          </h2>
          
          <ul className="space-y-6 max-w-4xl">
            {slide.content.map((item, i) => (
              <li 
                key={i} 
                className="flex items-start gap-5 animate-in slide-in-from-left duration-1000 fill-mode-both group/item"
                style={{ animationDelay: `${(i + 1) * 200}ms` }}
              >
                <div className="mt-2.5 w-4 h-4 rounded-lg bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] flex-shrink-0 transition-transform group-hover/item:scale-125 group-hover/item:rotate-12"></div>
                <span className="text-xl lg:text-3xl font-bold text-white/95 leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-90 group-hover/item:opacity-100 transition-opacity">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <div className="mt-auto flex justify-between items-end pt-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Layout size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mavzu yo'nalishi</p>
                <p className="text-sm font-bold text-indigo-300 capitalize">{slide.imageKeyword?.split(',')[0] || 'Professional'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-6xl font-black text-white/10 select-none">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Decorative inner border */}
      <div className="absolute inset-0 border-[1px] border-white/5 rounded-[2.5rem] pointer-events-none"></div>
    </div>
  );
};
