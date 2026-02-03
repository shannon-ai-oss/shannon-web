/**
 * Chat mode configuration
 */
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';

// Primary models - Shannon 1.6 series
export const PRIMARY_MODE_OPTIONS = [
  {
    value: 'lite16',
    label: 'Shannon 1.6 Lite',
    description: 'Fast responses, no reasoning overhead. Great for quick tasks.',
    longDescription: 'Optimized for speed and efficiency',
    accent: '#10b981',
    Icon: BoltRoundedIcon,
    thinkingEnabled: false,
    multiplier: 0.3,
    isNew: true,
  },
  {
    value: 'pro16',
    label: 'Shannon 1.6 Pro',
    description: 'Ultra-deep thinking in both phases. Maximum reasoning power.',
    longDescription: 'UltraThink mode with extended reasoning',
    accent: '#8b5cf6',
    Icon: RocketLaunchRoundedIcon,
    thinkingEnabled: true,
    ultraThink: true,
    multiplier: 2.0,
    isNew: true,
  },
];

export const LEGACY_MODE_OPTIONS = [];

// Combined for backward compatibility
export const MODE_OPTIONS = [
  ...PRIMARY_MODE_OPTIONS,
  ...LEGACY_MODE_OPTIONS,
];

// Helper to get all mode values
export const ALL_MODE_VALUES = MODE_OPTIONS.map(m => m.value);

// Helper to find mode by value
export const getModeByValue = (value) => MODE_OPTIONS.find(m => m.value === value);

// Helper to check if mode is legacy
export const isLegacyMode = (value) => LEGACY_MODE_OPTIONS.some(m => m.value === value);
