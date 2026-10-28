// Copies OpenCV.js into public/vendor so the classic Web Worker can load it with importScripts().
// (Emscripten only detects a worker environment when importScripts exists, which module workers lack.)
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const src = require.resolve('@techstark/opencv-js/dist/opencv.js');
const outDir = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'public', 'vendor');
mkdirSync(outDir, { recursive: true });
copyFileSync(src, join(outDir, 'opencv-4.12.0.js'));
console.log('copied OpenCV.js to public/vendor/opencv-4.12.0.js');
