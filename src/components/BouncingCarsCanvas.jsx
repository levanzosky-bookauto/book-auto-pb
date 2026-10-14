import React, { useEffect, useRef } from 'react';

/**
 * BouncingCarsCanvas Component
 * Renders a single elegant supercar cruising slowly and smoothly around the screen,
 * gliding around the central Login Card with smooth, realistic steering without bouncing frantically.
 */
export default function BouncingCarsCanvas({ cardRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Single sleek supercar cruising slowly and smoothly
    const car = {
      name: 'Supercar GT',
      bodyColor: '#f59e0b', // Sleek Amber / Gold matching Book Auto theme
      accentColor: '#fef3c7',
      glowColor: '#f59e0b',
      x: Math.min(100, Math.max(50, canvas.width * 0.12)),
      y: Math.min(120, Math.max(50, canvas.height * 0.18)),
      width: 50,
      height: 26,
      currentAngle: 0.3,
      targetAngle: 0.3,
      speed: 0.65, // Rallentato, calmo ed elegante
      trails: [],
      steerNoise: Math.random() * 100
    };

    // Helper: Draw 3D Supercar Vector
    const drawSupercar = (c) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.currentAngle);

      const w = c.width;
      const h = c.height;

      // 1. Soft shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(2, 2, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Soft Neon Underglow
      ctx.shadowColor = c.glowColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = c.glowColor + '22';
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3. Main Car Body (Aerodynamic wedge)
      const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gradient.addColorStop(0, c.bodyColor);
      gradient.addColorStop(0.5, '#1e293b');
      gradient.addColorStop(1, c.bodyColor);
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(w / 2, 0); // Front nose
      ctx.lineTo(w / 4, -h / 2); // Front left
      ctx.lineTo(-w / 2 + 6, -h / 2); // Rear left
      ctx.lineTo(-w / 2, -h / 3);
      ctx.lineTo(-w / 2, h / 3);
      ctx.lineTo(-w / 2 + 6, h / 2); // Rear right
      ctx.lineTo(w / 4, h / 2); // Front right
      ctx.closePath();
      ctx.fill();

      // Delicate body outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Cabin & Tinted Windshield
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(w / 6, -h / 3);
      ctx.lineTo(-w / 4, -h / 3);
      ctx.lineTo(-w / 3, -h / 4);
      ctx.lineTo(-w / 3, h / 4);
      ctx.lineTo(-w / 4, h / 3);
      ctx.lineTo(w / 6, h / 3);
      ctx.closePath();
      ctx.fill();

      // Windshield reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(w / 8, -h / 4);
      ctx.lineTo(-w / 8, -h / 4);
      ctx.lineTo(-w / 6, 0);
      ctx.closePath();
      ctx.fill();

      // 5. Wheels
      const wheelW = 10;
      const wheelH = 4;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(w / 4 - 2, -h / 2 - 2, wheelW, wheelH);
      ctx.fillRect(w / 4 - 2, h / 2 - 2, wheelW, wheelH);
      ctx.fillRect(-w / 3 - 2, -h / 2 - 2, wheelW, wheelH);
      ctx.fillRect(-w / 3 - 2, h / 2 - 2, wheelW, wheelH);

      // Silver Rims
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(w / 4, -h / 2 - 1, wheelW - 4, wheelH - 2);
      ctx.fillRect(w / 4, h / 2 - 1, wheelW - 4, wheelH - 2);
      ctx.fillRect(-w / 3, -h / 2 - 1, wheelW - 4, wheelH - 2);
      ctx.fillRect(-w / 3, h / 2 - 1, wheelW - 4, wheelH - 2);

      // 6. Headlights & Gentle Beam Cones
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 3, -h / 3, 3, 3);
      ctx.fillRect(w / 2 - 3, h / 3 - 3, 3, 3);

      const lightGradient = ctx.createRadialGradient(w / 2 + 25, 0, 2, w / 2 + 25, 0, 60);
      lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      lightGradient.addColorStop(0.5, c.glowColor + '18');
      lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lightGradient;
      ctx.beginPath();
      ctx.moveTo(w / 2, -h / 3);
      ctx.lineTo(w / 2 + 65, -h * 0.9);
      ctx.lineTo(w / 2 + 65, h * 0.9);
      ctx.lineTo(w / 2, h / 3);
      ctx.closePath();
      ctx.fill();

      // 7. Taillights (Soft Red LED)
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#f87171';
      ctx.fillRect(-w / 2, -h / 3, 3, 4);
      ctx.fillRect(-w / 2, h / 3 - 4, 3, 4);

      ctx.restore();
    };

    // Main animation loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get Login Card bounding box if present
      let cardBox = null;
      if (cardRef && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        cardBox = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          halfW: rect.width / 2 + 50,
          halfH: rect.height / 2 + 50
        };
      }

      // 1. Organic cruising steer
      car.steerNoise += 0.006;
      let desiredAngle = car.targetAngle + Math.sin(car.steerNoise) * 0.008;

      // 2. Gentle Screen Margin Steering (Avoid walls calmly, without harsh bouncing)
      const margin = 85;
      let wallSteerX = 0;
      let wallSteerY = 0;

      if (car.x < margin) wallSteerX += (margin - car.x) / margin;
      if (car.x > canvas.width - margin) wallSteerX -= (car.x - (canvas.width - margin)) / margin;
      if (car.y < margin) wallSteerY += (margin - car.y) / margin;
      if (car.y > canvas.height - margin) wallSteerY -= (car.y - (canvas.height - margin)) / margin;

      if (wallSteerX !== 0 || wallSteerY !== 0) {
        desiredAngle = Math.atan2(wallSteerY, wallSteerX);
      }

      // 3. Smooth circulation around Central Login Card
      if (cardBox) {
        const dx = car.x - cardBox.cx;
        const dy = car.y - cardBox.cy;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        const avoidDist = Math.max(cardBox.halfW, cardBox.halfH) + 35;

        if (distToCenter < avoidDist) {
          // Tangential direction to circulate smoothly around the card
          const tangentAngle = Math.atan2(-dx, dy);
          const pushAngle = Math.atan2(dy, dx);
          const blendWeight = Math.min(1, Math.max(0, (avoidDist - distToCenter) / 45));
          
          desiredAngle = tangentAngle * (1 - blendWeight * 0.5) + pushAngle * (blendWeight * 0.5);
        }
      }

      car.targetAngle = desiredAngle;

      // 4. Smooth, realistic turning (gentle angular turning rate)
      let angleDiff = car.targetAngle - car.currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const maxTurn = 0.02; // Very smooth, calm steering
      const turnStep = Math.max(-maxTurn, Math.min(maxTurn, angleDiff * 0.04));
      car.currentAngle += turnStep;

      // 5. Update position with smooth slow speed
      const vx = Math.cos(car.currentAngle) * car.speed;
      const vy = Math.sin(car.currentAngle) * car.speed;
      car.x += vx;
      car.y += vy;

      // Safe containment in screen bounds
      car.x = Math.max(25, Math.min(canvas.width - 25, car.x));
      car.y = Math.max(25, Math.min(canvas.height - 25, car.y));

      // 6. Subtle soft light trail
      car.trails.push({ x: car.x, y: car.y, alpha: 0.3 });
      if (car.trails.length > 10) car.trails.shift();

      car.trails.forEach((trail, idx) => {
        trail.alpha *= 0.88;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, (idx / car.trails.length) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${trail.alpha.toFixed(2)})`;
        ctx.fill();
      });

      // 7. Draw the single supercar
      drawSupercar(car);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [cardRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5] w-full h-full"
    />
  );
}
