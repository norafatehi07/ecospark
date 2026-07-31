// Eco-sustainability fallback markets (used if AI generation fails)
export const MOCK_PREDICTIONS = [
  {
    id: 'eco-1',
    title: 'Will Tesla (TSLA) stock close above $230 this week?',
    category: 'Green Stocks',
    emoji: '📈',
    description: 'Tesla shares are highly sensitive to EV demand signals and Elon Musk news. Will they hold above $230?',
    endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    options: [
      { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 1.7, multiplier: 1.7 },
      { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.1, multiplier: 2.1 },
    ],
    totalStaked: 0, betCount: 0, status: 'active',
    generatedDate: new Date().toISOString().slice(0, 10),
    source: 'fallback',
  },
  {
    id: 'eco-2',
    title: 'Will India install 10 GW of new solar capacity in Q3 2026?',
    category: 'Renewable Energy',
    emoji: '☀️',
    description: 'India has aggressive solar targets. Q3 data will reveal if the country stays on track for 500 GW by 2030.',
    endTime: new Date(Date.now() + 86400000 * 10).toISOString(),
    options: [
      { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 1.6, multiplier: 1.6 },
      { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.4, multiplier: 2.4 },
    ],
    totalStaked: 0, betCount: 0, status: 'active',
    generatedDate: new Date().toISOString().slice(0, 10),
    source: 'fallback',
  },
  {
    id: 'eco-3',
    title: 'Will EU carbon credit prices stay above €55 per tonne this week?',
    category: 'Carbon Markets',
    emoji: '🌍',
    description: 'European carbon allowances (EUAs) are a bellwether for climate policy confidence.',
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(),
    options: [
      { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 1.5, multiplier: 1.5 },
      { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.3, multiplier: 2.3 },
    ],
    totalStaked: 0, betCount: 0, status: 'active',
    generatedDate: new Date().toISOString().slice(0, 10),
    source: 'fallback',
  },
  {
    id: 'eco-4',
    title: 'Will global EV sales exceed 1 million units in August 2026?',
    category: 'Electric Vehicles',
    emoji: '⚡',
    description: 'Monthly EV sales figures from BloombergNEF track the electrification transition worldwide.',
    endTime: new Date(Date.now() + 86400000 * 14).toISOString(),
    options: [
      { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 1.4, multiplier: 1.4 },
      { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.9, multiplier: 2.9 },
    ],
    totalStaked: 0, betCount: 0, status: 'active',
    generatedDate: new Date().toISOString().slice(0, 10),
    source: 'fallback',
  },
];


export const MOCK_TRIVIA = [
  {
    id: 't-1',
    question: 'Which Indian city is known as the "Silicon Valley of India"?',
    options: ['Hyderabad', 'Pune', 'Bengaluru', 'Chennai'],
    correctIndex: 2
  },
  {
    id: 't-2',
    question: 'Who was the first Indian to win a Nobel Prize?',
    options: ['C.V. Raman', 'Rabindranath Tagore', 'Mother Teresa', 'Amartya Sen'],
    correctIndex: 1
  },
  {
    id: 't-3',
    question: 'In computer science, what does "API" stand for?',
    options: ['Application Programming Interface', 'Advanced Processing Integration', 'Automated Protocol Internet', 'Application Process Intelligence'],
    correctIndex: 0
  },
  {
    id: 't-4',
    question: 'Which river is the longest in India?',
    options: ['Brahmaputra', 'Godavari', 'Ganga', 'Yamuna'],
    correctIndex: 2
  },
  {
    id: 't-5',
    question: 'What is the largest planet in our solar system?',
    options: ['Saturn', 'Earth', 'Jupiter', 'Neptune'],
    correctIndex: 2
  },
  {
    id: 't-6',
    question: 'Which Indian state has the longest coastline?',
    options: ['Maharashtra', 'Gujarat', 'Tamil Nadu', 'Andhra Pradesh'],
    correctIndex: 1
  },
  {
    id: 't-7',
    question: 'Who wrote the Indian national anthem, "Jana Gana Mana"?',
    options: ['Bankim Chandra Chatterjee', 'Sarojini Naidu', 'Rabindranath Tagore', 'Mahatma Gandhi'],
    correctIndex: 2
  },
  {
    id: 't-8',
    question: 'What is the chemical symbol for Gold?',
    options: ['Ag', 'Au', 'Gd', 'Go'],
    correctIndex: 1
  },
  {
    id: 't-9',
    question: 'In which year did India gain independence?',
    options: ['1945', '1947', '1950', '1952'],
    correctIndex: 1
  },
  {
    id: 't-10',
    question: 'Which tech company created the mobile operating system Android?',
    options: ['Apple', 'Microsoft', 'Google', 'Samsung'],
    correctIndex: 2
  }
];
