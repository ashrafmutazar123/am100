// Simple PWA Icon Generator using Canvas
// Run with: node generate-pwa-icons.js

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [
  { size: 64, name: 'pwa-64x64.png' },
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 512, name: 'maskable-icon-512x512.png', maskable: true }
];

async function generateIcons() {
  try {
    console.log('🎨 Generating PWA icons...');
    
    // Load source image
    const sourceImage = await loadImage(join(__dirname, 'public', 'organic.gif'));
    
    for (const config of sizes) {
      const canvas = createCanvas(config.size, config.size);
      const ctx = canvas.getContext('2d');
      
      // Fill background with brand color
      ctx.fillStyle = '#88B04B';
      ctx.fillRect(0, 0, config.size, config.size);
      
      if (config.maskable) {
        // Maskable icon - add safe zone padding (20%)
        const padding = config.size * 0.2;
        const iconSize = config.size - (padding * 2);
        ctx.drawImage(sourceImage, padding, padding, iconSize, iconSize);
      } else {
        // Regular icon
        ctx.drawImage(sourceImage, 0, 0, config.size, config.size);
      }
      
      // Save to file
      const buffer = canvas.toBuffer('image/png');
      const outputPath = join(__dirname, 'public', config.name);
      writeFileSync(outputPath, buffer);
      
      console.log(`✅ Generated ${config.name}`);
    }
    
    console.log('🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
