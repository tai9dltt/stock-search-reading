import React, { useState } from 'react';
import { Search, TrendingUp, BarChart3, Newspaper, Loader2, ArrowUpRight } from 'lucide-react';
import { analyzeStock, StockOverview } from './services/gemini';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FundamentalChart } from './components/FundamentalChart';
import { NewsAnalysis } from './components/NewsAnalysis';
import { CapitalHistory } from './components/CapitalHistory';

type Tab = 'overview' | 'fundamentals' | 'news' | 'capital';

export default function App() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<StockOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    const searchSymbol = symbol.toUpperCase();
    setLoading(true);
    setError(null);
    setCurrentSymbol(searchSymbol);
    setActiveTab('overview');
    
    try {
      const result = await analyzeStock(searchSymbol);
      setAnalysis(result);
    } catch (err) {
      setError('Đã có lỗi xảy ra khi phân tích. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl tracking-tight">VNStock Insights</h1>
          <p className="text-xs uppercase tracking-widest opacity-60 mt-1">Phân tích thị trường thông minh</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Nhập mã cổ phiếu (VD: VNM, HPG...)"
            className="bg-transparent border border-[#141414] px-4 py-2 pr-10 w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </form>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!currentSymbol && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
            >
              <div className="border border-[#141414] p-8 flex flex-col gap-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-default">
                <TrendingUp className="w-8 h-8" />
                <h3 className="font-serif italic text-xl">Dữ liệu thời gian thực</h3>
                <p className="text-sm opacity-80">Truy cập dữ liệu mới nhất từ HOSE và HNX thông qua Google Search Grounding.</p>
              </div>
              <div className="border border-[#141414] p-8 flex flex-col gap-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-default">
                <BarChart3 className="w-8 h-8" />
                <h3 className="font-serif italic text-xl">Biểu đồ tài chính</h3>
                <p className="text-sm opacity-80">Trực quan hóa doanh thu, lợi nhuận, biên lợi nhuận và tốc độ tăng trưởng.</p>
              </div>
              <div className="border border-[#141414] p-8 flex flex-col gap-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-default">
                <Newspaper className="w-8 h-8" />
                <h3 className="font-serif italic text-xl">Tin tức & Tâm lý</h3>
                <p className="text-sm opacity-80">Đánh giá tâm lý thị trường qua phân tích tin tức tự động bằng AI.</p>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-serif italic text-lg">Đang phân tích dữ liệu thị trường cho {currentSymbol}...</p>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6"
            >
              {error}
            </motion.div>
          )}

          {currentSymbol && !loading && analysis && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#141414] pb-4 gap-4">
                <div>
                  <h2 className="font-serif italic text-4xl">{currentSymbol} Analysis</h2>
                  <div className="text-xs uppercase tracking-widest opacity-60 mt-2">Generated by Gemini AI</div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors", activeTab === 'overview' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                  >
                    Tổng quan
                  </button>
                  <button 
                    onClick={() => setActiveTab('fundamentals')}
                    className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors", activeTab === 'fundamentals' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                  >
                    Tài chính
                  </button>
                  <button 
                    onClick={() => setActiveTab('news')}
                    className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors", activeTab === 'news' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                  >
                    Tin tức
                  </button>
                  <button 
                    onClick={() => setActiveTab('capital')}
                    className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors", activeTab === 'capital' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                  >
                    Tăng vốn
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Stats */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="border border-[#141414] p-4">
                    <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Market Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-mono text-sm">OPEN (HOSE)</span>
                    </div>
                  </div>
                  
                  <div className="border border-[#141414] p-4">
                    <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">CafeF Links</div>
                    <ul className="space-y-2 text-sm font-mono">
                      <li><a href={`https://s.cafef.vn/${analysis.keyInfo.exchange?.toLowerCase() || 'hose'}/${currentSymbol.toLowerCase()}.chn`} target="_blank" rel="noreferrer" className="hover:underline flex items-center justify-between">Tổng quan <ArrowUpRight className="w-3 h-3" /></a></li>
                      <li><a href={`https://cafef.vn/du-lieu/${analysis.keyInfo.exchange?.toLowerCase() || 'hose'}/${currentSymbol.toLowerCase()}-tin-tuc.chn`} target="_blank" rel="noreferrer" className="hover:underline flex items-center justify-between">Tin tức <ArrowUpRight className="w-3 h-3" /></a></li>
                      <li><a href={`https://cafef.vn/du-lieu/phan-tich-bao-cao.chn`} target="_blank" rel="noreferrer" className="hover:underline flex items-center justify-between">Báo cáo phân tích <ArrowUpRight className="w-3 h-3" /></a></li>
                    </ul>
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      {/* Key Info Section */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Ngành nghề</div>
                          <div className="font-serif italic text-lg">{analysis.keyInfo.industry}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Vốn hóa</div>
                          <div className="font-serif italic text-lg">{analysis.keyInfo.marketCap}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">P/E Ratio</div>
                          <div className="font-serif italic text-lg">{analysis.keyInfo.peRatio}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Giá 52 Tuần</div>
                          <div className="font-serif italic text-lg">{analysis.keyInfo.minMax52W}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">CP Lưu hành</div>
                          <div className="font-serif italic text-lg">{analysis.keyInfo.outstandingShares}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Sở hữu Nước ngoài</div>
                          <div className="font-serif italic text-lg">{analysis.keyInfo.foreignOwnership}</div>
                        </div>
                      </div>

                      {/* Main Markdown Analysis */}
                      <div className="prose prose-sm max-w-none 
                        prose-headings:font-serif prose-headings:italic prose-headings:text-2xl prose-headings:mt-8 prose-headings:mb-4 prose-headings:border-b prose-headings:border-[#141414]/10 prose-headings:pb-2
                        prose-p:font-sans prose-p:leading-relaxed prose-p:mb-4 prose-p:text-gray-800
                        prose-strong:font-semibold prose-strong:text-[#141414]
                        prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-6 prose-ul:space-y-2
                        prose-li:text-gray-800 prose-li:leading-relaxed
                        bg-white border border-[#141414] p-6 md:p-8">
                        <Markdown>
                          {analysis.analysisMarkdown
                            .replace(/\\n/g, '\n')
                            .replace(/(## .*?)\n+/g, '$1\n\n')
                            .replace(/\n+(## )/g, '\n\n$1')}
                        </Markdown>
                      </div>

                      {/* Analyst Reports Section */}
                      {analysis.analystReports && analysis.analystReports.length > 0 && (
                        <div className="mt-12">
                          <h3 className="font-serif italic text-2xl mb-6 border-b border-[#141414] pb-2">Báo cáo Phân tích & Dự báo</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.analystReports.map((report, idx) => (
                              <div key={idx} className="border border-[#141414] p-5 bg-white flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="font-bold text-lg">{report.broker}</div>
                                    <div className="text-xs font-mono opacity-60">{report.date}</div>
                                  </div>
                                  <div className="flex gap-4 mb-4">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-widest opacity-50">Giá mục tiêu</div>
                                      <div className="font-mono font-medium">{report.targetPrice}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] uppercase tracking-widest opacity-50">Khuyến nghị</div>
                                      <div className={cn(
                                        "font-mono font-medium",
                                        report.recommendation.toUpperCase().includes('MUA') || report.recommendation.toUpperCase().includes('BUY') || report.recommendation.toUpperCase().includes('KHẢ QUAN') ? 'text-green-600' :
                                        report.recommendation.toUpperCase().includes('BÁN') || report.recommendation.toUpperCase().includes('SELL') || report.recommendation.toUpperCase().includes('KÉM KHẢ QUAN') ? 'text-red-600' :
                                        'text-yellow-600'
                                      )}>
                                        {report.recommendation}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-sm opacity-80 leading-relaxed mb-4">
                                    {report.summary}
                                  </p>
                                </div>
                                {report.url && (
                                  <a href={report.url} target="_blank" rel="noreferrer" className="text-xs font-mono hover:underline flex items-center gap-1 self-start">
                                    Xem báo cáo <ArrowUpRight className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'fundamentals' && (
                    <FundamentalChart symbol={currentSymbol} />
                  )}
                  
                  {activeTab === 'news' && (
                    <NewsAnalysis symbol={currentSymbol} />
                  )}
                  
                  {activeTab === 'capital' && (
                    <CapitalHistory symbol={currentSymbol} />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141414] p-6 mt-12 text-[10px] uppercase tracking-[0.2em] opacity-40 flex justify-between items-center">
        <div>© 2026 VNStock Insights</div>
        <div>Data powered by Google Search</div>
      </footer>
    </div>
  );
}
