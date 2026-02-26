import React, { useEffect, useState, useMemo } from 'react';
import { getTopInterestedStocks, TopStock } from '../services/gemini';
import { Loader2, TrendingUp, ArrowUp, ArrowDown, Activity, ArrowUpDown, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { LoadingQuote } from '../App';

interface TopStocksProps {
  onSelectStock: (symbol: string) => void;
}

type SortConfig = {
  key: keyof TopStock;
  direction: 'asc' | 'desc';
} | null;

export function TopStocks({ onSelectStock }: TopStocksProps) {
  const [stocks, setStocks] = useState<TopStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    getTopInterestedStocks().then((data) => {
      setStocks(data);
      setLoading(false);
    });
  }, []);

  const parseValue = (val: string) => {
    // Remove non-numeric characters except dots and minus signs
    const cleaned = val.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const sortedStocks = useMemo(() => {
    if (!sortConfig) return stocks;

    return [...stocks].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (sortConfig.key === 'symbol') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const numA = parseValue(aVal);
      const numB = parseValue(bVal);

      return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    });
  }, [stocks, sortConfig]);

  const requestSort = (key: keyof TopStock) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof TopStock) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-[#141414]" /> 
      : <ArrowDown className="w-3 h-3 text-[#141414]" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="font-serif font-medium text-lg">Đang cập nhật danh sách 30 cổ phiếu tâm điểm...</p>
        <LoadingQuote />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6" />
        <h2 className="font-serif font-bold text-2xl">Top 30 Cổ phiếu Tâm điểm Hôm nay</h2>
      </div>

      <div className="border border-[#141414] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414] bg-gray-50">
                <th 
                  className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => requestSort('symbol')}
                >
                  <div className="flex items-center gap-2">Mã CP {getSortIcon('symbol')}</div>
                </th>
                <th 
                  className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => requestSort('price')}
                >
                  <div className="flex items-center gap-2">Giá {getSortIcon('price')}</div>
                </th>
                <th 
                  className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => requestSort('changeDay')}
                >
                  <div className="flex items-center gap-2">Ngày {getSortIcon('changeDay')}</div>
                </th>
                <th 
                  className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => requestSort('changeWeek')}
                >
                  <div className="flex items-center gap-2">Tuần {getSortIcon('changeWeek')}</div>
                </th>
                <th 
                  className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => requestSort('changeMonth')}
                >
                  <div className="flex items-center gap-2">Tháng {getSortIcon('changeMonth')}</div>
                </th>
                <th className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold">Khối lượng</th>
                <th 
                  className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => requestSort('foreignNet')}
                >
                  <div className="flex items-center gap-2">Khối ngoại {getSortIcon('foreignNet')}</div>
                </th>
                <th className="py-4 px-6 text-[10px] uppercase tracking-widest opacity-50 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((stock, idx) => {
                const isPositiveDay = stock.changeDay.includes('+');
                const isNegativeDay = stock.changeDay.includes('-');
                const isPositiveWeek = stock.changeWeek.includes('+');
                const isNegativeWeek = stock.changeWeek.includes('-');
                const isPositiveMonth = stock.changeMonth.includes('+');
                const isNegativeMonth = stock.changeMonth.includes('-');
                
                const isForeignBuy = stock.foreignNet.toLowerCase().includes('mua');
                const isForeignSell = stock.foreignNet.toLowerCase().includes('bán');
                const foreignValue = parseValue(stock.foreignNet);
                const isStrongForeign = foreignValue >= 50; // Threshold for "strong" warning

                return (
                  <tr key={idx} className="border-b border-[#141414]/10 hover:bg-gray-50 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-serif font-bold text-lg">{stock.symbol}</span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-sm">
                      {stock.price}
                    </td>
                    <td className="py-4 px-6">
                      <div className={cn(
                        "flex items-center gap-1 font-mono font-bold text-sm",
                        isPositiveDay ? "text-green-600" : isNegativeDay ? "text-red-600" : ""
                      )}>
                        {isPositiveDay && <ArrowUp className="w-3 h-3" />}
                        {isNegativeDay && <ArrowDown className="w-3 h-3" />}
                        {stock.changeDay}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={cn(
                        "flex items-center gap-1 font-mono font-medium text-sm",
                        isPositiveWeek ? "text-green-600" : isNegativeWeek ? "text-red-600" : ""
                      )}>
                        {stock.changeWeek}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={cn(
                        "flex items-center gap-1 font-mono font-medium text-sm",
                        isPositiveMonth ? "text-green-600" : isNegativeMonth ? "text-red-600" : ""
                      )}>
                        {stock.changeMonth}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-mono text-xs opacity-80">
                        <Activity className="w-3 h-3" />
                        {stock.volumeChange}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={cn(
                        "flex items-center gap-2 font-mono text-xs font-bold",
                        isForeignBuy ? "text-blue-600" : isForeignSell ? "text-orange-600" : ""
                      )}>
                        {isStrongForeign && <ShieldAlert className="w-3 h-3 animate-pulse" />}
                        {stock.foreignNet}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => onSelectStock(stock.symbol)}
                        className="text-[10px] uppercase tracking-widest font-bold border border-[#141414] px-3 py-1 hover:bg-[#141414] hover:text-white transition-all cursor-pointer"
                      >
                        Phân tích
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 text-[10px] text-gray-500 font-mono uppercase text-right italic">
        * Dữ liệu được tổng hợp thời gian thực qua Google Search Grounding
      </div>
    </div>
  );
}
