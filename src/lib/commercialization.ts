export type CommercialIntentType = 'pricing_view' | 'upgrade_click' | 'lead_submit';

export interface CommercialIntentEvent {
  id: string;
  type: CommercialIntentType;
  plan?: string;
  feature?: string;
  source?: string;
  path: string;
  createdAt: string;
}

export interface CommercialLead {
  id: string;
  name: string;
  contact: string;
  teamSize: string;
  useCase: string;
  plan: string;
  source: string;
  createdAt: string;
}

const EVENTS_KEY = 'screenflow-commercial-intents';
const LEADS_KEY = 'screenflow-commercial-leads';

const readArray = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
};

export const trackCommercialIntent = (
  type: CommercialIntentType,
  payload: Partial<Omit<CommercialIntentEvent, 'id' | 'type' | 'path' | 'createdAt'>> = {},
) => {
  const event: CommercialIntentEvent = {
    id: crypto.randomUUID(),
    type,
    path: window.location.pathname,
    createdAt: new Date().toISOString(),
    ...payload,
  };

  const events = readArray<CommercialIntentEvent>(EVENTS_KEY);
  localStorage.setItem(EVENTS_KEY, JSON.stringify([event, ...events].slice(0, 200)));
  return event;
};

export const saveCommercialLead = (
  lead: Omit<CommercialLead, 'id' | 'createdAt'>,
) => {
  const nextLead: CommercialLead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...lead,
  };

  const leads = readArray<CommercialLead>(LEADS_KEY);
  localStorage.setItem(LEADS_KEY, JSON.stringify([nextLead, ...leads].slice(0, 100)));
  trackCommercialIntent('lead_submit', {
    plan: lead.plan,
    source: lead.source,
  });
  return nextLead;
};
