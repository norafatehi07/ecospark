const Jimp = require('jimp');

async function removeBg(inputFile, outputFile) {
  const image = await Jimp.read(inputFile);
  
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // Calculate brightness
    const brightness = (r + g + b) / 3;
    
    if (brightness < 30) {
      // Very dark pixels become completely transparent
      this.bitmap.data[idx + 3] = 0;
    } else if (brightness < 50) {
      // Smooth feathering for slightly dark pixels to avoid jagged edges
      const alpha = Math.floor(((brightness - 30) / 20) * 255);
      this.bitmap.data[idx + 3] = alpha;
    }
  });

  await image.writeAsync(outputFile);
  console.log('Processed', outputFile);
}

async function run() {
  await removeBg('public/lootboxes/bronze.png', 'public/lootboxes/bronze_alpha.png');
  await removeBg('public/lootboxes/silver.png', 'public/lootboxes/silver_alpha.png');
  await removeBg('public/lootboxes/gold.png', 'public/lootboxes/gold_alpha.png');
}

run();
