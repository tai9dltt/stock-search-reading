import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface StockAnalysis {
  symbol: string;
  companyName: string;
  currentPrice: string;
  change: string;
  summary: string;
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  news: { title: string; url: string; date: string }[];
  recommendation: "BUY" | "SELL" | "HOLD";
}

export async function analyzeStock(symbol: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Phân tích chi tiết cổ phiếu ${symbol} trên thị trường chứng khoán Việt Nam. 
  Hãy cung cấp thông tin về:
  1. Giá hiện tại và biến động gần đây.
  2. Phân tích kỹ thuật cơ bản.
  3. Phân tích cơ bản (doanh thu, lợi nhuận, P/E...).
  4. Tin tức mới nhất và nhận định xu hướng.
  5. Khuyến nghị (Mua/Bán/Nắm giữ) kèm lý do.
  
  Trả về kết quả dưới dạng Markdown chuyên nghiệp.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text || "Không có dữ liệu phân tích.";
}

export interface NewsAnalysis {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  summary: string;
  articles: { title: string; url: string; source: string; date: string }[];
}

export async function analyzeNews(symbol: string): Promise<NewsAnalysis> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Tìm kiếm các tin tức mới nhất về cổ phiếu ${symbol} trên thị trường chứng khoán Việt Nam.
  Hãy phân tích các tin tức này và trả về kết quả dưới dạng JSON với cấu trúc sau:
  {
    "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
    "score": number (từ 0 đến 100, 100 là cực kỳ tích cực, 0 là cực kỳ tiêu cực, 50 là trung lập),
    "summary": "Tóm tắt ngắn gọn các tin tức chính và tác động dự kiến đến giá cổ phiếu",
    "articles": [
      { "title": "Tiêu đề bài báo", "url": "Đường dẫn URL (nếu có, hoặc để trống)", "source": "Nguồn tin", "date": "Ngày đăng" }
    ]
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          articles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                source: { type: Type.STRING },
                date: { type: Type.STRING }
              }
            }
          }
        },
        required: ["sentiment", "score", "summary", "articles"]
      }
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return {
      sentiment: 'NEUTRAL',
      score: 50,
      summary: 'Không thể phân tích tin tức lúc này.',
      articles: []
    };
  }
}
