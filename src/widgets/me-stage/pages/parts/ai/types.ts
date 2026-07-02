import { Sparkles, Zap, ShieldCheck } from 'lucide-react';

export type ModelTier = 'fast' | 'balanced' | 'best';

export type Model = {
  id: string;
  vendor: 'Anthropic' | 'OpenAI' | 'Google' | 'Mistral';
  name: string;
  tier: ModelTier;
  inputCostPerMTok: number;     // USD per million input tokens
  outputCostPerMTok: number;
  context: string;
  speed: number;                 // tokens/sec, marketing-ish number
  reasoning: 'short' | 'medium' | 'extended';
};

export const MODELS: Model[] = [
  { id: 'claude-haiku-4.5',  vendor: 'Anthropic', name: 'Claude Haiku 4.5',  tier: 'fast',     inputCostPerMTok: 0.80, outputCostPerMTok: 4.00,  context: '200K', speed: 130, reasoning: 'short'    },
  { id: 'claude-sonnet-4.6', vendor: 'Anthropic', name: 'Claude Sonnet 4.6', tier: 'balanced', inputCostPerMTok: 3.00, outputCostPerMTok: 15.00, context: '1M',   speed: 80,  reasoning: 'medium'   },
  { id: 'claude-opus-4.7',   vendor: 'Anthropic', name: 'Claude Opus 4.7',   tier: 'best',     inputCostPerMTok: 15.0, outputCostPerMTok: 75.00, context: '1M',   speed: 35,  reasoning: 'extended' },
  { id: 'gpt-mini',          vendor: 'OpenAI',    name: 'GPT mini',          tier: 'fast',     inputCostPerMTok: 0.50, outputCostPerMTok: 1.50,  context: '128K', speed: 110, reasoning: 'short'    },
  { id: 'gpt-pro',           vendor: 'OpenAI',    name: 'GPT pro',           tier: 'balanced', inputCostPerMTok: 5.00, outputCostPerMTok: 20.00, context: '256K', speed: 60,  reasoning: 'medium'   },
  { id: 'gemini-pro',        vendor: 'Google',    name: 'Gemini pro',        tier: 'balanced', inputCostPerMTok: 2.50, outputCostPerMTok: 10.00, context: '1M',   speed: 90,  reasoning: 'medium'   },
];

export type Surface = 'coding' | 'review' | 'fix';

export type AiPrefs = {
  models: Record<Surface, string>;       // model id per surface
  inlineSuggestions: boolean;
  suggestionVerbosity: 'brief' | 'normal' | 'verbose';
  autoCommitMessages: boolean;
  autoReviewSummaries: boolean;
  autoEvidenceLinks: boolean;
  contextDepth: 'file' | 'module' | 'workspace';
  trainingOptOut: boolean;
  redactSecrets: boolean;
  costCapPerDay: number;                 // USD; 0 = no cap
  spikeAlertAt: number;                  // % of cap
  fallbackToFastModel: boolean;
};

export const INITIAL: AiPrefs = {
  models: {
    coding:      'claude-haiku-4.5',
    review:      'claude-sonnet-4.6',
    fix:         'claude-opus-4.7',
  },
  inlineSuggestions: true,
  suggestionVerbosity: 'normal',
  autoCommitMessages: true,
  autoReviewSummaries: true,
  autoEvidenceLinks: true,
  contextDepth: 'module',
  trainingOptOut: true,
  redactSecrets: true,
  costCapPerDay: 8,
  spikeAlertAt: 80,
  fallbackToFastModel: false,
};

export const SURFACE_META: Record<Surface, { label: string; sub: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  coding:      { label: 'Coding',      sub: 'Inline suggestions, refactors, drafts',     icon: Zap          },
  review:      { label: 'Review',      sub: 'PR summaries, risk highlights',             icon: ShieldCheck  },
  fix:         { label: 'Fix pipeline',sub: 'Multi-step verified fixes',                 icon: Sparkles     },
};
