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
  applicationNo: string;
  name: string;
  contact: string;
  teamSize: string;
  useCase: string;
  company?: string;
  role?: string;
  message?: string;
  plan: string;
  source: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

const EVENTS_KEY = 'screenflow-commercial-intents';
const LEADS_KEY = 'screenflow-commercial-leads';
const ACTIVE_PRO_STATUSES: CommercialLead['status'][] = ['submitted', 'reviewing', 'approved'];

const createApplicationNo = () => `SFAI-${Date.now().toString(36).toUpperCase()}`;

const readArray = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
};

const normalizeLead = (lead: Partial<CommercialLead>): CommercialLead => {
  const now = new Date().toISOString();
  const status = (['submitted', 'reviewing', 'approved', 'rejected'] as const).includes(lead.status as CommercialLead['status'])
    ? lead.status as CommercialLead['status']
    : 'submitted';

  return {
    id: lead.id || crypto.randomUUID(),
    applicationNo: lead.applicationNo || createApplicationNo(),
    name: lead.name || '',
    contact: lead.contact || '',
    company: lead.company || '',
    role: lead.role || '',
    teamSize: lead.teamSize || '1',
    useCase: lead.useCase || '',
    message: lead.message || '',
    plan: lead.plan || 'Pro',
    source: lead.source || 'unknown',
    status,
    createdAt: lead.createdAt || now,
    updatedAt: lead.updatedAt || lead.createdAt || now,
  };
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
  lead: Omit<CommercialLead, 'id' | 'applicationNo' | 'status' | 'createdAt' | 'updatedAt'>,
) => {
  const leads = readArray<Partial<CommercialLead>>(LEADS_KEY).map(normalizeLead);
  const existingIndex = leads.findIndex((item) =>
    item.plan === lead.plan &&
    item.contact.trim().toLowerCase() === lead.contact.trim().toLowerCase()
  );
  const now = new Date().toISOString();

  const nextLead: CommercialLead = {
    id: existingIndex >= 0 ? leads[existingIndex].id : crypto.randomUUID(),
    applicationNo: existingIndex >= 0 ? leads[existingIndex].applicationNo : createApplicationNo(),
    status: existingIndex >= 0 ? leads[existingIndex].status : 'submitted',
    createdAt: existingIndex >= 0 ? leads[existingIndex].createdAt : now,
    updatedAt: now,
    ...lead,
  };

  const nextLeads = existingIndex >= 0
    ? [nextLead, ...leads.filter((_, index) => index !== existingIndex)]
    : [nextLead, ...leads];

  localStorage.setItem(LEADS_KEY, JSON.stringify(nextLeads.slice(0, 100)));
  trackCommercialIntent('lead_submit', {
    plan: lead.plan,
    source: lead.source,
  });
  return nextLead;
};

export const getCommercialLeads = () => {
  const normalized = readArray<Partial<CommercialLead>>(LEADS_KEY).map(normalizeLead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(normalized.slice(0, 100)));
  return normalized;
};

export const getLatestCommercialLead = (plan?: string) => {
  const leads = getCommercialLeads();
  return plan ? leads.find((lead) => lead.plan === plan) : leads[0];
};

export const hasProBetaAccess = () =>
  getCommercialLeads().some((lead) =>
    (lead.plan === 'Pro' || lead.plan === 'Team') && ACTIVE_PRO_STATUSES.includes(lead.status)
  );
