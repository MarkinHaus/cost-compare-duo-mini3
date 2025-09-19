import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type ContributionItem = {
  date: number | Date;
  count: number;
};

type ContributionsCalendarProps = {
  contributions: Array<ContributionItem>;
  weeks?: number;
  isLoading?: boolean;
  className?: string;
};

type TooltipData = {
  x: number;
  y: number;
  date: Date;
  count: number;
  level: number;
};

// --- COLOR SCHEME ---
const CONTRIBUTION_COLORS = {
  0: "#ebedf0", // No contributions
  1: "#9be9a8", // Low contributions
  2: "#40c463", // Medium-low contributions  
  3: "#30a14e", // Medium-high contributions
  4: "#216e39", // High contributions
} as const;

const CONTRIBUTION_LEVELS = [
  "No contributions",
  "1-3 contributions", 
  "4-6 contributions",
  "7-9 contributions",
  "10+ contributions"
];

// --- UTILITY FUNCTIONS ---
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

// --- MAIN COMPONENT ---
export default function ContributionsCalendar({
  contributions = [],
  weeks = 53,
  isLoading = false,
  className,
}: ContributionsCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [showLegendTooltip, setShowLegendTooltip] = useState(false);

  // Process contributions data
  const contributionMap = useMemo(() => {
    const map = new Map<string, number>();
    
    contributions.forEach(item => {
      const date = item.date instanceof Date ? item.date : new Date(item.date);
      if (!isNaN(date.getTime())) {
        const key = formatDate(getStartOfDay(date));
        map.set(key, (map.get(key) || 0) + item.count);
      }
    });
    
    return map;
  }, [contributions]);

  // Generate calendar grid
  const { calendarGrid, startDate, maxCount } = useMemo(() => {
    const today = getStartOfDay(new Date());
    const startDate = addDays(today, -(weeks * 7 - 1));
    
    // Adjust start date to Sunday
    const dayOfWeek = startDate.getDay();
    const adjustedStartDate = addDays(startDate, -dayOfWeek);
    
    const maxCount = Math.max(...Array.from(contributionMap.values()), 1);
    
    // Create grid: 7 rows (days) x weeks columns
    const grid = Array.from({ length: 7 }, () => Array(weeks).fill(null));
    
    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < 7; day++) {
        const date = addDays(adjustedStartDate, week * 7 + day);
        const count = contributionMap.get(formatDate(date)) || 0;
        
        let level = 0;
        if (count > 0) {
          const percentage = count / maxCount;
          if (percentage >= 0.75) level = 4;
          else if (percentage >= 0.5) level = 3;
          else if (percentage >= 0.25) level = 2;
          else level = 1;
        }
        
        grid[day][week] = { date, count, level };
      }
    }
    
    return { calendarGrid: grid, startDate: adjustedStartDate, maxCount };
  }, [contributionMap, weeks]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let currentMonth = -1;
    
    for (let week = 0; week < weeks; week++) {
      const date = addDays(startDate, week * 7);
      const month = date.getMonth();
      
      if (month !== currentMonth) {
        // Only add label if there's enough space (at least 3 weeks from end)
        if (week <= weeks - 3) {
          labels.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            week,
          });
        }
        currentMonth = month;
      }
    }
    
    return labels;
  }, [startDate, weeks]);

  const handleCellMouseEnter = (e: React.MouseEvent, cell: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      date: cell.date,
      count: cell.count,
      level: cell.level,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className={cn("select-none", className)}>
      <div className="flex flex-col gap-1">
        {/* Month Labels */}
        <div className="relative" style={{ marginLeft: '15px', height: '16px', width: `${weeks * 14}px` }}>
          {monthLabels.map(({ month, week }) => (
            <div
              key={`${month}-${week}`}
              className="absolute text-xs text-gray-600"
              style={{ 
                left: `${week * 14}px`,
                top: '0px',
                minWidth: '28px', // Minimum width to prevent overlap
              }}
            >
              {month}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Day Labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div
                key={day}
                className="text-xs text-gray-600 text-right"
                style={{ 
                  height: '11px',
                  width: '14px',
                  lineHeight: '11px',
                  visibility: index % 2 === 1 ? 'visible' : 'hidden'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="flex flex-col gap-0.5">
            {calendarGrid.map((row, dayIndex) => (
              <div key={dayIndex} className="flex gap-0.5">
                {row.map((cell, weekIndex) => (
                  <div
                    key={`${dayIndex}-${weekIndex}`}
                    className="w-[11px] h-[11px] rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-gray-400"
                    style={{ 
                      backgroundColor: isLoading 
                        ? '#f0f0f0' 
                        : CONTRIBUTION_COLORS[cell.level as keyof typeof CONTRIBUTION_COLORS]
                    }}
                    onMouseEnter={(e) => !isLoading && handleCellMouseEnter(e, cell)}
                    onMouseLeave={handleCellMouseLeave}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
        <div 
          className="flex items-center gap-1 cursor-help relative"
          onMouseEnter={() => setShowLegendTooltip(true)}
          onMouseLeave={() => setShowLegendTooltip(false)}
        >
          <span>Learn how we count contributions</span>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>

          {/* Legend Tooltip */}
          {showLegendTooltip && (
            <div className="absolute bottom-full left-0 mb-2 p-3 text-xs bg-white border border-gray-200 rounded-lg shadow-lg whitespace-nowrap z-50">
              <div className="font-medium mb-2">Contribution levels:</div>
              {CONTRIBUTION_LEVELS.map((description, index) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                  <div
                    className="w-[11px] h-[11px] rounded-sm flex-shrink-0"
                    style={{ backgroundColor: CONTRIBUTION_COLORS[index as keyof typeof CONTRIBUTION_COLORS] }}
                  />
                  <span>{description}</span>
                </div>
              ))}
              <div className="mt-2 text-gray-500">
                Contributions are counted based on your daily activity.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span>Less</span>
          {Object.entries(CONTRIBUTION_COLORS).map(([level, color]) => (
            <div
              key={level}
              className="w-[11px] h-[11px] rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Main Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltip.x,
            top: tooltip.y - 5,
          }}
        >
          <div className="whitespace-nowrap">
            {tooltip.count} contribution{tooltip.count !== 1 ? 's' : ''} on{' '}
            {tooltip.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="animate-pulse text-sm text-gray-500">Loading contributions...</div>
        </div>
      )}
    </div>
  );
}