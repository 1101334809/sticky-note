import type { GlobalThemeOverrides } from 'naive-ui'

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#5c6bc0',
    primaryColorHover: '#7986cb',
    primaryColorPressed: '#3f51b5',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    boxShadow1: '0 4px 12px rgba(0,0,0,0.08)',
    boxShadow2: '0 8px 32px rgba(0,0,0,0.12)',
    boxShadow3: '0 16px 48px rgba(0,0,0,0.16)',
  },
  Button: {
    borderRadiusMedium: '12px',
    borderRadiusLarge: '16px',
    textColor: '#2d3748',
  },
  Card: {
    borderRadius: '16px',
    color: 'rgba(255, 255, 255, 0.85)',
    actionColor: 'rgba(255, 255, 255, 0.5)',
    dividerColor: 'rgba(226, 232, 240, 0.8)',
  },
  Input: {
    borderRadius: '12px',
  },
  Select: {
    borderRadius: '12px',
  },
  Dialog: {
    borderRadius: '16px',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  Popover: {
    borderRadius: '12px',
    color: 'rgba(255, 255, 255, 0.9)',
  }
}

export const darkThemeOverrides: GlobalThemeOverrides = {
  ...lightThemeOverrides,
  common: {
    ...lightThemeOverrides.common,
    bodyColor: '#0f111a',
    cardColor: 'rgba(30, 35, 48, 0.6)',
    modalColor: 'rgba(30, 35, 48, 0.8)',
    popoverColor: 'rgba(30, 35, 48, 0.8)',
  },
  Button: {
    ...lightThemeOverrides.Button,
    textColor: '#f7fafc',
  },
  Card: {
    ...lightThemeOverrides.Card,
    color: 'rgba(30, 35, 48, 0.6)',
    actionColor: 'rgba(30, 35, 48, 0.4)',
    dividerColor: 'rgba(255, 255, 255, 0.08)',
  },
  Dialog: {
    ...lightThemeOverrides.Dialog,
    color: 'rgba(30, 35, 48, 0.8)',
  },
  Popover: {
    ...lightThemeOverrides.Popover,
    color: 'rgba(30, 35, 48, 0.8)',
  }
}
