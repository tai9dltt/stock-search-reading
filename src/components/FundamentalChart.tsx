import React, { useState, useMemo } from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';
import { generateFundamentalData } from '../lib/chartData';
import { cn } from '../lib/utils';

export function FundamentalChart({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState<'QUARTER' | 'YEAR'>('YEAR');
  const [view, setView] = useState<'ABSOLUTE' | 'GROWTH'>('ABSOLUTE');

  const data = useMemo(() => {
    return generateFundamentalData(symbol, period);
  }, [symbol, period]);

  return (
    <div className="border border-[#141414] p-6 bg-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="font-serif font-bold text-2xl">Chỉ số tài chính</h3>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setView('ABSOLUTE')}
              className={cn("px-3 py-1 text-xs font-mono border border-[#141414] transition-colors cursor-pointer", view === 'ABSOLUTE' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
            >
              KQKD
            </button>
            <button
              onClick={() => setView('GROWTH')}
              className={cn("px-3 py-1 text-xs font-mono border border-[#141414] transition-colors cursor-pointer", view === 'GROWTH' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
            >
              Tăng trưởng
            </button>
          </div>
          <div className="w-px h-6 bg-[#141414] opacity-20 hidden md:block"></div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('QUARTER')}
              className={cn("px-3 py-1 text-xs font-mono border border-[#141414] transition-colors cursor-pointer", period === 'QUARTER' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
            >
              Theo Quý
            </button>
            <button
              onClick={() => setPeriod('YEAR')}
              className={cn("px-3 py-1 text-xs font-mono border border-[#141414] transition-colors cursor-pointer", period === 'YEAR' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100")}
            >
              Theo Năm
            </button>
          </div>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'ABSOLUTE' ? (
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#141414" />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#141414" tickFormatter={(val) => `${val} tỷ`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#8b5cf6" tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141414', color: '#E4E3E0', border: 'none', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                itemStyle={{ color: '#E4E3E0' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Biên lợi nhuận') return [`${value}%`, name];
                  return [`${value.toLocaleString('vi-VN')} tỷ`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
              <Bar yAxisId="left" dataKey="revenue" name="Doanh thu" fill="#141414" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="profit" name="LNST" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="margin" name="Biên lợi nhuận" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          ) : (
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#141414" />
              <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="#141414" tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141414', color: '#E4E3E0', border: 'none', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                itemStyle={{ color: '#E4E3E0' }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
              <Bar dataKey="revGrowth" name="Tăng trưởng Doanh thu" fill="#141414" radius={[2, 2, 0, 0]} />
              <Bar dataKey="profitGrowth" name="Tăng trưởng LNST" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-[10px] text-gray-500 font-mono uppercase text-right">
        * Dữ liệu mô phỏng cho mục đích minh họa
      </div>
    </div>
  );
}
