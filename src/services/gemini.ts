import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const CACHE_EXPIRATION = 2 * 60 * 1000; // 2 minutes

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
  const currentDate = new Date().toISOString().split('T')[0];
  const cacheKey = `stock_overview_v9_${symbol}_${currentDate}`;
  const cached = getCachedData<StockOverview>(cacheKey);
  if (cached) return cached;

  // Bước 1: Dùng Gemini 3 Flash để cào và làm sạch dữ liệu thô
  const flashModel = "gemini-3-flash-preview";
  const fetchPrompt = `Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN')}.
  Hãy tìm kiếm và thu thập toàn bộ dữ liệu thô, số liệu tài chính, tin tức mới nhất, báo cáo phân tích của các CTCK về cổ phiếu ${symbol} trên thị trường chứng khoán Việt Nam.
  Đảm bảo lấy giá hiện tại, vốn hóa, P/E, EPS, số lượng cổ phiếu lưu hành, tỷ lệ sở hữu nước ngoài, và các chỉ số tài chính quan trọng trong 3-5 năm qua.
  Trả về một bản tóm tắt dữ liệu thô chi tiết nhất có thể để làm đầu vào cho bước phân tích chuyên sâu.`;

  let rawData = "";
  try {
    const flashResponse = await ai.models.generateContent({
      model: flashModel,
      contents: [{ parts: [{ text: fetchPrompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    rawData = flashResponse.text || "Không có dữ liệu thô.";
  } catch (e: any) {
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw e;
    }
    console.error("Lỗi khi cào dữ liệu thô bằng Flash:", e);
    rawData = "Không thể lấy dữ liệu thô, hãy tự phân tích dựa trên kiến thức hiện có.";
  }

  // Bước 2: Dùng Gemini 3.1 Pro để phân tích chuyên sâu
  const proModel = "gemini-3.1-pro-preview";
  
  const prompt = `Bạn là chuyên gia phân tích đầu tư chứng khoán với kinh nghiệm 10+ năm. 
  Dưới đây là dữ liệu thô đã được thu thập về cổ phiếu ${symbol}:
  
  <RAW_DATA>
  ${rawData}
  </RAW_DATA>
  
  Dựa trên dữ liệu trên (và kiến thức của bạn nếu cần), hãy thực hiện một báo cáo phân tích CỰC KỲ CHUYÊN SÂU cho cổ phiếu: ${symbol} trên thị trường Việt Nam.
  Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN')}.

  ⚠️ YÊU CẦU QUAN TRỌNG:
  - Giá cổ phiếu (currentPrice) phải là giá cập nhật mới nhất của ngày ${new Date().toLocaleDateString('vi-VN')}.
  - Nếu chưa có giá hôm nay, hãy lấy giá đóng cửa phiên gần nhất và ghi rõ ngày (dd/mm/yyyy).
  - Ghi rõ nguồn dữ liệu nếu có (HOSE, HNX, Vietstock, CafeF, Bloomberg, FiinPro,...).
  - Nếu dữ liệu không chắc chắn, phải ghi chú "cần kiểm chứng".
  - Không được tự suy đoán số liệu tài chính.

  Nội dung bài phân tích (analysisMarkdown) phải bao gồm các phần sau (sử dụng Heading # và ##):

  # 1. Tổng quan doanh nghiệp & vị thế ngành
  - Mô tả mô hình kinh doanh, chuỗi giá trị
  - Các mảng doanh thu chính và tỷ trọng
  - Vị thế trong ngành (market share nếu có)
  - Đối thủ cạnh tranh chính
  - Lợi thế cạnh tranh cốt lõi (moat): chi phí, thương hiệu, quy mô, hệ sinh thái...

  # 2. Investment Thesis (Luận điểm đầu tư)
  Tóm tắt 3–5 luận điểm chính:
  - Động lực tăng trưởng (growth drivers)
  - Catalyst ngắn hạn (tin tức, dự án, chính sách)
  - Catalyst dài hạn (xu hướng ngành, mở rộng)
  - Góc nhìn từ các CTCK (nếu có)

  # 3. Phân tích ngành (Industry Analysis)
  - Quy mô ngành & tốc độ tăng trưởng (CAGR)
  - Chu kỳ ngành (đang ở pha nào)
  - Yếu tố vĩ mô ảnh hưởng (lãi suất, tỷ giá, chính sách)
  - So sánh doanh nghiệp với top peers

  # 4. Phân tích tài chính (Financial Analysis)
  Sử dụng dữ liệu 3–5 năm gần nhất:
  ## 4.1 Kết quả kinh doanh (Doanh thu, LNST, Biên LN)
  ## 4.2 Bảng cân đối kế toán (Tài sản, Nợ vay, Debt/Equity)
  ## 4.3 Dòng tiền (CFO, FCF, Chất lượng LN)
  ## 4.4 Các chỉ số tài chính (ROE, ROA, Vòng quay tài sản)

  # 5. Định giá (Valuation)
  Thực hiện ít nhất 2 phương pháp (So sánh tương đối P/E, P/B và Định giá tuyệt đối DCF/Residual Income nếu đủ dữ liệu).
  - Giá mục tiêu (Target price)
  - Upside (%)
  - Giả định chính

  ## 5.4 Bảng nhạy cảm định giá (Sensitivity Table)
  Xây dựng bảng ma trận ước tính giá cổ phiếu dựa trên các giả định khác nhau về EPS và P/E.
  Ví dụ:
  | P/E | 14x | 16x | 18x | 20x |
  |-----|-----|-----|-----|-----|
  | EPS [Giá trị 1] | [Giá] | [Giá] | [Giá] | [Giá] |
  | EPS [Giá trị 2] | [Giá] | [Giá] | [Giá] | [Giá] |

  # 6. Phân tích rủi ro
  - Rủi ro vĩ mô, ngành và doanh nghiệp.

  # 7. Kịch bản đầu tư (Scenario Analysis)
  Xây dựng bảng 3 kịch bản: Bull case, Base case, Bear case kèm giả định và giá mục tiêu.
  LƯU Ý: Khi tạo bảng Markdown, hãy đảm bảo mỗi dòng của bảng (header, separator, rows) đều nằm trên một dòng riêng biệt (sử dụng \n). PHẢI CÓ một dòng trống trước và sau bảng.

  # 8. Quan điểm đầu tư & khuyến nghị
  - Định giá hiện tại: rẻ / hợp lý / đắt
  - Khuyến nghị: MUA / GIỮ / BÁN
  - Tầm nhìn: ngắn hạn / trung hạn / dài hạn
  - Tỷ trọng gợi ý

  # 9. Tóm tắt nhanh (Executive Summary)
  - 5 bullet point quan trọng nhất và 1 câu kết luận đầu tư.

  # 10. Phụ lục
  - Bảng số liệu tài chính, so sánh peers.

  Trả về kết quả dưới dạng JSON với cấu trúc sau:
  {
    "analysisMarkdown": "Bài phân tích siêu chi tiết bằng Markdown. BẮT BUỘC dùng dấu xuống dòng thật (\\n) cho mỗi đoạn văn và đặc biệt là cho mỗi dòng trong bảng Markdown. PHẢI CÓ 1 DÒNG TRỐNG (blank line) sau mỗi Heading và giữa các đoạn văn.",
    "keyInfo": {
      "currentPrice": "Giá cổ phiếu hiện tại (VD: 35.500 VNĐ)",
      "industry": "Ngành nghề",
      "marketCap": "Vốn hóa",
      "peRatio": "P/E",
      "exchange": "Sàn giao dịch (chỉ trả về đúng 1 chữ: 'hose', 'hnx', hoặc 'upcom')",
      "minMax52W": "Giá thấp nhất - cao nhất 52 tuần",
      "outstandingShares": "Số lượng CP lưu hành",
      "foreignOwnership": "Tỷ lệ sở hữu nước ngoài",
      "overviewUrl": "URL trang hồ sơ công ty trên cafef.vn"
    },
    "analystReports": [
      {
        "broker": "Tên CTCK",
        "date": "Ngày",
        "targetPrice": "Giá mục tiêu",
        "recommendation": "Khuyến nghị",
        "summary": "Tóm tắt",
        "url": "Link bài viết"
      }
    ]
  }
  Lưu ý: Lấy tối đa 8 báo cáo phân tích mới nhất cho phần analystReports.`;

  const response = await ai.models.generateContent({
    model: proModel,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
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
  } catch (e: any) {
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw e;
    }
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
  } catch (e: any) {
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw e;
    }
    console.error("Failed to parse JSON", e);
    return [];
  }
}

export interface TopStock {
  symbol: string;
  price: string;
  changeDay: string;
  changeWeek: string;
  changeMonth: string;
  volumeChange: string;
  foreignNet: string;
}

export async function getTopInterestedStocks(): Promise<TopStock[]> {
  const currentDate = new Date().toISOString().split('T')[0];
  const cacheKey = `top_interested_stocks_v3_${currentDate}`;
  const cached = getCachedData<TopStock[]>(cacheKey);
  if (cached) return cached;

  const model = "gemini-3-flash-preview";
  
  const prompt = `Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN')}.
  Tìm kiếm danh sách 30 cổ phiếu được nhà đầu tư quan tâm nhất (REAL-TIME) trong phiên giao dịch hôm nay trên thị trường chứng khoán Việt Nam (HOSE, HNX).
  Dữ liệu phải là dữ liệu mới nhất của ngày ${new Date().toLocaleDateString('vi-VN')}.
  
  Đối với mỗi cổ phiếu, hãy cung cấp:
  1. Mã cổ phiếu (symbol)
  2. Giá hiện tại (price)
  3. % thay đổi giá trong ngày (changeDay)
  4. % thay đổi giá trong 1 tuần qua (changeWeek)
  5. % thay đổi giá trong 1 tháng qua (changeMonth)
  6. Biến động khối lượng giao dịch so với trung bình 20 phiên gần nhất (volumeChange) - VD: "Gấp 1.8 lần TB20", hoặc "+80% so với TB20"
  7. Giá trị mua/bán ròng của khối ngoại hôm nay (foreignNet) - VD: "Mua ròng 50 tỷ" hoặc "Bán ròng 120 tỷ"
  
  Trả về kết quả dưới dạng mảng JSON:
  [
    {
      "symbol": "Mã CP",
      "price": "Giá (VD: 35.500)",
      "changeDay": "% thay đổi (VD: +2.5%)",
      "changeWeek": "% thay đổi tuần (VD: -1.2%)",
      "changeMonth": "% thay đổi tháng (VD: +10.5%)",
      "volumeChange": "Mô tả biến động KL (VD: Gấp 2 lần TB)",
      "foreignNet": "Giá trị mua/bán ròng"
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
            symbol: { type: Type.STRING },
            price: { type: Type.STRING },
            changeDay: { type: Type.STRING },
            changeWeek: { type: Type.STRING },
            changeMonth: { type: Type.STRING },
            volumeChange: { type: Type.STRING },
            foreignNet: { type: Type.STRING }
          },
          required: ["symbol", "price", "changeDay", "changeWeek", "changeMonth", "volumeChange", "foreignNet"]
        }
      }
    },
  });

  try {
    const result = JSON.parse(response.text || "[]");
    setCachedData(cacheKey, result);
    return result;
  } catch (e: any) {
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw e;
    }
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
  const currentDate = new Date().toISOString().split('T')[0];
  const cacheKey = `stock_news_${symbol}_${currentDate}`;
  const cached = getCachedData<NewsAnalysis>(cacheKey);
  if (cached) return cached;

  const model = "gemini-3-flash-preview";
  
  const prompt = `Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN')}.
  Tìm kiếm các tin tức MỚI NHẤT (trong 24h qua) về cổ phiếu ${symbol} trên trang web cafef.vn.
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
  } catch (e: any) {
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw e;
    }
    console.error("Failed to parse JSON", e);
    return {
      sentiment: 'NEUTRAL',
      score: 50,
      summary: 'Không thể phân tích tin tức lúc này.',
      articles: []
    };
  }
}
