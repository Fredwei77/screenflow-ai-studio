import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, FileText, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  getCommercialLeads,
  updateCommercialLeadStatus,
  type CommercialLead,
} from '../lib/commercialization';

const statusMeta: Record<CommercialLead['status'], { label: string; className: string; icon: typeof Clock3 }> = {
  submitted: { label: '已提交', className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200', icon: FileText },
  reviewing: { label: '审核中', className: 'border-amber-500/30 bg-amber-500/10 text-amber-200', icon: Clock3 },
  approved: { label: '已通过', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', icon: CheckCircle2 },
  rejected: { label: '未通过', className: 'border-red-500/30 bg-red-500/10 text-red-200', icon: XCircle },
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refreshLeads = () => {
    const nextLeads = getCommercialLeads();
    setLeads(nextLeads);
    setSelectedId((current) => current || nextLeads[0]?.id || null);
  };

  useEffect(() => {
    refreshLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return leads;
    return leads.filter((lead) =>
      [
        lead.applicationNo,
        lead.name,
        lead.contact,
        lead.plan,
        lead.role,
        lead.useCase,
        lead.message,
      ].some((value) => value?.toLowerCase().includes(keyword))
    );
  }, [leads, query]);

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedId) || filteredLeads[0] || null;

  const counts = useMemo(() => ({
    submitted: leads.filter((lead) => lead.status === 'submitted').length,
    reviewing: leads.filter((lead) => lead.status === 'reviewing').length,
    approved: leads.filter((lead) => lead.status === 'approved').length,
    rejected: leads.filter((lead) => lead.status === 'rejected').length,
  }), [leads]);

  const changeStatus = (status: CommercialLead['status']) => {
    if (!selectedLead) return;
    updateCommercialLeadStatus(selectedLead.id, status);
    refreshLeads();
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gray-950 text-white">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/workspace')} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            返回产品工作台
          </button>
          <Button size="sm" variant="secondary" onClick={() => navigate('/pricing')}>
            打开申请入口
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-200">
              <ShieldCheck className="h-4 w-4" />
              Pro 申请管理
            </div>
            <h1 className="mt-4 text-[clamp(30px,4vw,52px)] font-black leading-tight">查看并处理 Pro / Team 申请表</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              当前版本先把申请保存在本机浏览器 localStorage，用于验证付费意愿。接入后端或 CRM 后，这里可以替换为真实线索管理后台。
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(Object.entries(statusMeta) as [CommercialLead['status'], (typeof statusMeta)[CommercialLead['status']]][]).map(([status, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={status} className={`rounded-lg border px-3 py-2 ${meta.className}`}>
                  <div className="flex items-center gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </div>
                  <div className="mt-1 text-2xl font-black">{counts[status]}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="p-4" padding={false}>
            <div className="mb-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索编号、姓名、联系方式、用途"
                label="搜索申请"
              />
            </div>
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {filteredLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-800 p-6 text-center text-sm text-gray-500">
                  <Search className="mx-auto mb-2 h-6 w-6" />
                  暂无申请。请先到 pricing 页面提交一次 Pro 或 Team 意向。
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const meta = statusMeta[lead.status];
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedId(lead.id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        isSelected ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-white">{lead.name || lead.contact || '未命名申请'}</div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${meta.className}`}>{meta.label}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">{lead.plan} · {lead.useCase || '未填写用途'}</div>
                      <div className="mt-1 font-mono text-xs text-gray-500">{lead.applicationNo}</div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-5" padding={false}>
            {selectedLead ? (
              <div>
                <div className="flex flex-col gap-4 border-b border-gray-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-mono text-sm text-gray-500">{selectedLead.applicationNo}</div>
                    <h2 className="mt-2 text-2xl font-bold">{selectedLead.name || '未命名申请'}</h2>
                    <p className="mt-2 text-sm text-gray-400">{selectedLead.plan} · {selectedLead.useCase}</p>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${statusMeta[selectedLead.status].className}`}>
                    {React.createElement(statusMeta[selectedLead.status].icon, { className: 'h-4 w-4' })}
                    当前状态：{statusMeta[selectedLead.status].label}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">处理申请</div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        点击下面按钮会立即更新本地申请状态，并刷新左侧清单与顶部统计。
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        onClick={() => changeStatus('reviewing')}
                        disabled={selectedLead.status === 'reviewing'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Clock3 className="h-4 w-4" />
                        开始审核
                      </button>
                      <button
                        onClick={() => changeStatus('approved')}
                        disabled={selectedLead.status === 'approved'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        通过申请
                      </button>
                      <button
                        onClick={() => changeStatus('rejected')}
                        disabled={selectedLead.status === 'rejected'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        拒绝申请
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoItem label="联系方式" value={selectedLead.contact} />
                  <InfoItem label="身份" value={selectedLead.role || '未填写'} />
                  <InfoItem label="团队人数" value={`${selectedLead.teamSize || '1'} 人`} />
                  <InfoItem label="来源" value={selectedLead.source} />
                  <InfoItem label="创建时间" value={formatDateTime(selectedLead.createdAt)} />
                  <InfoItem label="更新时间" value={formatDateTime(selectedLead.updatedAt)} />
                </div>

                <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                  <div className="text-sm font-semibold text-gray-300">付费意愿 / 补充说明</div>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{selectedLead.message || '未填写'}</p>
                </div>

                <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <div className="text-sm font-semibold text-cyan-200">建议处理动作</div>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    标记为“审核中”后联系用户确认录课频率、预算和最需要的 Pro 功能；确认愿意继续试用或付费后标记“已通过”。
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-gray-500">选择左侧申请查看详情</div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-1 break-words text-sm font-medium text-gray-100">{value}</div>
  </div>
);
