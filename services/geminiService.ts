
import { GoogleGenAI, Type } from "@google/genai";
import { Presentation } from "../types";

export const generatePresentationData = async (content: string, fileName: string): Promise<Presentation> => {
  // Always use process.env.API_KEY directly for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Siz dunyo miqyosidagi professional prezentatsiya dizaynerisiz. Berilgan "${fileName}" fayli mazmunini tahlil qiling va unga mos vizual taqdimot yarating.

DIQQAT: Har bir slayd mazmuni bo'yicha orqa fonga rasm tanlash uchun juda aniq va vizual tasvirli inglizcha kalit so'zlar bering. 
Masalan: 
- Agar slayd urush haqida bo'lsa: "historical battle field, cinematic explosion, military strategy"
- Agar biznes haqida bo'lsa: "modern glass office skyscraper, business handshake, global trade"
- Agar tabiat haqida bo'lsa: "lush green forest, majestic mountains, clean energy"

Qoidalar:
1. Matnni mantiqiy bloklarga ajrating va har bir slaydni boyitilgan mazmun bilan to'ldiring.
2. Har bir slayd uchun "imageKeyword" qatoriga rasm qidirish xizmati (Unsplash/Flickr) tushunadigan, 3-4 ta aniq inglizcha kalit so'zlarni vergul bilan ajratib yozing.
3. Slaydlar soni 8 tadan 15 tagacha bo'lsin.
4. Har bir slaydda 3-6 ta batafsil bandlar (points) bo'lsin.

Javobni FAQAT ushbu JSON formatida qaytaring:
{
  "title": "Taqdimot sarlavhasi",
  "mainTheme": "modern",
  "slides": [
    {
      "id": "1",
      "title": "Slayd nomi",
      "content": ["Batafsil ma'lumot 1", "Batafsil ma'lumot 2", "Batafsil ma'lumot 3"],
      "layout": "bullet-list",
      "theme": "creative",
      "imageKeyword": "cinematic historical scene, epic battle atmosphere"
    }
  ]
}

Matn:
${content.substring(0, 20000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          mainTheme: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                content: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                layout: { type: Type.STRING },
                theme: { type: Type.STRING },
                imageKeyword: { type: Type.STRING }
              },
              required: ["id", "title", "content", "layout", "imageKeyword"]
            }
          }
        },
        required: ["title", "slides"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as Presentation;
  } catch (e) {
    console.error("Gemini JSON error:", e);
    throw new Error("AI tahlili natijasida xatolik yuz berdi. Iltimos, faylni qayta yuklang yoki boshqa fayl tanlang.");
  }
};
