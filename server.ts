import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });

  app.post('/api/qc/scan', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: 'Image and mimeType required' });
      }

      const prompt = `Anda adalah Laboratory QC Data Extraction Assistant. 
      BACA HANYA informasi yang terlihat jelas pada gambar. JANGAN menebak.
      Jika nilai tidak terlihat jelas, isi dengan null.
      Berikan confidence score (0-1) untuk setiap field.
      Tandai needs_verification=true jika confidence < 0.8 atau nilai ambigu.
      
      Perhatikan:
      1. Jika hasil terbaca: 102.5, jangan dibulatkan.
      2. Pertahankan unit asli.
      3. Jika unit tidak terbaca jelas, unit = null.
      4. Jika date/time tidak terbaca, date/time = null.
      5. Jika lot tidak terbaca, lot = null.
      6. Jangan mengarang mean/SD jika tidak ada di tabel.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            { inlineData: { data: imageBase64, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scan: {
                type: Type.OBJECT,
                properties: {
                  scan_id: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  image_id: { type: Type.STRING }
                }
              },
              document: {
                type: Type.OBJECT,
                properties: {
                  laboratory_name: { type: Type.STRING },
                  analyzer: { type: Type.STRING },
                  date: { type: Type.STRING },
                  time: { type: Type.STRING }
                }
              },
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    parameter: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.STRING },
                        original_text: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    level: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.STRING },
                        original_text: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    lot: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    result: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.NUMBER },
                        original_text: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    unit: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    mean: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.NUMBER },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    sd: { 
                      type: Type.OBJECT, 
                      properties: { 
                        value: { type: Type.NUMBER },
                        confidence: { type: Type.NUMBER }
                      } 
                    },
                    source_text: { type: Type.STRING },
                    overall_confidence: { type: Type.NUMBER },
                    needs_verification: { type: Type.BOOLEAN },
                    verification_reason: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const ocrResult = JSON.parse(response.text || '{}');
      // Enforce confidence rules server-side
      if (ocrResult.results) {
        ocrResult.results = ocrResult.results.map((r: any) => {
          const confidence = r.overall_confidence || 0;
          if (confidence < 0.8) {
            return { ...r, needs_verification: true, verification_reason: r.verification_reason || "Low confidence score" };
          }
          return r;
        });
      }

      res.json(ocrResult);
    } catch (error) {
      console.error('Scan error:', error);
      res.status(500).json({ error: 'Gagal memproses gambar QC' });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
