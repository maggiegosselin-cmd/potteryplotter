// A made-up "photo" for trying the app on a computer with no camera.
// Drawn at 3000 x 2250 so it is big enough to exercise the shrinking.

export async function makeSamplePhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = 3000;
  canvas.height = 2250;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("This browser can't draw the sample photo.");
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#e9ddc9');
  sky.addColorStop(1, '#b9a68c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4f7f86'; // a glazed mug
  ctx.beginPath();
  ctx.ellipse(1500, 1250, 700, 640, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(1000, 600, 1000, 500);
  ctx.fillStyle = '#2f5a62';
  ctx.beginPath();
  ctx.ellipse(1500, 600, 500, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error("This browser couldn't make the sample photo.");
  return new File([blob], 'sample-mug.jpg', { type: 'image/jpeg' });
}
