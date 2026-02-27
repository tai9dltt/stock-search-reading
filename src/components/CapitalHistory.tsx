import React, { useEffect, useState } from 'react';
import { analyzeCapitalHistory, CapitalEvent } from '../services/gemini';
import { Loader2, History } from 'lucide-react';

export function CapitalHistory({ symbol }: { symbol: string }) {
  const [data, setData] = useState<CapitalEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    analyzeCapitalHistory(symbol)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error(err);
          if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
            setError('Hệ thống đang quá tải hoặc đã hết hạn mức API. Vui lòng thử lại sau ít phút.');
          } else {
            setError('Không thể tải lịch sử tăng vốn.');
          }
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="border border-[#141414] p-6 bg-white flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="font-mono text-sm">Đang tổng hợp lịch sử tăng vốn...</p>
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

  return (
    <div className="border border-[#141414] p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6" />
        <h3 className="font-serif font-bold text-2xl">Lịch sử Tăng vốn & Phát hành</h3>
      </div>
      
      {data.length === 0 ? (
        <div className="text-sm font-mono opacity-50 italic py-8 text-center">
          Không tìm thấy dữ liệu lịch sử tăng vốn đáng kể nào gần đây.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414]">
                <th className="py-3 px-4 text-[10px] uppercase tracking-widest opacity-50 font-normal">Thời gian</th>
                <th className="py-3 px-4 text-[10px] uppercase tracking-widest opacity-50 font-normal">Sự kiện / Hình thức</th>
                <th className="py-3 px-4 text-[10px] uppercase tracking-widest opacity-50 font-normal text-right">Khối lượng thêm</th>
                <th className="py-3 px-4 text-[10px] uppercase tracking-widest opacity-50 font-normal text-right">Vốn / CP Lưu hành sau sự kiện</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-b border-[#141414]/10 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm whitespace-nowrap">{item.date}</td>
                  <td className="py-4 px-4 font-sans text-sm font-medium">{item.event}</td>
                  <td className="py-4 px-4 font-mono text-sm text-right text-green-600">{item.additionalShares}</td>
                  <td className="py-4 px-4 font-mono text-sm text-right font-semibold">{item.totalSharesAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6 text-[10px] text-gray-500 font-mono uppercase text-right">
        * Nguồn dữ liệu: Tổng hợp từ CafeF
      </div>
    </div>
  );
}
