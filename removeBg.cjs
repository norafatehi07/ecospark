const { Jimp } = require('jimp');
const fs = require('fs');

async function processImage(filename) {
    const imgPath = `./public/companions/${filename}`;
    if (!fs.existsSync(imgPath)) return;
    const img = await Jimp.read(imgPath);
    img.scan((x, y, idx) => {
        const r = img.bitmap.data[idx];
        const g = img.bitmap.data[idx + 1];
        const b = img.bitmap.data[idx + 2];
        const a = img.bitmap.data[idx + 3];
        // Calculate perceived brightness
        const brightness = Math.max(r, g, b);
        
        // If it's a very dark pixel, make it transparent
        // For glowing pixels, we make them partially transparent based on brightness
        if (brightness < 40) {
            img.bitmap.data[idx + 3] = 0; // Fully transparent
        } else if (brightness < 100) {
            // Smooth fade
            img.bitmap.data[idx + 3] = Math.floor((brightness - 40) * (255 / 60));
        }
    });
    await img.write(imgPath.replace('.png', '_trans.png'));
    console.log(`Processed ${filename}`);
}

async function run() {
    await processImage('sprout.png');
    await processImage('waterwisp.png');
    await processImage('terrabot.png');
    await processImage('phoenix.png');
}

run();
