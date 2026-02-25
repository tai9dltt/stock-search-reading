import React, { useEffect, useState } from 'react';
import { analyzeNews, NewsAnalysis as NewsAnalysisType } from '../services/gemini';
import { Loader2, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

export function NewsAnalysis({ symbol }: { symbol: string }) {
  const [data, setData] = useState<NewsAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    analyzeNews(symbol)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          setError('Không thể tải phân tích tin tức.');
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="border border-[#141414] p-6 bg-white flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="font-mono text-sm">Đang phân tích tin tức thị trường...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-[#141414] p-6 bg-white flex items-center justify-center min-h-[300px] text-red-500 font-mono text-sm">
        {error || 'No data available'}
      </div>
    );
  }

  const SentimentIcon = data.sentiment === 'POSITIVE' ? TrendingUp : data.sentiment === 'NEGATIVE' ? TrendingDown : Minus;
  const sentimentColor = data.sentiment === 'POSITIVE' ? 'text-green-600' : data.sentiment === 'NEGATIVE' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="border border-[#141414] p-6 bg-white">
      <h3 className="font-serif italic text-2xl mb-6">Phân tích Tin tức & Tâm lý</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-1 border border-[#141414] p-6 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Market Sentiment</div>
          <SentimentIcon className={cn("w-12 h-12 mb-2", sentimentColor)} />
          <div className={cn("font-serif italic text-3xl", sentimentColor)}>{data.sentiment}</div>
          <div className="font-mono text-sm mt-2 opacity-70">Score: {data.score}/100</div>
        </div>
        
        <div className="col-span-1 md:col-span-2 border border-[#141414] p-6">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">AI Summary</div>
          <p className="font-sans text-sm leading-relaxed">{data.summary}</p>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Recent Articles</div>
        <div className="space-y-4">
          {data.articles.map((article, idx) => (
            <a 
              key={idx} 
              href={article.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block border border-[#141414] p-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors group"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-serif font-medium mb-1 group-hover:underline">{article.title}</h4>
                  <div className="flex items-center gap-3 text-xs font-mono opacity-60">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{article.date}</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
          {data.articles.length === 0 && (
            <div className="text-sm font-mono opacity-50 italic">Không tìm thấy bài báo nào gần đây.</div>
          )}
        </div>
      </div>
    </div>
  );
}
