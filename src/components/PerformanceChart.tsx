import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { AnalysisMetric } from '../types';

interface Props {
  data: AnalysisMetric[];
}

const PerformanceChart: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  return (
    <div className="w-full h-64 mt-4">
      <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide text-center">{t('performance.liveAnalysis')}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#4a5568" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#a0aec0', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Performance"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.4}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
