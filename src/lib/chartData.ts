export function generateFundamentalData(symbol: string, period: 'QUARTER' | 'YEAR' = 'YEAR') {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const baseRevenue = 1000 + (Math.abs(hash) % 9000); // 1k to 10k billion VND
  const baseMargin = 0.05 + ((Math.abs(hash) % 20) / 100); // 5% to 25%
  
  const data = [];
  const points = period === 'YEAR' ? 5 : 8; // 5 years or 8 quarters
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  
  let prevRev = baseRevenue * 0.5;
  let prevProfit = prevRev * baseMargin;

  for (let i = points - 1; i >= 0; i--) {
    let label = '';
    if (period === 'YEAR') {
      label = `${currentYear - i - 1}`;
    } else {
      let q = currentQuarter - i - 1;
      let y = currentYear;
      while (q <= 0) {
        q += 4;
        y -= 1;
      }
      label = `Q${q}/${y}`;
    }
    
    // Growth between -10% and +30%
    const revGrowth = -0.1 + ((Math.abs(hash + i) % 40) / 100); 
    const revenue = prevRev * (1 + revGrowth);
    
    // Margin fluctuates slightly
    const margin = baseMargin + (-0.02 + ((Math.abs(hash + i * 2) % 4) / 100));
    const profit = revenue * margin;
    
    const profitGrowth = prevProfit > 0 ? (profit - prevProfit) / prevProfit : 0;
    
    data.push({
      label,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      margin: Number((margin * 100).toFixed(1)),
      revGrowth: Number((revGrowth * 100).toFixed(1)),
      profitGrowth: Number((profitGrowth * 100).toFixed(1))
    });
    
    prevRev = revenue;
    prevProfit = profit;
  }
  
  return data;
}

