// Mirrors the web app's palette in style.css so the two stay recognisably the same product.
export const colors = {
  green: '#2e7d32',
  greenDark: '#1b5e20',
  greenPale: '#e8f5e9',
  red: '#c62828',
  orange: '#e65100',
  orangePale: '#fff3e0',
  orangeBorder: '#ffcc80',
  bg: '#f5f5f5',
  surface: '#fff',
  text: '#1a1a1a',
  textMuted: '#666',
  textFaint: '#999',
  border: '#e0e0e0',
  borderLight: '#eee',
  divider: '#ddd',
  link: '#007aff',
  userDot: '#4285f4',
} as const;

export const radius = { card: 12, pill: 8, banner: 10 } as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
