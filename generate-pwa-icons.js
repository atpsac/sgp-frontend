const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, 'public', 'assets', 'icon-atp.png');
const outputDir = path.join(__dirname, 'public', 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

if (!fs.existsSync(input)) {
  console.error('No existe:', input);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

Promise.all(
  sizes.map((size) =>
    sharp(input)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
  )
).then(() => console.log('Iconos PWA generados correctamente'));