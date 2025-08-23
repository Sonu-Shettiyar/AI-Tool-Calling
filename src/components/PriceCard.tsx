 
import { StockPriceToolOutput } from "@/lib/schemas";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle  } from "./ui/card";

interface PriceCardProps {
  stock: StockPriceToolOutput;
}

export default function PriceCard({ stock }: PriceCardProps) {
  const hasChange = stock.change !== undefined && stock.changePercent !== undefined;
  const isPositive = hasChange && stock.change! > 0;
  const isNegative = hasChange && stock.change! < 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(change));
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{stock.symbol}</CardTitle>
        <div className="flex items-center space-x-2">
          <span className="text-3xl font-bold">{formatPrice(stock.price)}</span>
          {hasChange && (
            <div className={`flex items-center space-x-1 text-sm ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
            }`}>
              {isPositive && <TrendingUp className="h-4 w-4" />}
              {isNegative && <TrendingDown className="h-4 w-4" />}
              {!isPositive && !isNegative && <Minus className="h-4 w-4" />}
              <span>{formatChange(stock.change!)}</span>
              <span>({stock.changePercent!.toFixed(2)}%)</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasChange && (
          <p className="text-sm text-gray-500">No change data available</p>
        )}
        {hasChange && (
          <div className={`text-sm ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
          }`}>
            {isPositive ? '↗' : isNegative ? '↘' : '→'} 
            {isPositive ? 'Up' : isNegative ? 'Down' : 'No change'} from previous close
          </div>
        )}
      </CardContent>
    </Card>
  );
}
