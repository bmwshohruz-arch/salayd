
export interface Slide {
  id: string;
  title: string;
  content: string[];
  layout: 'standard' | 'title' | 'two-column' | 'bullet-list' | 'image-text';
  theme?: 'modern' | 'corporate' | 'creative' | 'minimal';
  imageKeyword?: string;
  footer?: string;
}

export interface Presentation {
  title: string;
  slides: Slide[];
  mainTheme?: string;
}

export interface SiteSettings {
  hero_badge: string;
  hero_title_part1: string;
  hero_title_gradient: string;
  hero_subtitle: string;
  upload_box_title: string;
  upload_box_desc: string;
  footer_brand_name: string;
}

export enum FileType {
  WORD = 'word',
  EXCEL = 'excel',
  UNKNOWN = 'unknown'
}
