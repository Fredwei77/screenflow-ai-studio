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
import { AnalysisMetric, RecordingAnalysis } from '../types';

interface Props {
  data: AnalysisMetric[];
  analysis?: RecordingAnalysis | null;
}

const PerformanceChart: React.FC<Props> = ({ data, analysis }) => {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{t('performance.liveAnalysis')}</h4>
        {analysis?.overallScore ? (
          <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-200">
            {analysis.overallScore}/100
          </span>
        ) : null}
      </div>
      <div className="h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
            <PolarGrid stroke="#4a5568" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#a0aec0', fontSize: 11 }} />
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
      {analysis && (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-xs leading-5 text-gray-300">
          {analysis.summary && <p className="rounded-lg bg-gray-800/60 p-2 text-gray-200">{analysis.summary}</p>}
          {analysis.pacing && <p><span className="text-cyan-300">节奏：</span>{analysis.pacing}</p>}
          {analysis.strengths.length > 0 && (
            <p><span className="text-green-300">亮点：</span>{analysis.strengths.slice(0, 2).join('；')}</p>
          )}
          {analysis.improvements.length > 0 && (
            <p><span className="text-amber-300">建议：</span>{analysis.improvements.slice(0, 2).join('；')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceChart;
