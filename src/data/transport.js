// ============================================================
// Transport Data for Grand Abidjan
// Source: OpenStreetMap / AMUGA references
// Author: Edgar Kouassi — MEDEV GROUP SARL
// ============================================================

export const ABIDJAN_CENTER = [5.345, -4.025];
export const DEFAULT_ZOOM = 12;

export const COMMUNES = [
  { id: 'plateau', name: 'Plateau', lat: 5.3167, lng: -4.0167, pop: 7488, area: 2.5, desc: 'Centre administratif et des affaires' },
  { id: 'cocody', name: 'Cocody', lat: 5.3497, lng: -3.9833, pop: 447000, area: 69, desc: 'Zone résidentielle et universitaire' },
  { id: 'yopougon', name: 'Yopougon', lat: 5.3333, lng: -4.0667, pop: 1071543, area: 153, desc: 'Plus grande commune, zone industrielle' },
  { id: 'abobo', name: 'Abobo', lat: 5.4167, lng: -4.0167, pop: 1030658, area: 90, desc: 'Commune la plus peuplée' },
  { id: 'adjame', name: 'Adjamé', lat: 5.3500, lng: -4.0333, pop: 372978, area: 12, desc: 'Hub commercial et de transport' },
  { id: 'treichville', name: 'Treichville', lat: 5.3000, lng: -4.0167, pop: 102580, area: 4, desc: 'Zone portuaire et culturelle' },
  { id: 'marcory', name: 'Marcory', lat: 5.3000, lng: -3.9833, pop: 249858, area: 8, desc: 'Zone résidentielle mixte' },
  { id: 'koumassi', name: 'Koumassi', lat: 5.2833, lng: -3.9667, pop: 433139, area: 12, desc: 'Zone industrielle et résidentielle' },
  { id: 'port-bouet', name: 'Port-Bouët', lat: 5.2500, lng: -3.9500, pop: 419000, area: 110, desc: 'Aéroport FHB, zone balnéaire' },
  { id: 'attecoube', name: 'Attécoubé', lat: 5.3333, lng: -4.0500, pop: 260000, area: 13, desc: 'Zone résidentielle ouest' },
  { id: 'bingerville', name: 'Bingerville', lat: 5.3500, lng: -3.8833, pop: 115000, area: 50, desc: 'Ancienne capitale, zone péri-urbaine' },
  { id: 'songon', name: 'Songon', lat: 5.3167, lng: -4.2167, pop: 90000, area: 278, desc: 'Zone rurale et péri-urbaine' },
  { id: 'anyama', name: 'Anyama', lat: 5.4833, lng: -4.0500, pop: 210000, area: 78, desc: 'Zone nord, agriculture et résidentiel' },
];

export const TRANSPORT_HUBS = [
  { 
    id: 'gare-adjame', name: 'Gare Routière d\'Adjamé', 
    lat: 5.3522, lng: -4.0269, 
    type: 'gare', category: 'major',
    lines: 12, dailyPassengers: 85000,
    desc: 'Principal hub de transport interurbain'
  },
  { 
    id: 'gare-yopougon', name: 'Gare de Yopougon', 
    lat: 5.3289, lng: -4.0789, 
    type: 'gare', category: 'major',
    lines: 8, dailyPassengers: 45000,
    desc: 'Dessert la zone ouest'
  },
  { 
    id: 'gare-treichville', name: 'Gare Sud Treichville', 
    lat: 5.3005, lng: -4.0142, 
    type: 'gare', category: 'major',
    lines: 6, dailyPassengers: 35000,
    desc: 'Hub sud, connexion port'
  },
  { 
    id: 'aeroport-fhb', name: 'Aéroport FHB', 
    lat: 5.2614, lng: -3.9262, 
    type: 'aeroport', category: 'international',
    lines: 2, dailyPassengers: 12000,
    desc: 'Aéroport international'
  },
  { 
    id: 'port-abidjan', name: 'Port Autonome d\'Abidjan', 
    lat: 5.2889, lng: -3.9978, 
    type: 'port', category: 'major',
    lines: 3, dailyPassengers: 5000,
    desc: 'Port principal d\'Afrique de l\'Ouest'
  },
  { 
    id: 'gare-abobo', name: 'Gare d\'Abobo', 
    lat: 5.4156, lng: -4.0178, 
    type: 'gare', category: 'secondary',
    lines: 5, dailyPassengers: 32000,
    desc: 'Dessert le nord'
  },
  { 
    id: 'gare-koumassi', name: 'Gare de Koumassi', 
    lat: 5.2900, lng: -3.9700, 
    type: 'gare', category: 'secondary',
    lines: 4, dailyPassengers: 18000,
    desc: 'Dessert la zone sud-est'
  },
  { 
    id: 'metro-l1', name: 'Métro Ligne 1 (Projet)', 
    lat: 5.3600, lng: -4.0100, 
    type: 'metro', category: 'future',
    lines: 1, dailyPassengers: 0,
    desc: 'Anyama → Aéroport FHB (en projet)'
  },
];

export const BUS_LINES = [
  {
    id: 'L01',
    name: 'Yopougon ↔ Plateau',
    operator: 'SOTRA',
    color: '#f97316',
    type: 'express',
    frequency: '8 min',
    dailyRiders: 22000,
    coords: [
      [5.3289, -4.0789], [5.3310, -4.0650], [5.3350, -4.0500],
      [5.3400, -4.0400], [5.3450, -4.0333], [5.3350, -4.0250],
      [5.3167, -4.0167]
    ],
  },
  {
    id: 'L02',
    name: 'Abobo ↔ Plateau',
    operator: 'SOTRA',
    color: '#3b82f6',
    type: 'express',
    frequency: '10 min',
    dailyRiders: 28000,
    coords: [
      [5.4167, -4.0167], [5.4000, -4.0180], [5.3850, -4.0200],
      [5.3700, -4.0230], [5.3522, -4.0269], [5.3400, -4.0220],
      [5.3250, -4.0190], [5.3167, -4.0167]
    ],
  },
  {
    id: 'L03',
    name: 'Cocody ↔ Treichville',
    operator: 'SOTRA',
    color: '#22c55e',
    type: 'standard',
    frequency: '12 min',
    dailyRiders: 15000,
    coords: [
      [5.3497, -3.9833], [5.3400, -3.9900], [5.3300, -3.9950],
      [5.3200, -4.0020], [5.3100, -4.0080], [5.3005, -4.0142]
    ],
  },
  {
    id: 'L04',
    name: 'Koumassi ↔ Adjamé',
    operator: 'SOTRA',
    color: '#eab308',
    type: 'standard',
    frequency: '15 min',
    dailyRiders: 12000,
    coords: [
      [5.2833, -3.9667], [5.2950, -3.9750], [5.3050, -3.9850],
      [5.3150, -3.9950], [5.3250, -4.0050], [5.3400, -4.0200],
      [5.3500, -4.0333]
    ],
  },
  {
    id: 'L05',
    name: 'Port-Bouët ↔ Marcory',
    operator: 'SOTRA',
    color: '#a855f7',
    type: 'standard',
    frequency: '18 min',
    dailyRiders: 8000,
    coords: [
      [5.2500, -3.9500], [5.2600, -3.9580], [5.2700, -3.9670],
      [5.2833, -3.9750], [5.3000, -3.9833]
    ],
  },
  {
    id: 'L06',
    name: 'Anyama ↔ Abobo',
    operator: 'SOTRA',
    color: '#ec4899',
    type: 'suburbain',
    frequency: '20 min',
    dailyRiders: 6500,
    coords: [
      [5.4833, -4.0500], [5.4650, -4.0420], [5.4500, -4.0350],
      [5.4350, -4.0270], [5.4167, -4.0167]
    ],
  },
  {
    id: 'BAT01',
    name: 'Bateau-bus Plateau ↔ Yopougon',
    operator: 'STL',
    color: '#06b6d4',
    type: 'lagunaire',
    frequency: '30 min',
    dailyRiders: 4000,
    coords: [
      [5.3167, -4.0167], [5.3180, -4.0300], [5.3200, -4.0450],
      [5.3220, -4.0550], [5.3250, -4.0650], [5.3289, -4.0789]
    ],
  },
];

export const METRO_PROJECT = {
  name: 'Métro d\'Abidjan — Ligne 1',
  status: 'En construction',
  completion: '2028',
  length: '37.4 km',
  stations: 18,
  color: '#ec4899',
  coords: [
    [5.4833, -4.0500], // Anyama
    [5.4500, -4.0400],
    [5.4167, -4.0167], // Abobo
    [5.3900, -4.0200],
    [5.3700, -4.0250],
    [5.3522, -4.0269], // Adjamé
    [5.3400, -4.0220],
    [5.3250, -4.0190],
    [5.3167, -4.0167], // Plateau
    [5.3100, -4.0100],
    [5.3005, -4.0142], // Treichville
    [5.2900, -4.0050],
    [5.2833, -3.9900],
    [5.2750, -3.9750],
    [5.2614, -3.9262], // Aéroport
  ],
};

export const LAYER_CONFIG = {
  lignes:       { label: 'Lignes de transport', color: '#f97316', icon: 'Bus' },
  arrets:       { label: 'Arrêts de bus',       color: '#fb923c', icon: 'MapPin' },
  gares:        { label: 'Gares & Hubs',        color: '#22d3ee', icon: 'Building2' },
  routes:       { label: 'Routes principales',  color: '#eab308', icon: 'Route' },
  communes:     { label: 'Communes',            color: '#34d399', icon: 'Map' },
  lagunaire:    { label: 'Transport lagunaire',  color: '#06b6d4', icon: 'Ship' },
  voiesFerrees: { label: 'Voies ferrées',        color: '#ef4444', icon: 'Train' },
};
