// src/constants/arenaData.js

export const MOCK_PREDICTIONS = [
  {
    id: 'pred-1',
    title: 'Will India win the upcoming ICC Cricket World Cup?',
    category: 'Sports',
    description: 'Predict whether the Indian Cricket Team will lift the trophy in the upcoming World Cup tournament.',
    endTime: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    options: [
      { id: 'yes', label: 'Yes', multiplier: 1.5, color: 'var(--color-emerald)' },
      { id: 'no', label: 'No', multiplier: 2.2, color: 'var(--color-ruby)' }
    ],
    totalStaked: 125000,
    status: 'active'
  },
  {
    id: 'pred-2',
    title: 'Will India\'s GDP growth rate exceed 7.5% this fiscal year?',
    category: 'Economy',
    description: 'Predict the economic growth trajectory of India for the current fiscal year.',
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    options: [
      { id: 'yes', label: 'Yes (> 7.5%)', multiplier: 1.8, color: 'var(--color-emerald)' },
      { id: 'no', label: 'No (<= 7.5%)', multiplier: 1.9, color: 'var(--color-ruby)' }
    ],
    totalStaked: 85000,
    status: 'active'
  },
  {
    id: 'pred-3',
    title: 'Will ISRO successfully launch the next Gaganyaan mission this year?',
    category: 'Science',
    description: 'Predict the success of the Indian Space Research Organisation\'s upcoming manned space mission timeline.',
    endTime: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days from now
    options: [
      { id: 'yes', label: 'Yes', multiplier: 1.2, color: 'var(--color-emerald)' },
      { id: 'no', label: 'No/Delayed', multiplier: 3.5, color: 'var(--color-ruby)' }
    ],
    totalStaked: 210000,
    status: 'active'
  },
  {
    id: 'pred-4',
    title: 'Will a new major AI bill be passed in the Indian Parliament this session?',
    category: 'Politics/Tech',
    description: 'Predict if new significant regulations regarding Artificial Intelligence will be enacted soon.',
    endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    options: [
      { id: 'yes', label: 'Yes', multiplier: 2.5, color: 'var(--color-emerald)' },
      { id: 'no', label: 'No', multiplier: 1.4, color: 'var(--color-ruby)' }
    ],
    totalStaked: 45000,
    status: 'active'
  }
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
