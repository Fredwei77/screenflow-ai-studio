import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, CircleAlert, Clipboard, Crown, Instagram, Mail, Phone, Send, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { saveCommercialLead, trackCommercialIntent, type CommercialLead } from '../lib/commercialization';

type Plan = {
  name: 'Free' | 'Pro' | 'Team';
  price: string;
  unit: string;
  description: string;
  cta: string;
  highlighted: boolean;
  icon: typeof Sparkles;
  features: string[];
};

export const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan['name']>('Pro');
  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<CommercialLead | null>(null);
  const [copiedNo, setCopiedNo] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact: '',
    company: '',
    role: '',
    teamSize: '1',
    useCase: t('pricing.lead.useCases.education'),
    message: '',
  });

  const plans = useMemo<Plan[]>(() => [
    {
      name: 'Free',
      price: '0',
      unit: t('pricing.plans.freeUnit'),
      description: t('pricing.plans.freeDesc'),
      cta: t('pricing.plans.freeCta'),
      highlighted: false,
      icon: Sparkles,
      features: t('pricing.plans.freeFeatures', { returnObjects: true }) as string[],
    },
    {
      name: 'Pro',
      price: '39',
      unit: t('pricing.plans.proUnit'),
      description: t('pricing.plans.proDesc'),
      cta: t('pricing.plans.proCta'),
      highlighted: true,
      icon: Crown,
      features: t('pricing.plans.proFeatures', { returnObjects: true }) as string[],
    },
    {
      name: 'Team',
      price: '299',
      unit: t('pricing.plans.teamUnit'),
      description: t('pricing.plans.teamDesc'),
      cta: t('pricing.plans.teamCta'),
      highlighted: false,
      icon: Users,
      features: t('pricing.plans.teamFeatures', { returnObjects: true }) as string[],
    },
  ], [t]);

  const useCases = [
    t('pricing.lead.useCases.education'),
    t('pricing.lead.useCases.training'),
    t('pricing.lead.useCases.sales'),
    t('pricing.lead.useCases.creator'),
  ];

  useEffect(() => {
    trackCommercialIntent('pricing_view', { source: 'pricing_page' });
  }, []);

  useEffect(() => {
    setForm((value) => ({ ...value, useCase: t('pricing.lead.useCases.education') }));
  }, [t]);

  const openLead = (plan: Plan['name']) => {
    setSelectedPlan(plan);
    setSubmittedLead(null);
    setCopiedNo(false);
    trackCommercialIntent('upgrade_click', { plan, source: 'pricing_page' });
    if (plan === 'Free') {
      navigate('/record');
      return;
    }
    setIsLeadOpen(true);
  };

  const submitLead = (event: React.FormEvent) => {
    event.preventDefault();
    const nextLead = saveCommercialLead({
      ...form,
      plan: selectedPlan,
      source: 'pricing_page',
    });
    setSubmittedLead(nextLead);
  };

  const copyApplicationNo = async () => {
    if (!submittedLead) return;
    try {
      await navigator.clipboard.writeText(submittedLead.applicationNo);
      setCopiedNo(true);
      window.setTimeout(() => setCopiedNo(false), 1800);
    } catch {
      setCopiedNo(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-gray-950 text-white">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            {t('pricing.backHome')}
          </button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/record')}>
              {t('pricing.freeTrial')}
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <section className="max-w-6xl pt-6">
          <h1 className="whitespace-nowrap text-[clamp(34px,4.2vw,58px)] font-black leading-[1.12] tracking-normal text-white">
            {t('pricing.heroMainBefore')} <span className="text-cyan-300">{t('pricing.heroHighlight')}</span> {t('pricing.heroMainAfter')}
          </h1>
          <div className="mt-5 space-y-3 text-gray-300">
            <p className="whitespace-nowrap text-[clamp(22px,2.35vw,34px)] font-semibold leading-[1.18] tracking-normal">
              {t('pricing.heroSubLine1')}
            </p>
            <p className="text-[clamp(22px,2.55vw,36px)] font-semibold leading-[1.22] tracking-normal">
              {t('pricing.heroSubLine2')}
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`flex min-h-[520px] flex-col p-6 ${plan.highlighted ? 'border-indigo-500 bg-indigo-950/30 shadow-2xl shadow-indigo-950/30' : ''}`}
                padding={false}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${plan.highlighted ? 'bg-indigo-500' : 'bg-gray-800'}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                  </div>
                  {plan.highlighted && <span className="rounded-full bg-indigo-500 px-2.5 py-1 text-xs font-semibold">{t('pricing.recommended')}</span>}
                </div>
                <div className="mt-7">
                  <span className="text-5xl font-bold">¥{plan.price}</span>
                  <span className="ml-2 text-sm text-gray-400">{plan.unit}</span>
                </div>
                <p className="mt-4 min-h-[52px] text-sm leading-6 text-gray-400">{plan.description}</p>
                <Button className="mt-6 w-full" variant={plan.highlighted ? 'primary' : 'secondary'} onClick={() => openLead(plan.name)}>
                  {plan.cta}
                </Button>
                <div className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm text-gray-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </section>
      </main>

      <footer className="border-t border-gray-900 bg-[#11161c] px-5 py-8">
        <nav className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-base font-medium text-gray-300 sm:text-lg">
          <a href="#" className="transition-colors hover:text-white">{t('pricing.footer.privacy')}</a>
          <a href="#" className="transition-colors hover:text-white">{t('pricing.footer.terms')}</a>
          <a href="#" className="transition-colors hover:text-white">{t('pricing.footer.about')}</a>
          <a href="#" className="transition-colors hover:text-white">{t('pricing.footer.support')}</a>
        </nav>

        <div className="mt-7 text-center">
          <h2 className="text-lg font-bold text-yellow-300">{t('pricing.footer.social')}</h2>
          <div className="mt-5 flex items-center justify-center gap-7">
            <a href="#" aria-label={t('pricing.footer.notice')} className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-950/30 transition-transform hover:scale-105">
              <CircleAlert className="h-8 w-8" />
            </a>
            <a href="#" aria-label="X" className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-950 text-white shadow-lg shadow-black/30 transition-transform hover:scale-105">
              <X className="h-8 w-8" />
            </a>
            <a href="#" aria-label="Instagram" className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white shadow-lg shadow-pink-950/30 transition-transform hover:scale-105">
              <Instagram className="h-8 w-8" />
            </a>
            <a href="#" aria-label={t('pricing.footer.email')} className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-950/30 transition-transform hover:scale-105">
              <Mail className="h-8 w-8" />
            </a>
            <a href="#" aria-label={t('pricing.footer.phone')} className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-950/30 transition-transform hover:scale-105">
              <Phone className="h-8 w-8" />
            </a>
          </div>
        </div>
      </footer>

      <Modal isOpen={isLeadOpen} onClose={() => setIsLeadOpen(false)} title={t('pricing.lead.title', { plan: selectedPlan })} maxWidth="max-w-2xl">
        {submittedLead ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500 p-2 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{t('pricing.lead.successTitle')}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-300">{t('pricing.lead.successDesc')}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">{t('pricing.lead.applicationNo')}</p>
                <p className="mt-1 font-mono text-sm text-white">{submittedLead.applicationNo}</p>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">{t('pricing.lead.status')}</p>
                <p className="mt-1 text-sm font-semibold text-cyan-300">{t(`pricing.lead.statuses.${submittedLead.status}`)}</p>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
                <p className="text-xs text-gray-500">{t('pricing.lead.plan')}</p>
                <p className="mt-1 text-sm font-semibold text-white">{submittedLead.plan}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-950/50 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                {t('pricing.lead.nextStepsTitle')}
              </h4>
              <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                <p>{t('pricing.lead.nextStep1')}</p>
                <p>{t('pricing.lead.nextStep2')}</p>
                <p>{t('pricing.lead.nextStep3')}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" variant="secondary" onClick={copyApplicationNo} icon={<Clipboard className="h-4 w-4" />}>
                {copiedNo ? t('common.copied') : t('pricing.lead.copyNo')}
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setSubmittedLead(null)}>
                {t('pricing.lead.editApplication')}
              </Button>
              <Button className="flex-1" onClick={() => navigate('/record')}>
                {t('pricing.lead.tryNow')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitLead} className="space-y-4">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm leading-6 text-gray-300">
              {t('pricing.lead.formIntro')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('pricing.lead.name')} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
              <Input label={t('pricing.lead.contact')} placeholder={t('pricing.lead.contactPlaceholder')} value={form.contact} onChange={(e) => setForm((v) => ({ ...v, contact: e.target.value }))} required />
              <Input label={t('pricing.lead.company')} value={form.company} onChange={(e) => setForm((v) => ({ ...v, company: e.target.value }))} />
              <Input label={t('pricing.lead.role')} value={form.role} onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))} />
              <Input label={t('pricing.lead.teamSize')} type="number" min="1" value={form.teamSize} onChange={(e) => setForm((v) => ({ ...v, teamSize: e.target.value }))} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-300">{t('pricing.lead.useCase')}</span>
                <select
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={form.useCase}
                  onChange={(e) => setForm((v) => ({ ...v, useCase: e.target.value }))}
                >
                  {useCases.map((useCase) => (
                    <option key={useCase}>{useCase}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-300">{t('pricing.lead.message')}</span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('pricing.lead.messagePlaceholder')}
                value={form.message}
                onChange={(e) => setForm((v) => ({ ...v, message: e.target.value }))}
              />
            </label>
            <Button className="w-full" type="submit" icon={<Send className="h-4 w-4" />}>{t('pricing.lead.submit')}</Button>
          </form>
        )}
      </Modal>
    </div>
  );
};
