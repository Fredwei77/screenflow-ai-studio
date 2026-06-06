import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Captions,
  Crown,
  FileText,
  LayoutDashboard,
  LogIn,
  PenTool,
  Plus,
  Sparkles,
  Video,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { generateMeetingId } from '../lib/formatters';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('screenflow-username') || '');
  const isEnglish = !i18n.language?.startsWith('zh');
  const headlineLines = t('home.headlineLines', { returnObjects: true }) as string[];
  const outcomeMetrics = isEnglish
    ? [
        { value: '5-in-1', label: 'Record, subtitle, summarize, annotate, publish' },
        { value: '350kbps', label: 'Bandwidth-aware meeting video mode' },
        { value: 'Pro', label: 'Application flow for paid intent validation' },
      ]
    : [
        { value: '5 合 1', label: '录制、字幕、摘要、标注、发布一体化' },
        { value: '350kbps', label: '适合小带宽部署的视频会议模式' },
        { value: 'Pro', label: '内测申请链路验证付费意愿' },
      ];
  const monetizationSteps = isEnglish
    ? [
        'Capture user intent through the Pro application form',
        'Review leads in the application workspace',
        'Convert training teams into Pro or private deployment customers',
      ]
    : [
        '通过 Pro 申请表采集真实使用场景和付费意愿',
        '在申请清单中完成审核、通过和拒绝处理',
        '将培训团队转化为 Pro 订阅或私有化部署客户',
      ];

  const valueProps = useMemo(
    () => [
      {
        title: t('home.valueProps.recordingTitle'),
        description: t('home.valueProps.recordingDesc'),
        icon: Video,
        tag: 'MODULE 01',
      },
      {
        title: t('home.valueProps.subtitlesTitle'),
        description: t('home.valueProps.subtitlesDesc'),
        icon: Captions,
        tag: 'MODULE 02',
      },
      {
        title: t('home.valueProps.summaryTitle'),
        description: t('home.valueProps.summaryDesc'),
        icon: FileText,
        tag: 'MODULE 03',
      },
      {
        title: t('home.valueProps.whiteboardTitle'),
        description: t('home.valueProps.whiteboardDesc'),
        icon: PenTool,
        tag: 'MODULE 04',
      },
    ],
    [t]
  );

  const handleCreateRoom = () => {
    const name = userName.trim() || t('common.anonymous');
    localStorage.setItem('screenflow-username', name);
    const newId = generateMeetingId();
    navigate(`/meeting/${newId}?name=${encodeURIComponent(name)}&host=true`);
  };

  const handleJoinRoom = () => {
    if (!meetingId.trim()) return;
    const name = userName.trim() || t('common.anonymous');
    localStorage.setItem('screenflow-username', name);
    navigate(`/meeting/${meetingId.trim()}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f5f7fb] text-[#10233f]">
      <header className="border-b border-slate-200 bg-[#f5f7fb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-none border border-slate-300 bg-white">
              <Video className="h-5 w-5 text-[#143a6f]" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-600">SCREENFLOW AI</div>
              <div className="mt-1 text-xs uppercase text-slate-400">Consulting-grade video workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/workspace')}
              className="hidden items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 md:inline-flex"
            >
              <LayoutDashboard className="h-4 w-4" />
              产品工作台
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="hidden items-center gap-2 border border-[#163a70] bg-[#163a70] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#102b52] sm:inline-flex"
            >
              <Crown className="h-4 w-4" />
              {t('home.proBeta')}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-start">
          <div className="border border-slate-200 bg-white">
            <div className="grid gap-8 border-b border-slate-200 px-6 py-4 text-[11px] uppercase text-slate-400 sm:grid-cols-3">
              <div>{t('home.tagline')}</div>
              <div className="text-left sm:text-center">Boardroom-ready interface system</div>
              <div className="text-left sm:text-right">Edition 2026</div>
            </div>

            <div className="grid gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <div className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium uppercase text-[#143a6f]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Executive transformation workflow
                </div>
                <div className="mt-6 flex items-start justify-between gap-6">
                  <div>
                    <div className="text-xs uppercase text-slate-400">Strategic position</div>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{t('home.description')}</p>
                  </div>
                </div>

                <h1
                  className={
                    isEnglish
                      ? 'mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] text-[#0f2747] sm:text-6xl xl:text-7xl'
                      : 'mt-8 max-w-4xl text-5xl font-semibold leading-[1.08] text-[#0f2747] sm:text-6xl xl:text-7xl'
                  }
                >
                  {headlineLines.map((line, index) => (
                    <span
                      key={line}
                      className={`block ${index === headlineLines.length - 1 ? 'mt-2 text-[#40648f]' : ''}`}
                    >
                      {line}
                    </span>
                  ))}
                </h1>

                <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <div className="text-xs uppercase text-slate-400">Core thesis</div>
                    <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
                      以录制为入口，以 AI 理解为中台，以发布交付为终点，把一次性的视频生产转化为可衡量、可复用、可规模化的知识资产。
                    </p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <div className="text-xs uppercase text-slate-400">Operating model</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase text-slate-500">
                      <span className="border border-slate-200 px-2 py-1">Capture</span>
                      <span className="border border-slate-200 px-2 py-1">Synthesize</span>
                      <span className="border border-slate-200 px-2 py-1">Distribute</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate('/record')}
                    icon={<Video className="h-5 w-5" />}
                    className="rounded-none border border-[#163a70] bg-[#163a70] px-7 shadow-none hover:bg-[#102b52] focus-visible:ring-[#163a70]"
                  >
                    {t('home.startRecording')}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => navigate('/workspace')}
                    icon={<LayoutDashboard className="h-5 w-5" />}
                    className="rounded-none border-slate-300 bg-white px-7 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    产品工作台
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => navigate('/pricing')}
                    icon={<ArrowRight className="h-5 w-5" />}
                    className="rounded-none border border-transparent px-4 text-[#163a70] hover:bg-slate-100 hover:text-[#102b52]"
                  >
                    {t('home.viewPricing')}
                  </Button>
                </div>
              </div>

              <aside className="border border-slate-200 bg-[#f8fafc] p-5">
                <div className="text-[11px] uppercase text-slate-400">Primary path</div>
                <div className="mt-4 space-y-4">
                  {[
                    'Capture course, meeting, and screen context',
                    'Synthesize subtitles, summaries, and decisions',
                    'Distribute reusable assets across channels',
                  ].map((item, index) => (
                    <div key={item} className="flex gap-3 border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                      <div className="text-sm font-semibold text-[#163a70]">0{index + 1}</div>
                      <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>

          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="text-[11px] uppercase text-slate-400">Workspace entry</div>
              <h2 className="mt-3 text-2xl font-semibold text-[#0f2747]">{t('home.entryTitle')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t('home.entryDesc')}</p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">{t('home.yourName')}</label>
                <input
                  placeholder={t('home.namePlaceholder')}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[#163a70] focus:outline-none"
                />
              </div>

              <div className="border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white">
                    <Plus className="h-5 w-5 text-[#163a70]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{t('home.createMeeting')}</h3>
                    <p className="text-sm text-slate-500">{t('home.createMeetingDesc')}</p>
                  </div>
                </div>
                <Button
                  onClick={handleCreateRoom}
                  size="lg"
                  className="w-full rounded-none border border-[#163a70] bg-[#163a70] shadow-none hover:bg-[#102b52] focus-visible:ring-[#163a70]"
                  icon={<Plus className="h-5 w-5" />}
                >
                  {t('home.newMeeting')}
                </Button>
              </div>

              <div className="border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-slate-50">
                    <LogIn className="h-5 w-5 text-[#163a70]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{t('home.joinMeeting')}</h3>
                    <p className="text-sm text-slate-500">{t('home.joinMeetingDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    placeholder={t('home.meetingCode')}
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 border border-slate-300 bg-white px-4 py-3 text-slate-900 uppercase placeholder:text-slate-400 focus:border-[#163a70] focus:outline-none"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoinRoom}
                    variant="secondary"
                    disabled={!meetingId.trim()}
                    icon={<LogIn className="h-4 w-4" />}
                    className="rounded-none border-slate-300 bg-white px-5 text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {t('home.join')}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
          {valueProps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[11px] uppercase text-slate-400">{item.tag}</div>
                  <Icon className="h-5 w-5 text-[#163a70]" />
                </div>
                <h2 className="mt-8 text-lg font-semibold text-[#0f2747]">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-8 grid border border-slate-200 bg-white lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="p-6 sm:p-8">
            <div className="text-[11px] uppercase text-slate-400">Commercial conversion layer</div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-[#0f2747] sm:text-4xl">
              {isEnglish ? 'From usable product to paid-intent validation.' : '从可用产品，到可验证付费意愿。'}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {isEnglish
                ? 'ScreenFlow AI is designed not only as a recording tool, but as a commercial workflow that captures demand, qualifies Pro users, and prepares teams for paid delivery.'
                : 'ScreenFlow AI 不只是录课工具，而是一条可商业化的工作流：采集需求、筛选 Pro 用户，并为团队付费交付做准备。'}
            </p>
            <div className="mt-8 grid gap-px bg-slate-200 sm:grid-cols-3">
              {outcomeMetrics.map((metric) => (
                <div key={metric.value} className="bg-[#f8fafc] p-5">
                  <div className="text-3xl font-semibold text-[#163a70]">{metric.value}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-[#0f2747] p-6 text-white lg:border-l lg:border-t-0 sm:p-8">
            <div className="text-[11px] uppercase text-[#8fb4e8]">Revenue path</div>
            <div className="mt-5 space-y-5">
              {monetizationSteps.map((step, index) => (
                <div key={step} className="flex gap-4 border-t border-white/15 pt-5 first:border-t-0 first:pt-0">
                  <div className="text-lg font-semibold text-[#8fb4e8]">0{index + 1}</div>
                  <p className="text-sm leading-6 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 border border-white bg-white px-5 py-3 text-sm font-semibold text-[#0f2747] transition hover:bg-[#edf4ff]"
            >
              <Crown className="h-4 w-4" />
              {isEnglish ? 'Validate Pro demand' : '验证 Pro 付费意愿'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
