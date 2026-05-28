import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CircleAlert, Crown, Instagram, Mail, Phone, Sparkles, Users, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { saveCommercialLead, trackCommercialIntent } from '../lib/commercialization';

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
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact: '',
    teamSize: '1',
    useCase: t('pricing.lead.useCases.education'),
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
    setSubmitted(false);
    trackCommercialIntent('upgrade_click', { plan, source: 'pricing_page' });
    if (plan === 'Free') {
      navigate('/record');
      return;
    }
    setIsLeadOpen(true);
  };

  const submitLead = (event: React.FormEvent) => {
    event.preventDefault();
    saveCommercialLead({
      ...form,
      plan: selectedPlan,
      source: 'pricing_page',
    });
    setSubmitted(true);
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

      <Modal isOpen={isLeadOpen} onClose={() => setIsLeadOpen(false)} title={t('pricing.lead.title', { plan: selectedPlan })} maxWidth="max-w-lg">
        {submitted ? (
          <div className="space-y-4">
            <p className="text-gray-300">{t('pricing.lead.submitted')}</p>
            <Button className="w-full" onClick={() => setIsLeadOpen(false)}>{t('pricing.lead.done')}</Button>
          </div>
        ) : (
          <form onSubmit={submitLead} className="space-y-4">
            <Input label={t('pricing.lead.name')} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
            <Input label={t('pricing.lead.contact')} placeholder={t('pricing.lead.contactPlaceholder')} value={form.contact} onChange={(e) => setForm((v) => ({ ...v, contact: e.target.value }))} required />
            <Input label={t('pricing.lead.teamSize')} value={form.teamSize} onChange={(e) => setForm((v) => ({ ...v, teamSize: e.target.value }))} />
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
            <Button className="w-full" type="submit">{t('pricing.lead.submit')}</Button>
          </form>
        )}
      </Modal>
    </div>
  );
};
