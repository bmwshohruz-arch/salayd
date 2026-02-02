
import pptxgen from "pptxgenjs";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Presentation } from "../types";

/**
 * Taqdimotni PowerPoint (PPTX) formatida yuklab olish
 */
export const exportToPptx = async (presentation: Presentation) => {
  const pres = new pptxgen();
  
  // Taqdimot sarlavhasi slaydi
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: "1e293b" }; // Slate-800
  titleSlide.addText(presentation.title, {
    x: 0,
    y: "40%",
    w: "100%",
    align: "center",
    fontSize: 44,
    bold: true,
    color: "ffffff",
  });
  titleSlide.addText("AI Taqdimot Master tomonidan tayyorlandi", {
    x: 0,
    y: "60%",
    w: "100%",
    align: "center",
    fontSize: 18,
    color: "94a3b8",
  });

  // Har bir slaydni qo'shish
  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    const s = pres.addSlide();
    
    // Background Image
    const searchKeywords = slide.imageKeyword 
      ? encodeURIComponent(slide.imageKeyword.split(',').join(',')) 
      : 'abstract,technology,modern';
    const imageUrl = slide.customImage || `https://loremflickr.com/g/1280/720/${searchKeywords}?lock=${i + 100}`;
    
    // PPTX-ga rasm qo'shishda background sifatida ishlatamiz
    // Eslatma: Ba'zan tashqi URL-lar CORS tufayli muammo berishi mumkin, lekin pptxgenjs odatda fetch qiladi
    try {
      s.background = { path: imageUrl };
    } catch (e) {
      s.background = { color: "1e293b" };
    }

    // Semi-transparent overlay simulation (text readability)
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: '000000', transparency: 50 }
    });

    // Slayd sarlavhasi
    s.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 1,
      fontSize: 36,
      bold: true,
      color: "ffffff",
      valign: "middle",
    });

    // Slayd mazmuni (bullet list)
    const bulletPoints = slide.content.map(text => ({ 
      text, 
      options: { 
        bullet: true, 
        margin: [0, 0, 10, 0] as [number, number, number, number],
        color: 'ffffff',
        fontSize: 18
      } 
    }));
    
    s.addText(bulletPoints, {
      x: 0.5,
      y: 1.8,
      w: "85%",
      h: 4,
      valign: "top",
    });

    // Footer
    s.addText(`${i + 1} | AI Taqdimot Master`, {
      x: 0.5,
      y: 6.8,
      w: "90%",
      fontSize: 10,
      color: "94a3b8",
    });
  }

  await pres.writeFile({ fileName: `${presentation.title.replace(/\s+/g, '_')}.pptx` });
};

/**
 * Taqdimotni PDF formatida eksport qilish
 */
export const exportToPdf = async (presentation: Presentation, slideElementId: string) => {
  const element = document.getElementById(slideElementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#000000'
  });
  
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
  pdf.save(`${presentation.title.replace(/\s+/g, '_')}.pdf`);
};
