const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Failed')) {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('PAGE UNHANDLED ERROR:', error.message));

  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle2' });
  
  await page.type('input[type="email"]', 'test@test.com');
  await page.type('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  console.log('Clicked login, waiting for network...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  
  // Go to a specific user's profile to follow them
  // Assuming there's a user list on the leaderboard or community page, or we just navigate to a fake ID
  // Wait, we need a valid target user ID to follow!
  // Let's just navigate to community and click the first user avatar
  console.log('Navigating to community...');
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle2' });
  
  // Click first avatar
  await page.waitForSelector('a[href^="/user/"]');
  await page.click('a[href^="/user/"]');
  
  // Wait for profile page to load
  await page.waitForSelector('button'); // wait for buttons
  
  console.log('Clicking follow button...');
  // Find the follow button (it might be disabled if it's our own profile, so let's hope it's not)
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text === 'Follow') {
      await btn.click();
      console.log('Follow button clicked');
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
