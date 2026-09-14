import { createWorker } from 'tesseract.js';

export class OCRProcessor {
  public static async recognizeImageBuffer(imageBuffer: Buffer): Promise<string> {
    let worker: any = null;
    try {
      worker = await createWorker('eng');
      const ret = await worker.recognize(imageBuffer);
      await worker.terminate();
      return ret?.data?.text || '';
    } catch (err: any) {
      console.warn('OCR processing skipped or unsupported for this buffer:', err.message);
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      return '';
    }
  }
}
