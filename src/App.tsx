import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, BarChart3, Newspaper, Loader2, ArrowUpRight, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { analyzeStock, StockOverview } from './services/gemini';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FundamentalChart } from './components/FundamentalChart';
import { NewsAnalysis } from './components/NewsAnalysis';
import { CapitalHistory } from './components/CapitalHistory';
import { TopStocks } from './components/TopStocks';
import BUDDHIST_QUOTES from './data/quotes.json';

type Tab = 'overview' | 'fundamentals' | 'news' | 'capital';

export function LoadingQuote() {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * BUDDHIST_QUOTES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % BUDDHIST_QUOTES.length);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const handlePrev = () => {
    setQuoteIndex((prev) => (prev - 1 + BUDDHIST_QUOTES.length) % BUDDHIST_QUOTES.length);
  };

  const handleNext = () => {
    setQuoteIndex((prev) => (prev + 1) % BUDDHIST_QUOTES.length);
  };

  return (
    <div className="mt-12 w-full max-w-3xl mx-auto p-6 md:p-8 border border-[#141414]/20 bg-white/50 rounded-lg shadow-sm">
      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4 font-mono text-center">Góc tĩnh tâm</div>
      
      <div className="relative px-10 min-h-[160px] md:min-h-[120px] flex items-center justify-center">
        <button 
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#141414] transition-colors cursor-pointer"
          title="Câu trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }} 
            transition={{ duration: 0.3 }}
            className="font-serif text-lg md:text-xl leading-relaxed italic text-gray-800"
          >
            "{BUDDHIST_QUOTES[quoteIndex]}"
          </motion.div>
        </AnimatePresence>

        <button 
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#141414] transition-colors cursor-pointer"
          title="Câu tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-8 flex justify-center gap-1.5 flex-wrap max-w-lg mx-auto">
        {BUDDHIST_QUOTES.map((_, idx) => (
          <div 
            key={idx} 
            className={cn("w-1.5 h-1.5 rounded-full transition-colors", idx === quoteIndex ? "bg-[#141414]" : "bg-[#141414]/20")}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<StockOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSelectStock = (selectedSymbol: string) => {
    setSymbol(selectedSymbol);
    const e = { preventDefault: () => {} } as React.FormEvent;
    // We need to trigger the search logic
    triggerSearch(selectedSymbol);
  };

  const triggerSearch = async (searchSymbol: string) => {
    setLoading(true);
    setError(null);
    setCurrentSymbol(searchSymbol);
    setActiveTab('overview');
    
    try {
      const result = await analyzeStock(searchSymbol);
      setAnalysis(result);
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        setError('Hệ thống đang quá tải hoặc đã hết hạn mức API (Quota Exceeded). Vui lòng thử lại sau ít phút.');
      } else {
        setError('Đã có lỗi xảy ra khi phân tích. Vui lòng thử lại.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    triggerSearch(symbol.toUpperCase());
  };

  const handleExportPDF = async () => {
    if (!currentSymbol) return;
    
    setIsExporting(true);
    
    // Wait for React to render the chart and Recharts to finish its animation
    await new Promise(resolve => setTimeout(resolve, 800));

    const element = document.getElementById('pdf-content');
    if (!element) {
      setIsExporting(false);
      return;
    }
    
    try {
      // Create a wrapper to hide the clone off-screen
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.width = '1200px';

      // Create a temporary clone of the element to format it for PDF
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Apply specific styles for the PDF clone
      clone.style.width = '1200px'; // Force desktop width
      clone.style.padding = '40px';
      clone.style.backgroundColor = '#E4E3E0';
      
      // Remove elements we don't want in the PDF
      const hiddenElements = clone.querySelectorAll('.print\\:hidden');
      hiddenElements.forEach(el => el.remove());
      
      // Fix grid layouts
      const gridElements = clone.querySelectorAll('.lg\\:col-span-3');
      gridElements.forEach(el => {
        (el as HTMLElement).style.gridColumn = 'span 4 / span 4';
      });
      
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      // Wait for browser to calculate layout and load any fonts/images
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(clone, {
        cacheBust: true,
        backgroundColor: '#E4E3E0',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      document.body.removeChild(wrapper);
      
      if (dataUrl === 'data:,') {
        throw new Error('Failed to generate image data');
      }
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`VNStock_${currentSymbol}_Analysis.pdf`);
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      alert('Không thể xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#E4E3E0]/80 backdrop-blur-md border-b border-[#141414] print:hidden">
        <div className="max-w-7xl mx-auto p-4 md:py-3 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Minh Sữa" 
              className="w-10 h-10 rounded-full object-cover border border-[#141414]"
              onError={(e) => {
                // Fallback if image is not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1 className="font-serif font-bold text-2xl tracking-tight">Minh Sữa Stock Insights</h1>
          </div>
          
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Nhập mã cổ phiếu (VD: VNM, HPG...)"
                className="bg-transparent border border-[#141414] pl-9 pr-4 py-1.5 w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all text-sm"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#141414] text-[#E4E3E0] px-4 py-1.5 text-sm font-medium hover:bg-[#141414]/80 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {!loading && <span className="hidden md:inline">Research</span>}
              {!loading && <span className="md:hidden">Tìm</span>}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!currentSymbol && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TopStocks onSelectStock={handleSelectStock} />
            </motion.div>
          )}

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-4 text-center"
            >
              <Loader2 className="w-12 h-12 animate-spin" />
              <div className="space-y-2">
                <p className="font-serif font-medium text-lg">Đang phân tích dữ liệu thị trường cho {currentSymbol}...</p>
                <p className="text-sm opacity-60 italic">Quá trình này có thể mất 3 ~ 5 phút. Vui lòng đợi trong giây lát.</p>
              </div>
              <LoadingQuote />
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
              id="pdf-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#141414] pb-4 gap-4">
                <div>
                  <h2 className="font-serif font-bold text-4xl">{currentSymbol}</h2>
                  <div className="text-xs uppercase tracking-widest opacity-60 mt-2">Generated & Desgin by Sữa Minh Minh Stock</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <div className="flex flex-wrap items-center gap-2 mr-2 md:mr-4">
                    <button 
                      onClick={() => setActiveTab('overview')}
                      className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors cursor-pointer", activeTab === 'overview' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                    >
                      Tổng quan
                    </button>
                    <button 
                      onClick={() => setActiveTab('fundamentals')}
                      className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors cursor-pointer", activeTab === 'fundamentals' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                    >
                      Tài chính
                    </button>
                    <button 
                      onClick={() => setActiveTab('news')}
                      className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors cursor-pointer", activeTab === 'news' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                    >
                      Tin tức
                    </button>
                    <button 
                      onClick={() => setActiveTab('capital')}
                      className={cn("px-4 py-2 text-sm font-mono border border-[#141414] transition-colors cursor-pointer", activeTab === 'capital' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
                    >
                      Tăng vốn
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => triggerSearch(currentSymbol!)}
                      className="px-4 py-2 text-sm font-mono border border-[#141414] hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                      title="Làm mới dữ liệu"
                    >
                      <Loader2 className={cn("w-3 h-3", loading && "animate-spin")} />
                      Làm mới
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="px-4 py-2 text-sm font-mono border border-[#141414] hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      title="Xuất PDF"
                    >
                      {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      {isExporting ? 'Đang xuất...' : 'Xuất PDF'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
                {/* Sidebar Stats */}
                <div className="lg:col-span-1 space-y-6 print:hidden">
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
                      <li><a href={analysis.keyInfo.overviewUrl || `https://s.cafef.vn/Lich-su-giao-dich-${currentSymbol.toUpperCase()}-1.chn`} target="_blank" rel="noreferrer" className="hover:underline flex items-center justify-between">Tổng quan <ArrowUpRight className="w-3 h-3" /></a></li>
                      <li><a href={`https://cafef.vn/du-lieu/${analysis.keyInfo.exchange?.toLowerCase() || 'hose'}/${currentSymbol.toLowerCase()}-tin-tuc.chn`} target="_blank" rel="noreferrer" className="hover:underline flex items-center justify-between">Tin tức <ArrowUpRight className="w-3 h-3" /></a></li>
                      <li><a href={`https://cafef.vn/du-lieu/phan-tich-bao-cao.chn`} target="_blank" rel="noreferrer" className="hover:underline flex items-center justify-between">Báo cáo phân tích <ArrowUpRight className="w-3 h-3" /></a></li>
                    </ul>
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 print:w-full">
                  {(activeTab === 'overview' || isExporting) && (
                    <div className="space-y-8">
                      {/* Key Info Section */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Giá hiện tại</div>
                          <div className="font-serif text-xl text-green-700 font-bold">{analysis.keyInfo.currentPrice}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Ngành nghề</div>
                          <div className="font-serif font-medium text-lg">{analysis.keyInfo.industry}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Vốn hóa</div>
                          <div className="font-serif font-medium text-lg">{analysis.keyInfo.marketCap}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">P/E Ratio</div>
                          <div className="font-serif font-medium text-lg">{analysis.keyInfo.peRatio}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Giá 52 Tuần</div>
                          <div className="font-serif font-medium text-lg">{analysis.keyInfo.minMax52W}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">CP Lưu hành</div>
                          <div className="font-serif font-medium text-lg">{analysis.keyInfo.outstandingShares}</div>
                        </div>
                        <div className="border border-[#141414] p-4 bg-white">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Sở hữu Nước ngoài</div>
                          <div className="font-serif font-medium text-lg">{analysis.keyInfo.foreignOwnership}</div>
                        </div>
                      </div>

                      {/* Main Markdown Analysis */}
                      <div className="prose prose-sm max-w-none 
                        prose-headings:font-serif prose-headings:font-bold prose-headings:text-2xl prose-headings:mt-8 prose-headings:mb-4 prose-headings:border-b prose-headings:border-[#141414]/10 prose-headings:pb-2
                        prose-p:font-sans prose-p:leading-relaxed prose-p:mb-4 prose-p:text-gray-800
                        prose-strong:font-semibold prose-strong:text-[#141414]
                        prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-6 prose-ul:space-y-2
                        prose-li:text-gray-800 prose-li:leading-relaxed
                        prose-table:hidden
                        bg-white border border-[#141414] p-6 md:p-8">
                        <div className="markdown-body">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {analysis.analysisMarkdown
                              .replace(/\\n/g, '\n')
                              .replace(/(#+ .*?)\n+/g, '$1\n\n')
                              .replace(/\n+(#+ )/g, '\n\n$1')}
                          </Markdown>
                        </div>
                      </div>

                      {/* Analyst Reports Section */}
                      {analysis.analystReports && analysis.analystReports.length > 0 && (
                        <div className="mt-12">
                          <h3 className="font-serif font-bold text-2xl mb-6 border-b border-[#141414] pb-2">Báo cáo Phân tích & Dự báo</h3>
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
                  
                  {(activeTab === 'fundamentals' || isExporting) && (
                    <div className={cn(isExporting && activeTab !== 'fundamentals' ? "mt-12" : "")}>
                      <FundamentalChart symbol={currentSymbol} isExporting={isExporting} />
                    </div>
                  )}
                  
                  {activeTab === 'news' && !isExporting && (
                    <NewsAnalysis symbol={currentSymbol} />
                  )}
                  
                  {activeTab === 'capital' && !isExporting && (
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
        <div>© 2026 Sữa Minh Minh Stock</div>
        <div>Data powered by Google Search</div>
      </footer>
    </div>
  );
}
