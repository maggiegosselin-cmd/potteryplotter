// A synthetic 12 MP "pot" photo for trying the app on a computer with no camera.
export async function makeSamplePhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = 4000;
  canvas.height = 3000;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, 3000);
  bg.addColorStop(0, '#e9dcc6');
  bg.addColorStop(1, '#b9a98c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 4000, 3000);
  const glaze = ctx.createRadialGradient(1800, 1500, 100, 2000, 1700, 1000);
  glaze.addColorStop(0, '#6fa3a0');
  glaze.addColorStop(1, '#2f5d62');
  ctx.fillStyle = glaze;
  ctx.beginPath();
  ctx.ellipse(2000, 1800, 900, 800, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(1700, 800, 600, 400);
  ctx.fillStyle = '#1e3b3f';
  ctx.beginPath();
  ctx.ellipse(2000, 800, 300, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no sample'))), 'image/jpeg', 0.9),
  );
  canvas.width = 0;
  canvas.height = 0;
  return new File([blob], 'sample-pot.jpg', { type: 'image/jpeg' });
}

// Small pot pictures for the example pots: a glazed bowl in two colours.
const EXAMPLE_COLOURS = { teal: ['#6fa3a0', '#2f5d62'], brown: ['#a8683c', '#4a2a17'] };

/** { teal: Blob, brown: Blob }; empty if this browser cannot draw them (the example pots then have no photos). */
export async function makeExamplePhotos() {
  const out = {};
  try {
    for (const [name, [light, dark]] of Object.entries(EXAMPLE_COLOURS)) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#e9dcc6';
      ctx.fillRect(0, 0, 320, 240);
      const glaze = ctx.createRadialGradient(140, 120, 10, 160, 140, 90);
      glaze.addColorStop(0, light);
      glaze.addColorStop(1, dark);
      ctx.fillStyle = glaze;
      ctx.beginPath();
      ctx.ellipse(160, 140, 90, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(160, 90, 70, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      out[name] = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no example photo'))), 'image/jpeg', 0.85),
      );
    }
  } catch {
    return {};
  }
  return out;
}
