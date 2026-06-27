export interface PrizeTier {
  id: string;
  name: string;
  description: string;
  weight: number;
  inventory: number;
  terms: string;
  colour: string;
  emoji: string;
}

export interface WheelConfig {
  prizes: PrizeTier[];
  updatedAt: string;
  updatedByEmail: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  token: string;
  spinStatus: 'fresh' | 'spun';
  prizeId: string | null;
  prizeName: string | null;
  prizeCode: string | null;
  redeemedAt: string | null;
  redeemedByEmail: string | null;
  createdAt: string;
}

export interface StaffRole {
  role: 'staff' | 'manager' | 'admin';
  displayName: string;
  createdAt: string;
}

export type ActiveView = 'customer' | 'staff' | 'manager' | 'admin';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

export type SpinState = 'idle' | 'spinning' | 'complete' | 'error';

export type VerifyState = 'idle' | 'loading' | 'not_found' | 'already_redeemed' | 'valid' | 'burned';

export const DEFAULT_PRIZES: PrizeTier[] = [
  {
    id: 'P1',
    name: 'Free Pint of Ale',
    description: 'One complimentary pint of any draft cask ale',
    weight: 25,
    inventory: 100,
    terms: 'Valid on selected cask ales only. One per customer per visit. Cannot be exchanged for cash.',
    colour: '#C5A86B',
    emoji: '🍺',
  },
  {
    id: 'P2',
    name: '2-for-1 Main Meal',
    description: 'Buy one main course, receive one of equal or lesser value free',
    weight: 15,
    inventory: 50,
    terms: 'Valid Sunday–Thursday, 6pm–9pm only. Excludes daily specials and set menus.',
    colour: '#538773',
    emoji: '🍽️',
  },
  {
    id: 'P3',
    name: '£10 Bar Credit',
    description: 'Ten pounds to spend at the bar on any drinks',
    weight: 10,
    inventory: 30,
    terms: 'Single use only. Cannot be exchanged for cash or combined with other offers.',
    colour: '#4A7FA5',
    emoji: '💳',
  },
  {
    id: 'P4',
    name: 'Free Dessert',
    description: 'Complimentary dessert from our full dessert menu',
    weight: 20,
    inventory: 75,
    terms: 'Must be redeemed with purchase of a main course. Subject to availability.',
    colour: '#8B5E3C',
    emoji: '🍮',
  },
  {
    id: 'P5',
    name: '25% Off Food Bill',
    description: 'A quarter off your entire food order',
    weight: 10,
    inventory: 40,
    terms: 'Excludes drinks. Valid for dine-in only. One use per customer.',
    colour: '#7A4F9B',
    emoji: '🎉',
  },
  {
    id: 'P6',
    name: 'Better Luck Next Time',
    description: 'Thanks for playing — come back and see us again soon!',
    weight: 20,
    inventory: -1,
    terms: 'No monetary value. Visit us again for another chance to win.',
    colour: '#3A3A3F',
    emoji: '🎲',
  },
];
