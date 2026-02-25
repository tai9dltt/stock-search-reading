import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const CACHE_EXPIRATION = 15 * 60 * 1000; // 15 minutes

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRATION) {
      return data as T;
    }
    localStorage.removeItem(key);
  } catch (e) {
    // Ignore errors or clear invalid cache
  }
  return null;
}

function setCachedData(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Ignore quota exceeded errors
  }
}

export interface StockOverview {
  analysisMarkdown: string;
  keyInfo: {
    currentPrice: string;
    industry: string;
    marketCap: string;
    peRatio: string;
    exchange: string;
    minMax52W: string;
    outstandingShares: string;
    foreignOwnership: string;
    overviewUrl: string;
  };
  analystReports: {
    broker: string;
    date: string;
    targetPrice: string;
    recommendation: string;
    summary: string;
    url: string;
  }[];
}

export async function analyzeStock(symbol: string): Promise<StockOverview> {
  const cacheKey = `stock_overview_v7_${symbol}`;
  const cached = getCachedData<StockOverview>(cacheKey);
  if (cached) return cached;

  const model = "gemini-3-flash-preview";
  
  const prompt = `Đóng vai trò là một chuyên gia phân tích chứng khoán cấp cao. Hãy tổng hợp và viết một bài phân tích CỰC KỲ CHI TIẾT VÀ CHUYÊN SÂU về cổ phiếu ${symbol} trên thị trường chứng khoán Việt Nam.
  Sử dụng Google Search để tìm kiếm thông tin, CHỈ TẬP TRUNG VÀO NGUỒN CAFEF.VN (tìm kiếm các báo cáo phân tích, kết quả kinh doanh, tin tức chuyên sâu).
  Đặc biệt, hãy tìm chính xác đường dẫn URL trang tổng quan/hồ sơ công ty của cổ phiếu ${symbol} trên cafef.vn (thường có dạng https://cafef.vn/du-lieu/hose/ssi-cong-ty-co-phan-chung-khoan-ssi.chn).
  
  Bài phân tích (analysisMarkdown) phải đóng vai trò như một BÁO CÁO TỔNG HỢP (Synthesis Report) từ các công ty chứng khoán, bao gồm các phần sau (sử dụng Heading ## cho mỗi phần):
  ## 1. Tổng quan & Vị thế doanh nghiệp
  (Mô tả chi tiết vị thế trong ngành, chuỗi giá trị, lợi thế cạnh tranh cốt lõi)
  ## 2. Điểm nhấn đầu tư (Investment Highlights)
  (Tổng hợp các luận điểm đầu tư chính từ các CTCK, động lực tăng trưởng, dự án mới, mở rộng thị trường...)
  ## 3. Phân tích Tài chính & Kết quả kinh doanh
  (Đánh giá chi tiết doanh thu, lợi nhuận, biên lợi nhuận, dòng tiền, nợ vay dựa trên báo cáo gần nhất)
  ## 4. Rủi ro & Thách thức
  (Các rủi ro về vĩ mô, ngành, tỷ giá, nguyên vật liệu, hoặc nội tại doanh nghiệp)
  ## 5. Định giá & Triển vọng
  (Tổng hợp góc nhìn định giá từ các CTCK, P/E, P/B mục tiêu, và dự phóng tương lai)

  Trả về kết quả dưới dạng JSON với cấu trúc sau:
  {
    "analysisMarkdown": "Bài phân tích siêu chi tiết bằng Markdown. BẮT BUỘC dùng dấu xuống dòng thật (newline). PHẢI CÓ 1 DÒNG TRỐNG (blank line) sau mỗi Heading (##) và giữa các đoạn văn để dễ nhìn.",
    "keyInfo": {
      "currentPrice": "Giá cổ phiếu hiện tại (VD: 35.500 VNĐ)",
      "industry": "Ngành nghề",
      "marketCap": "Vốn hóa",
      "peRatio": "P/E",
      "exchange": "Sàn giao dịch (chỉ trả về đúng 1 chữ: 'hose', 'hnx', hoặc 'upcom')",
      "minMax52W": "Giá thấp nhất - cao nhất 52 tuần (VD: 20.000 - 35.000)",
      "outstandingShares": "Số lượng CP lưu hành (VD: 1.2 tỷ CP)",
      "foreignOwnership": "Tỷ lệ sở hữu nước ngoài (VD: 49%, 15.5%, hoặc N/A)",
      "overviewUrl": "Đường dẫn URL chính xác trang tổng quan hồ sơ công ty trên cafef.vn (VD: https://cafef.vn/du-lieu/hose/ssi-cong-ty-co-phan-chung-khoan-ssi.chn)"
    },
    "analystReports": [
      {
        "broker": "Tên CTCK",
        "date": "Ngày",
        "targetPrice": "Giá mục tiêu",
        "recommendation": "Khuyến nghị",
        "summary": "Tóm tắt 1 câu",
        "url": "Link bài viết trên cafef.vn"
      }
    ]
  }
  Lưu ý: 
  - Lấy tối đa 3 báo cáo phân tích mới nhất từ CafeF cho phần analystReports.
  - Phần analysisMarkdown PHẢI DÀI, CHI TIẾT, ĐẦY ĐỦ SỐ LIỆU, mang tính chất của một báo cáo phân tích chuyên nghiệp thực thụ.
  - FORMAT: Bắt buộc phải cách dòng (thêm dòng trắng) giữa các ý và sau các tiêu đề để văn bản không bị dính chùm vào nhau.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysisMarkdown: { type: Type.STRING },
          keyInfo: {
            type: Type.OBJECT,
            properties: {
              currentPrice: { type: Type.STRING },
              industry: { type: Type.STRING },
              marketCap: { type: Type.STRING },
              peRatio: { type: Type.STRING },
              exchange: { type: Type.STRING },
              minMax52W: { type: Type.STRING },
              outstandingShares: { type: Type.STRING },
              foreignOwnership: { type: Type.STRING },
              overviewUrl: { type: Type.STRING }
            },
            required: ["currentPrice", "industry", "marketCap", "peRatio", "exchange", "minMax52W", "outstandingShares", "foreignOwnership", "overviewUrl"]
          },
          analystReports: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                broker: { type: Type.STRING },
                date: { type: Type.STRING },
                targetPrice: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                summary: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["broker", "date", "targetPrice", "recommendation", "summary"]
            }
          }
        },
        required: ["analysisMarkdown", "keyInfo", "analystReports"]
      }
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    setCachedData(cacheKey, result);
    return result;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return {
      analysisMarkdown: "Không thể phân tích dữ liệu lúc này.",
      keyInfo: { currentPrice: "N/A", industry: "N/A", marketCap: "N/A", peRatio: "N/A", exchange: "hose", minMax52W: "N/A", outstandingShares: "N/A", foreignOwnership: "N/A", overviewUrl: `https://s.cafef.vn/Lich-su-giao-dich-${symbol.toUpperCase()}-1.chn` },
      analystReports: []
    };
  }
}

export interface CapitalEvent {
  date: string;
  event: string;
  additionalShares: string;
  totalSharesAfter: string;
}

export async function analyzeCapitalHistory(symbol: string): Promise<CapitalEvent[]> {
  const cacheKey = `stock_capital_${symbol}`;
  const cached = getCachedData<CapitalEvent[]>(cacheKey);
  if (cached) return cached;

  const model = "gemini-3-flash-preview";
  
  const prompt = `Tìm kiếm thông tin về "lịch sử tăng vốn", "phát hành thêm", "trả cổ tức bằng cổ phiếu", "ESOP" của cổ phiếu ${symbol} trên trang web cafef.vn.
  Hãy tổng hợp các sự kiện làm thay đổi số lượng cổ phiếu lưu hành hoặc vốn điều lệ của công ty này từ trước đến nay (ưu tiên các sự kiện gần nhất, tối đa 10 sự kiện).
  
  Trả về kết quả dưới dạng mảng JSON với cấu trúc sau:
  [
    {
      "date": "Năm hoặc Ngày tháng (VD: 2023, 05/2024)",
      "event": "Hình thức (VD: Phát hành riêng lẻ, Trả cổ tức bằng cổ phiếu tỷ lệ 10%, ESOP...)",
      "additionalShares": "Số lượng CP phát hành thêm (VD: +10 triệu CP, hoặc N/A nếu không rõ)",
      "totalSharesAfter": "Vốn điều lệ hoặc Số lượng CP lưu hành sau sự kiện (VD: 1.5 tỷ CP, hoặc 15.000 tỷ VNĐ)"
    }
  ]`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            event: { type: Type.STRING },
            additionalShares: { type: Type.STRING },
            totalSharesAfter: { type: Type.STRING }
          },
          required: ["date", "event", "additionalShares", "totalSharesAfter"]
        }
      }
    },
  });

  try {
    const result = JSON.parse(response.text || "[]");
    setCachedData(cacheKey, result);
    return result;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return [];
  }
}

export interface NewsAnalysis {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  summary: string;
  articles: { title: string; url: string; source: string; date: string }[];
}

export async function analyzeNews(symbol: string): Promise<NewsAnalysis> {
  const cacheKey = `stock_news_${symbol}`;
  const cached = getCachedData<NewsAnalysis>(cacheKey);
  if (cached) return cached;

  const model = "gemini-3-flash-preview";
  
  const prompt = `Tìm kiếm các tin tức mới nhất về cổ phiếu ${symbol} trên trang web cafef.vn (sử dụng từ khóa: "${symbol} site:cafef.vn").
  Hãy phân tích nhanh các tin tức này và trả về kết quả dưới dạng JSON với cấu trúc sau:
  {
    "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
    "score": number (từ 0 đến 100, 100 là cực kỳ tích cực, 0 là cực kỳ tiêu cực, 50 là trung lập),
    "summary": "Tóm tắt ngắn gọn các tin tức chính và tác động dự kiến đến giá cổ phiếu",
    "articles": [
      { "title": "Tiêu đề bài báo", "url": "Đường dẫn URL (nếu có, hoặc để trống)", "source": "CafeF", "date": "Ngày đăng" }
    ]
  }
  Lưu ý: Chỉ lấy tối đa 3-5 bài báo mới nhất và quan trọng nhất để tối ưu tốc độ phản hồi.`;

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
    const result = JSON.parse(response.text || "{}");
    setCachedData(cacheKey, result);
    return result;
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
