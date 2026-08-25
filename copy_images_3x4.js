const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/praja/.gemini/antigravity/brain/61947b7b-c3f9-4134-a32e-b03482c7f4d2/';
const dstDir = path.join(__dirname, 'public/design/game-tiles/');

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jpg') && f.includes('3x4'));

const mapping = {
    'wingo': 'wingo.png',
    'k3': 'k3_gold.jpg',
    'fived': 'fived_gold.jpg',
    'crash': 'aviator.png',
    'limbo': 'limbo_gold.jpg',
    'mines': 'mines_gold.jpg',
    'dice': 'dice_gold.jpg',
    'jili_slots': 'jili-slots.jpg',
    'pg_slots': 'pg-slots.png',
    'evolution': 'evolution.png',
    'cricket': 'cricket.jpg'
};

files.forEach(f => {
    // extract key
    let key = '';
    for (const k in mapping) {
        if (f.startsWith(k + '_poster_3x4')) {
            key = k;
            break;
        }
    }
    
    if (key) {
        const dstPath = path.join(dstDir, mapping[key]);
        const srcPath = path.join(srcDir, f);
        
        fs.copyFileSync(srcPath, dstPath);
        console.log(`Copied ${f} to ${mapping[key]}`);
    }
});
