import { Filter, Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import AutoRefresh from './AutoRefresh';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  timeRanges?: FilterOption[];
  productLines?: FilterOption[];
  products?: FilterOption[];
  onFilterChange?: (filters: Record<string, string>) => void;
  onRefresh?: () => void;
  showAutoRefresh?: boolean;
}

export default function FilterBar({
  timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ],
  productLines = [
    { value: 'all', label: 'All Lines' },
    { value: 'line-1', label: 'Line 1' },
    { value: 'line-2', label: 'Line 2' },
    { value: 'line-3', label: 'Line 3' },
  ],
  products = [
    { value: 'all', label: 'All Products' },
    { value: 'prod-a', label: 'Product A' },
    { value: 'prod-b', label: 'Product B' },
    { value: 'prod-c', label: 'Product C' },
  ],
  onFilterChange,
  onRefresh,
  showAutoRefresh = true,
}: FilterBarProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'timeRange') {
      setSelectedTimeRange(value);
    } else if (key === 'line') {
      setSelectedLine(value);
    } else if (key === 'product') {
      setSelectedProduct(value);
    }

    onFilterChange?.({
      timeRange: key === 'timeRange' ? value : selectedTimeRange,
      line: key === 'line' ? value : selectedLine,
      product: key === 'product' ? value : selectedProduct,
    });
  };

  const handleReset = () => {
    setSelectedTimeRange('7d');
    setSelectedLine('all');
    setSelectedProduct('all');
    onFilterChange?.({
      timeRange: '7d',
      line: 'all',
      product: 'all',
    });
  };

  const handleRefresh = () => {
    onRefresh?.();
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 lg:p-4 bg-white border-b border-surface-200">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-surface-600">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={selectedTimeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              className="appearance-none pl-8 pr-8 py-1.5 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              aria-label="Time range filter"
            >
              {timeRanges.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedLine}
              onChange={(e) => handleFilterChange('line', e.target.value)}
              className="appearance-none px-3 pr-8 py-1.5 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              aria-label="Production line filter"
            >
              {productLines.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>

          <div className="relative hidden sm:block">
            <select
              value={selectedProduct}
              onChange={(e) => handleFilterChange('product', e.target.value)}
              className="appearance-none px-3 pr-8 py-1.5 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              aria-label="Product filter"
            >
              {products.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          </div>

          <button
            onClick={handleReset}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:ml-auto">

        {showAutoRefresh && (
          <AutoRefresh
            intervalMs={60000}
            onRefresh={handleRefresh}
            showLastUpdated={true}
          />
        )}
      </div>
    </div>
  );
}
