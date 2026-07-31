// scripts/seed.js — Seeds starter tasks and rewards into Firestore
// Run with: npm run seed (after setting up .env with Firebase credentials)
// Does NOT seed fake users or leaderboard entries — those come from real users.

import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Ensure the private key handles escaped newlines properly
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();

const TASKS = [
  {
    id: 'task-compost-1',
    title: 'Start a Compost Bin',
    description: 'Set up a compost bin using kitchen scraps like vegetable peels, fruit waste, and coffee grounds.',
    category: 'waste',
    points: 80,
    co2: 500,
    water: 0,
    waste: 1000,
    verificationPrompt: 'A compost bin, bucket, or container with kitchen scraps or composting materials inside',
    difficulty: 'medium',
  },
  {
    id: 'task-water-1',
    title: 'Fix a Leaky Tap',
    description: 'Report or fix a leaky tap at home or school. A dripping tap wastes up to 20 litres per day.',
    category: 'water',
    points: 60,
    co2: 0,
    water: 20,
    waste: 0,
    verificationPrompt: 'A tap or faucet that is now fully closed/fixed or a maintenance request form for fixing it',
    difficulty: 'easy',
  },
  {
    id: 'task-transport-1',
    title: 'Cycle or Walk to School',
    description: 'Cycle or walk to school instead of taking a petrol/diesel vehicle.',
    category: 'transport',
    points: 70,
    co2: 1200,
    water: 0,
    waste: 0,
    verificationPrompt: 'A photo outside your school with a bicycle, or of you walking in school uniform',
    difficulty: 'easy',
  },
  {
    id: 'task-energy-1',
    title: 'Turn Off Unused Lights',
    description: 'Turn off all lights in a room that is not in use. Take a photo of the empty, dark room.',
    category: 'energy',
    points: 30,
    co2: 200,
    water: 0,
    waste: 0,
    verificationPrompt: 'An empty room with lights visibly turned off',
    difficulty: 'easy',
  },
  {
    id: 'task-food-1',
    title: 'Eat a Plant-Based Meal',
    description: 'Have a completely plant-based meal today — no meat, fish, or dairy.',
    category: 'food',
    points: 50,
    co2: 800,
    water: 500,
    waste: 0,
    verificationPrompt: 'A plate of food that is clearly plant-based (vegetables, fruits, grains, legumes, no meat or fish visible)',
    difficulty: 'easy',
  },
  {
    id: 'task-nature-1',
    title: 'Plant a Seedling',
    description: 'Plant a seed or sapling in soil — in a pot, garden, or school grounds.',
    category: 'nature',
    points: 100,
    co2: 1000,
    water: 0,
    waste: 0,
    verificationPrompt: 'A seed or seedling being planted in soil, or a pot/garden with freshly planted soil',
    difficulty: 'medium',
  },
  {
    id: 'task-waste-1',
    title: 'Sort Recyclables',
    description: 'Separate your household waste into recyclables (paper, plastic, metal, glass) and non-recyclables.',
    category: 'waste',
    points: 40,
    co2: 300,
    water: 0,
    waste: 500,
    verificationPrompt: 'Waste items sorted into separate containers, bags, or piles by material type',
    difficulty: 'easy',
  },
  {
    id: 'task-water-2',
    title: 'Take a Short Shower',
    description: 'Keep your shower under 5 minutes to save water.',
    category: 'water',
    points: 35,
    co2: 0,
    water: 60,
    waste: 0,
    verificationPrompt: 'A timer or phone screen showing 5 minutes or less, next to or in a bathroom setting',
    difficulty: 'easy',
  },
  {
    id: 'task-community-1',
    title: 'Organize a Mini Cleanup',
    description: 'Pick up litter in your neighborhood, school, or park. Bring at least one friend.',
    category: 'community',
    points: 120,
    co2: 0,
    water: 0,
    waste: 2000,
    verificationPrompt: 'A bag of collected litter or a clean area with people picking up trash',
    difficulty: 'hard',
  },
  {
    id: 'task-energy-2',
    title: 'Unplug Electronics When Not in Use',
    description: 'Unplug chargers, TVs, or appliances from the wall when they\'re not being used.',
    category: 'energy',
    points: 25,
    co2: 150,
    water: 0,
    waste: 0,
    verificationPrompt: 'Unplugged chargers or appliances with the plug clearly out of the socket',
    difficulty: 'easy',
  },
  {
    id: 'task-food-2',
    title: 'Zero Food Waste Day',
    description: 'Finish all your food today without throwing any away. Use leftovers creatively.',
    category: 'food',
    points: 55,
    co2: 400,
    water: 200,
    waste: 300,
    verificationPrompt: 'An empty plate or a before/after photo showing food was fully consumed',
    difficulty: 'medium',
  },
  {
    id: 'task-transport-2',
    title: 'Use Public Transport',
    description: 'Use a bus, metro, or train instead of a private car for a journey today.',
    category: 'transport',
    points: 60,
    co2: 900,
    water: 0,
    waste: 0,
    verificationPrompt: 'A bus ticket, train ticket, metro card, or a selfie inside public transport',
    difficulty: 'easy',
  },
];

const REWARDS = [
  {
    id: 'reward-seedling',
    name: 'Green Seedling',
    description: 'Awarded to eco-starters who begin their sustainability journey.',
    icon: '🌱',
    pointCost: 100,
    tier: 'bronze',
  },
  {
    id: 'reward-leaf',
    name: 'Eco Leaf',
    description: 'For students who have completed 5+ eco-tasks.',
    icon: '🍃',
    pointCost: 300,
    tier: 'bronze',
  },
  {
    id: 'reward-water',
    name: 'Water Guardian',
    description: 'Champion of water conservation efforts.',
    icon: '💧',
    pointCost: 500,
    tier: 'silver',
  },
  {
    id: 'reward-sun',
    name: 'Solar Pioneer',
    description: 'Energy-saving expert — a week of energy tasks.',
    icon: '☀️',
    pointCost: 750,
    tier: 'silver',
  },
  {
    id: 'reward-earth',
    name: 'Earth Defender',
    description: 'Dedicated eco-warrior with sustained impact.',
    icon: '🌍',
    pointCost: 1200,
    tier: 'gold',
  },
  {
    id: 'reward-trophy',
    name: 'EcoSpark Champion',
    description: 'Top-tier sustainability champion — the rarest award.',
    icon: '🏆',
    pointCost: 2500,
    tier: 'platinum',
  },
];

async function seed() {
  console.log('🌱 Seeding tasks...');
  const tasksBatch = db.batch();
  for (const task of TASKS) {
    tasksBatch.set(db.collection('tasks').doc(task.id), task);
  }
  await tasksBatch.commit();
  console.log(`✅ ${TASKS.length} tasks seeded`);

  console.log('🎁 Seeding rewards...');
  const rewardsBatch = db.batch();
  for (const reward of REWARDS) {
    rewardsBatch.set(db.collection('rewards').doc(reward.id), reward);
  }
  await rewardsBatch.commit();
  console.log(`✅ ${REWARDS.length} rewards seeded`);

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
