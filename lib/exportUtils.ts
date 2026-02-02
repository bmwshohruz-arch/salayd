
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
  presentation.slides.forEach((slide) => {
    const s = pres.addSlide();
    
    // Slayd sarlavhasi
    s.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 1,
      fontSize: 32,
      bold: true,
      color: "1e293b",
      valign: "middle",
    });

    // Slayd mazmuni (bullet list)
    // Fix: Explicitly cast the margin array to a tuple to satisfy the pptxgenjs Margin type requirement
    const bulletPoints = slide.content.map(text => ({ 
      text, 
      options: { 
        bullet: true, 
        margin: [0, 0, 10, 0] as [number, number, number, number] 
      } 
    }));
    s.addText(bulletPoints, {
      x: 0.5,
      y: 1.6,
      w: "90%",
      h: 3.5,
      fontSize: 18,
      color: "334155",
      valign: "top",
    });

    // Footer
    s.addText(`© ${new Date().getFullYear()} AI Taqdimot Master`, {
      x: 0.5,
      y: 5.2,
      w: "90%",
      fontSize: 10,
      color: "94a3b8",
    });
  });

  await pres.writeFile({ fileName: `${presentation.title.replace(/\s+/g, '_')}.pptx` });
};

/**
 * Taqdimotni PDF formatida eksport qilish (Slaydlar ko'rinishini saqlagan holda)
 * Bu funksiya DOM-dagi elementni rasmga olib PDF-ga joylaydi.
 */
export const exportToPdf = async (presentation: Presentation, slideElementId: string) => {
  const element = document.getElementById(slideElementId);
  if (!element) return;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1280, 720]
  });

  // Izoh: To'liq PDF eksport qilish uchun barcha slaydlarni render qilish kerak.
  // Hozircha joriy ko'rinib turgan slaydni eksport qilamiz.
  // Barcha slaydlarni PDF qilish uchun "App.tsx" dagi yashirin container kerak bo'ladi.
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#000000'
  });
  
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
  pdf.save(`${presentation.title.replace(/\s+/g, '_')}.pdf`);
};
