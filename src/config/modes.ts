import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import type { ComponentType } from 'react';

export interface ModeOption {
  value: 'lite16' | 'pro16';
  label: string;
  description: string;
  Icon: ComponentType<any>;
  accent: string;
  maxTokens?: number;
  temperature?: number;
}

export const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'lite16',
    label: 'Shannon 1.6 Lite',
    description: 'Fast responses for simple tasks',
    Icon: BoltRoundedIcon,
    accent: '#10b981',
    maxTokens: 2048,
    temperature: 0.3,
  },
  {
    value: 'pro16',
    label: 'Shannon 1.6 Pro',
    description: 'Maximum reasoning depth',
    Icon: RocketLaunchRoundedIcon,
    accent: '#8b5cf6',
    maxTokens: 4096,
    temperature: 0.2,
  },
];

export const getModeByValue = (value: string): ModeOption | undefined => {
  return MODE_OPTIONS.find(option => option.value === value);
};

export const getDefaultMode = (): ModeOption => {
  return MODE_OPTIONS[0]; // Fast mode as default
};
