const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const output = path.resolve(__dirname, '../../../public/demo');

// Deterministic original synth, not a recording or a remote generated result.
const rate = 22050, seconds = 8, samples = rate * seconds;
const wave = Buffer.alloc(44 + samples * 2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(rate, 24); wave.writeUInt32LE(rate * 2, 28); wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) {
  const t = i / rate, envelope = Math.min(1, t / 0.8, (seconds - t) / 1.3);
  const notes = t < 4 ? [130.81, 196, 261.63, 329.63] : [146.83, 220, 293.66, 349.23];
  const value = notes.reduce((sum, hz, k) => sum + Math.sin(2 * Math.PI * hz * t) * (0.055 - k * 0.008), 0);
  wave.writeInt16LE(Math.round(value * envelope * 32767), 44 + i * 2);
}
fs.writeFileSync(path.join(output, 'blue-hour-ambient.wav'), wave);
fs.writeFileSync(path.join(output, 'blue-hour-copy.txt'), '蓝调时刻\n\n当最后一束暮光落向海面，城市慢慢亮起。窗里的暖光与水面的倒影，把匆忙的一天收进宁静。\n\n放慢一点，让灵感在此刻发生。\n\n——KK Studio 前端交互测试文案');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const image = fs.readFileSync(path.join(output, 'blue-hour.png')).toString('base64');
    const bytes = await page.evaluate(async image => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      const ctx = canvas.getContext('2d'); const photo = new Image();
      photo.src = `data:image/png;base64,${image}`; await photo.decode();
      const stream = canvas.captureStream(24);
      const chunks = []; const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 900000 });
      recorder.ondataavailable = e => chunks.push(e.data);
      const done = new Promise(resolve => recorder.onstop = resolve);
      recorder.start(); const start = performance.now();
      await new Promise(resolve => {
        function frame(now) {
          const progress = Math.min(1, (now - start) / 6000), zoom = 1 + progress * 0.08;
          const w = canvas.width * zoom, h = canvas.height * zoom;
          ctx.drawImage(photo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          if (progress < 1) requestAnimationFrame(frame); else resolve();
        }
        requestAnimationFrame(frame);
      });
      recorder.stop(); await done; stream.getTracks().forEach(track => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()));
    }, image);
    fs.writeFileSync(path.join(output, 'blue-hour-motion.webm'), Buffer.from(bytes));
    console.log(JSON.stringify({ audioBytes: wave.length, videoBytes: bytes.length, video: '6 second generated-image camera move, 640x360 VP8; no AI video service', audio: '8 second original procedural chord, mono WAV' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
