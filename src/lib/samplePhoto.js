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

// A small finished-pot picture (a glazed pot shape in the given colour), for the
// example pots. Cheap to draw: 480 px, not a camera-sized canvas.
export async function makeSwatchPhoto(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e9dcc6';
  ctx.fillRect(0, 0, 480, 480);
  ctx.fillStyle = 'rgba(43, 33, 27, .15)';
  ctx.beginPath();
  ctx.ellipse(240, 410, 150, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(240, 290, 150, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(195, 90, 90, 80);
  ctx.fillStyle = 'rgba(0, 0, 0, .35)';
  ctx.beginPath();
  ctx.ellipse(240, 90, 45, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no sample'))), 'image/jpeg', 0.85),
  );
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
