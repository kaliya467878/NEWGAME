const fs = require('fs');
const http = require('http');

// Read the first chunk of the PNG file to get its width and height
function getPngDimensions(filePath) {
  const buffer = Buffer.alloc(24);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 24, 0);
  fs.closeSync(fd);
  
  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  return null;
}

const dims = getPngDimensions("C:/Users/praja/.gemini/antigravity/brain/61947b7b-c3f9-4134-a32e-b03482c7f4d2/.user_uploaded/media_1787594783490.png");
console.log("Width:", dims.width, "Height:", dims.height);
console.log("Aspect ratio:", dims.width / dims.height);
