import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Captions,
  CheckCircle2,
  Crown,
  FileText,
  LayoutDashboard,
  Lightbulb,
  PenTool,
  Play,
  Radio,
  Rocket,
  ShieldCheck,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  getCommercialIntentEvents,
  getCommercialLeads,
  trackCommercialIntent,
  type CommercialIntentEvent,
  type CommercialLead,
} from '../lib/commercialization';

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [events, setEvents] = useState<CommercialIntentEvent[]>([]);

  const refreshCommercialData = () => {
    setLeads(getCommercialLeads());
    setEvents(getCommercialIntentEvents());
  };

  useEffect(() => {
    trackCommercialIntent('pricing_view', { source: 'commercial_workspace', feature: 'workspace_overview' });
    refreshCommercialData();
  }, []);

  const metrics = useMemo(() => {
    const upgradeClicks = events.filter((event) => event.type === 'upgrade_click').length;
    const leadSubmits = events.filter((event) => event.type === 'lead_submit').length;
    const intentByFeature = events.reduce<Record<string, number>>((acc, event) => {
      const key = event.feature || event.plan || event.source || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topFeature = Object.entries(intentByFeature).sort((a, b) => b[1] - a[1])[0]?.[0] || '等待数据';

    return [
      { label: '付费点击', value: upgradeClicks, hint: 'Pro 功能和价格页 CTA' },
      { label: '意向线索', value: leads.length || leadSubmits, hint: '已提交联系方式的客户' },
      { label: '团队需求', value: leads.filter((lead) => Number(lead.teamSize) >= 2 || lead.plan === 'Team').length, hint: '可转 Team/私有化' },
      { label: '最高意向', value: topFeature, hint: '来自本地行为事件' },
    ];
  }, [events, leads]);

  const workflows = [
    {
      icon: Video,
      title: 'AI 录课',
      description: '屏幕、摄像头、人像讲解和提词器组合，先服务老师、讲师、产品演示三类高频录制。',
      status: '已具备',
    },
    {
      icon: Radio,
      title: '会议',
      description: '多人房间、成员、聊天、投票和录制入口，验证企业培训与远程教学协作需求。',
      status: '已具备',
    },
    {
      icon: Captions,
      title: '字幕',
      description: '实时识别并导出 SRT/VTT，作为 Pro 的明确付费点。',
      status: 'Pro 锚点',
    },
    {
      icon: FileText,
      title: '摘要',
      description: '从转写提炼要点、待办、问题和表现分析，减少会后整理时间。',
      status: 'Pro 锚点',
    },
    {
      icon: PenTool,
      title: '白板',
      description: '画笔、标注、投票和互动问答，强化教学与培训场景的差异化。',
      status: '已具备',
    },
    {
      icon: Upload,
      title: '发布工作台',
      description: '标题、描述、标签、封面和多平台发布草稿，把录制结果变成可交付内容。',
      status: 'Pro 锚点',
    },
  ];

  const customerProfiles = [
    { name: '在线老师', need: '稳定录课、字幕导出、课后摘要', willingness: '按月 Pro 订阅' },
    { name: '企业培训团队', need: '会议复盘、素材归档、统一品牌', willingness: 'Team 席位和私有部署' },
    { name: '内容创作者', need: '快录快剪、封面、发布草稿', willingness: '按效率工具付费' },
  ];

  const experiments = [
    '把视频剪辑、AI 封面、多平台发布继续放在 Pro 门槛后，统计升级点击。',
    '价格页只收集高意向线索，不急于接支付，优先验证场景、频率和预算。',
    '对 Team 线索追问成员数、私有化、安全和归档需求，判断 B 端客单价。',
    '每周按 feature 统计点击和线索，决定优先打磨字幕、摘要还是发布链路。',
  ];

  const openPricing = (source: string) => {
    trackCommercialIntent('upgrade_click', { plan: 'Pro', source, feature: 'commercial_workspace' });
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gray-950 text-white">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/applications')} icon={<ShieldCheck className="h-4 w-4" />}>
              处理申请
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/record')} icon={<Play className="h-4 w-4" />}>
              体验录制
            </Button>
            <Button size="sm" onClick={() => openPricing('workspace_header')} icon={<Crown className="h-4 w-4" />}>
              验证付费
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-sm font-medium text-cyan-200">
              <LayoutDashboard className="h-4 w-4" />
              商业化产品工作台
            </div>
            <h1 className="mt-5 max-w-4xl text-[clamp(34px,4.6vw,64px)] font-black leading-[1.08] tracking-normal">
              让 ScreenFlow AI 从功能集合变成可验证付费意愿的 AI 视频工作台
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-gray-400">
              核心闭环是录制或会议开始，AI 自动生成字幕和摘要，白板增强互动，最后进入发布工作台交付成品。Pro 和 Team 不先追求完整支付系统，而是先记录功能点击、价格页访问和高意向线索。
            </p>
          </div>

          <Card className="border-cyan-500/30 bg-cyan-500/10 p-5" padding={false}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500 p-2">
                <Rocket className="h-5 w-5 text-gray-950" />
              </div>
              <div>
                <p className="text-sm text-cyan-100">当前北极星指标</p>
                <h2 className="text-xl font-bold">完成一次录制后点击 Pro 功能</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-300">
              这比单纯访问首页更接近真实付费意愿，因为用户已经经历了录制成本并看到结果交付链路。
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="p-5" padding={false}>
              <p className="text-sm text-gray-500">{metric.label}</p>
              <div className="mt-2 text-3xl font-black text-white">{metric.value}</div>
              <p className="mt-2 text-xs leading-5 text-gray-400">{metric.hint}</p>
            </Card>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-300" />
            <h2 className="text-xl font-bold">产品闭环</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workflows.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="p-5" padding={false}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-lg bg-gray-800 p-2">
                      <Icon className="h-5 w-5 text-cyan-300" />
                    </div>
                    <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-300">{item.status}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="p-5" padding={false}>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-bold">工作画像与付费假设</h2>
            </div>
            <div className="space-y-3">
              {customerProfiles.map((profile) => (
                <div key={profile.name} className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-4 md:grid-cols-[120px_minmax(0,1fr)_180px]">
                  <div className="font-semibold text-white">{profile.name}</div>
                  <div className="text-sm text-gray-400">{profile.need}</div>
                  <div className="text-sm font-medium text-cyan-300">{profile.willingness}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5" padding={false}>
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-300" />
              <h2 className="text-xl font-bold">验证计划</h2>
            </div>
            <div className="space-y-3">
              {experiments.map((experiment) => (
                <div key={experiment} className="flex gap-3 text-sm leading-6 text-gray-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{experiment}</span>
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full" onClick={() => openPricing('workspace_validation_plan')} icon={<Crown className="h-4 w-4" />}>
              提交 Pro / Team 意向
            </Button>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-5" padding={false}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">最新线索</h2>
              <Button size="sm" variant="secondary" onClick={() => navigate('/applications')}>
                查看全部
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {leads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-800 p-4 text-sm text-gray-500">暂无线索。前往价格页提交一次 Pro 或 Team 意向即可在这里看到。</p>
              ) : (
                leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{lead.name || lead.contact}</div>
                      <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-200">{lead.plan}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{lead.useCase} · {lead.teamSize} 人 · {lead.contact}</p>
                    <p className="mt-1 font-mono text-xs text-gray-500">{lead.applicationNo} · {formatDateTime(lead.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5" padding={false}>
            <h2 className="text-xl font-bold">最近商业意向事件</h2>
            <div className="mt-4 space-y-3">
              {events.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-800 p-4 text-sm text-gray-500">暂无事件。点击 Pro 功能、访问价格页或提交线索后会写入本地事件池。</p>
              ) : (
                events.slice(0, 8).map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                    <div>
                      <div className="text-sm font-semibold">{event.type}</div>
                      <div className="text-xs text-gray-500">{event.feature || event.plan || event.source || event.path}</div>
                    </div>
                    <div className="text-xs text-gray-500">{formatDateTime(event.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};
