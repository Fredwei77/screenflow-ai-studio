import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Captions, Crown, FileText, LogIn, PenTool, Plus, Sparkles, Video } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { generateMeetingId } from '../lib/formatters';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('screenflow-username') || '');
  const isEnglish = !i18n.language?.startsWith('zh');
  const headlineLines = t('home.headlineLines', { returnObjects: true }) as string[];

  const valueProps = useMemo(() => [
    {
      title: t('home.valueProps.recordingTitle'),
      description: t('home.valueProps.recordingDesc'),
      icon: Video,
      tone: 'bg-indigo-500/15 text-indigo-200 border-indigo-500/25',
    },
    {
      title: t('home.valueProps.subtitlesTitle'),
      description: t('home.valueProps.subtitlesDesc'),
      icon: Captions,
      tone: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/25',
    },
    {
      title: t('home.valueProps.summaryTitle'),
      description: t('home.valueProps.summaryDesc'),
      icon: FileText,
      tone: 'bg-violet-500/15 text-violet-200 border-violet-500/25',
    },
    {
      title: t('home.valueProps.whiteboardTitle'),
      description: t('home.valueProps.whiteboardDesc'),
      icon: PenTool,
      tone: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25',
    },
  ], [t]);

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
    <div className="min-h-screen overflow-y-auto bg-gray-950 text-white">
      <header className="border-b border-gray-900 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-950/30">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">ScreenFlow AI</div>
              <div className="text-xs text-gray-500">{t('home.workspace')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="hidden items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20 sm:inline-flex"
            >
              <Crown className="h-4 w-4" />
              {t('home.proBeta')}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:items-start lg:gap-14 lg:py-16">
        <section className="max-w-4xl">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-sm font-medium leading-none text-cyan-200">
            <Sparkles className="h-4 w-4" />
            {t('home.tagline')}
          </div>
          <h1
            className={
              isEnglish
                ? 'max-w-[860px] text-[clamp(42px,4.55vw,72px)] font-black leading-[1.02] tracking-normal text-white'
                : 'max-w-[860px] text-[clamp(40px,5vw,76px)] font-black leading-[1.08] tracking-normal text-white'
            }
          >
            {headlineLines.map((line, index) => (
              <span key={line} className={index === headlineLines.length - 1 ? 'block text-cyan-200' : 'block'}>
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-[760px] text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
            {t('home.description')}
          </p>

          <div className="mt-8 grid max-w-[860px] gap-4 sm:grid-cols-2">
            {valueProps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-xl border p-4 ${item.tone}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/10 p-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-gray-300">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/record')} icon={<Video className="h-5 w-5" />}>
              {t('home.startRecording')}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/pricing')} icon={<Crown className="h-5 w-5" />}>
              {t('home.viewPricing')}
            </Button>
          </div>
        </section>

        <section className="lg:pt-44 xl:pt-48">
          <Card className="border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30" padding={false}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">{t('home.entryTitle')}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">{t('home.entryDesc')}</p>
            </div>

            <div className="space-y-5">
              <Input
                label={t('home.yourName')}
                placeholder={t('home.namePlaceholder')}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />

              <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-600/20 p-2">
                    <Plus className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('home.createMeeting')}</h3>
                    <p className="text-sm text-gray-400">{t('home.createMeetingDesc')}</p>
                  </div>
                </div>
                <Button onClick={handleCreateRoom} size="lg" className="w-full" icon={<Plus className="h-5 w-5" />}>
                  {t('home.newMeeting')}
                </Button>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-600/20 p-2">
                    <LogIn className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('home.joinMeeting')}</h3>
                    <p className="text-sm text-gray-400">{t('home.joinMeetingDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder={t('home.meetingCode')}
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
                    className="flex-1"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoinRoom}
                    variant="secondary"
                    disabled={!meetingId.trim()}
                    icon={<LogIn className="h-4 w-4" />}
                  >
                    {t('home.join')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};
