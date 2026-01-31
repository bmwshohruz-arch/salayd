
import * as XLSX from 'xlsx';

/**
 * Word fayllarni o'qish uchun soddalashtirilgan funksiya.
 * Haqiqiy muhitda 'mammoth' kutubxonasi ishlatiladi.
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      // Browser-side Word parsing can be complex, 
      // here we use a simplified version. 
      // In a production app, use 'mammoth' via script tag or npm.
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(new Uint8Array(arrayBuffer));
      // Removing most XML tags for basic text extraction
      const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      resolve(cleanText);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const extractTextFromXlsx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      let fullText = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        fullText += `Sheet: ${sheetName}\n` + json.map((row: any) => row.join(', ')).join('\n') + '\n\n';
      });
      
      resolve(fullText);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
