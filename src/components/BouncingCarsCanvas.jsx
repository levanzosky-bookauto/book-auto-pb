import React, { useEffect, useRef } from 'react';

/**
 * BouncingCarsCanvas Component
 * Renders 3D-styled Supercars (Ferrari, Lamborghini, Porsche, Bugatti, McLaren)
 * cruising smoothly across the screen and bouncing off boundaries and the Login Card
 * with dynamic randomized turn angles (30°, 45°, 60°, 90°, 120°).
 */
export default function BouncingCarsCanvas({ cardRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Supercar Preset Definitions
    const CAR_TYPES = [
      {
        name: 'Ferrari 8C / F8',
        bodyColor: '#dc2626', // Rosso Corsa Red
        accentColor: '#fef08a',
        glowColor: '#ef4444',
        type: 'ferrari'
      },
      {
        name: 'Lamborghini Aventador',
        bodyColor: '#eab308', // Giallo Orion Yellow
        accentColor: '#ffffff',
        glowColor: '#eab308',
        type: 'lamborghini'
      },
      {
        name: 'Bugatti Chiron',
        bodyColor: '#2563eb', // Bugatti French Racing Blue
        accentColor: '#60a5fa',
        glowColor: '#3b82f6',
        type: 'bugatti'
      },
      {
        name: 'Porsche 911 GT3',
        bodyColor: '#10b981', // Mamba Green Metallic
        accentColor: '#a7f3d0',
        glowColor: '#10b981',
        type: 'porsche'
      },
      {
        name: 'McLaren 720S',
        bodyColor: '#f97316', // Papaya Orange
        accentColor: '#ffedd5',
        glowColor: '#f97316',
        type: 'mclaren'
      },
      {
        name: 'Lamborghini Huracan Evo',
        bodyColor: '#06b6d4', // Verde Mantis / Cyan Neon
        accentColor: '#cff4fc',
        glowColor: '#06b6d4',
        type: 'lamborghini'
      }
    ];

    // Initialize 6 Supercars with smooth cruising speed & cross-screen trajectories
    const carCount = 6;
    const cars = [];

    const carWidth = 52;
    const carHeight = 28;

    for (let i = 0; i < carCount; i++) {
      const type = CAR_TYPES[i % CAR_TYPES.length];
      const speed = 1.1 + Math.random() * 0.5;

      // Spawn cars across 4 screen quadrants
      let x, y, angle;
      const zone = i % 4;

      if (zone === 0) {
        // Left side heading right
        x = 60 + Math.random() * 100;
        y = Math.random() * (canvas.height - 180) + 90;
        angle = (Math.random() - 0.5) * (Math.PI / 2); // Heading towards right side
      } else if (zone === 1) {
        // Right side heading left
        x = canvas.width - (60 + Math.random() * 100);
        y = Math.random() * (canvas.height - 180) + 90;
        angle = Math.PI + (Math.random() - 0.5) * (Math.PI / 2); // Heading towards left side
      } else if (zone === 2) {
        // Top side heading down
        x = Math.random() * (canvas.width - 180) + 90;
        y = 60 + Math.random() * 80;
        angle = Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 2);
      } else {
        // Bottom side heading up
        x = Math.random() * (canvas.width - 180) + 90;
        y = canvas.height - (60 + Math.random() * 80);
        angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 2);
      }

      cars.push({
        id: i,
        name: type.name,
        type: type.type,
        bodyColor: type.bodyColor,
        accentColor: type.accentColor,
        glowColor: type.glowColor,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        targetAngle: angle,
        currentAngle: angle,
        speed,
        width: carWidth,
        height: carHeight,
        trails: [],
        cooldown: 0,
        curveTimer: Math.random() * 100
      });
    }

    // Helper: Select a varied turn angle in degrees (30°, 45°, 60°, 75°, 90°, 120°)
    const getRandomAngleOffset = () => {
      const anglesInDegrees = [30, 45, 60, 75, 90, 105, 120];
      const deg = anglesInDegrees[Math.floor(Math.random() * anglesInDegrees.length)];
      const sign = Math.random() < 0.5 ? 1 : -1;
      return (deg * sign * Math.PI) / 180;
    };

    // Helper: Draw 3D Supercar Vector
    const drawSupercar = (car) => {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.currentAngle);

      const w = car.width;
      const h = car.height;

      // 1. Shadow under car
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(2, 2, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Neon Underglow Aura
      ctx.shadowColor = car.glowColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = car.glowColor + '33';
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3. Main Car Body (Aerodynamic Wedge shape)
      const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gradient.addColorStop(0, car.bodyColor);
      gradient.addColorStop(0.5, '#1e293b');
      gradient.addColorStop(1, car.bodyColor);
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(w / 2, 0); // Front nose
      ctx.lineTo(w / 4, -h / 2); // Front left corner
      ctx.lineTo(-w / 2 + 6, -h / 2); // Rear left corner
      ctx.lineTo(-w / 2, -h / 3); // Left tail
      ctx.lineTo(-w / 2, h / 3); // Right tail
      ctx.lineTo(-w / 2 + 6, h / 2); // Rear right corner
      ctx.lineTo(w / 4, h / 2); // Front right corner
      ctx.closePath();
      ctx.fill();

      // Body contour stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Cabin & Windshield (Tinted glass)
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

      // Glass reflections
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(w / 8, -h / 4);
      ctx.lineTo(-w / 8, -h / 4);
      ctx.lineTo(-w / 6, 0);
      ctx.closePath();
      ctx.fill();

      // 5. Wheels (Black rubber with silver rim)
      const wheelW = 10;
      const wheelH = 4;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(w / 4 - 2, -h / 2 - 2, wheelW, wheelH);
      ctx.fillRect(w / 4 - 2, h / 2 - 2, wheelW, wheelH);
      ctx.fillRect(-w / 3 - 2, -h / 2 - 2, wheelW, wheelH);
      ctx.fillRect(-w / 3 - 2, h / 2 - 2, wheelW, wheelH);

      // Silver Rims
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w / 4, -h / 2 - 1, wheelW - 4, wheelH - 2);
      ctx.fillRect(w / 4, h / 2 - 1, wheelW - 4, wheelH - 2);
      ctx.fillRect(-w / 3, -h / 2 - 1, wheelW - 4, wheelH - 2);
      ctx.fillRect(-w / 3, h / 2 - 1, wheelW - 4, wheelH - 2);

      // 6. Glowing Headlights & Light Cones
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 4, -h / 3, 4, 3);
      ctx.fillRect(w / 2 - 4, h / 3 - 3, 4, 3);

      // Light Beam Cones ahead of car
      const lightGradient = ctx.createRadialGradient(w / 2 + 30, 0, 2, w / 2 + 30, 0, 70);
      lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      lightGradient.addColorStop(0.5, car.glowColor + '22');
      lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lightGradient;
      ctx.beginPath();
      ctx.moveTo(w / 2, -h / 3);
      ctx.lineTo(w / 2 + 75, -h);
      ctx.lineTo(w / 2 + 75, h);
      ctx.lineTo(w / 2, h / 3);
      ctx.closePath();
      ctx.fill();

      // 7. Taillights (Red LED Strips)
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#f87171';
      ctx.fillRect(-w / 2, -h / 3, 3, 5);
      ctx.fillRect(-w / 2, h / 3 - 5, 3, 5);

      ctx.restore();
    };

    // Main Physics & Render Loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get current bounding rectangle of the Login Card
      let cardBox = null;
      if (cardRef && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const padding = 35;
        cardBox = {
          left: rect.left - padding,
          top: rect.top - padding,
          right: rect.right + padding,
          bottom: rect.bottom + padding,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2
        };
      }

      // Update & Draw Each Car
      cars.forEach((car) => {
        if (car.cooldown > 0) car.cooldown--;

        // Subtle organic cruising steer
        car.curveTimer += 0.015;
        const subtleSteer = Math.sin(car.curveTimer) * 0.005;
        const currentSpeedAngle = Math.atan2(car.vy, car.vx) + subtleSteer;
        car.vx = Math.cos(currentSpeedAngle) * car.speed;
        car.vy = Math.sin(currentSpeedAngle) * car.speed;

        // Motion Trails (Neon Tire Streaks)
        car.trails.push({ x: car.x, y: car.y, alpha: 0.6 });
        if (car.trails.length > 14) car.trails.shift();

        car.trails.forEach((trail, idx) => {
          trail.alpha *= 0.9;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, (idx / car.trails.length) * 3, 0, Math.PI * 2);
          ctx.fillStyle = car.glowColor + Math.floor(trail.alpha * 255).toString(16).padStart(2, '0');
          ctx.fill();
        });

        // Predict next position
        let nextX = car.x + car.vx;
        let nextY = car.y + car.vy;

        const radius = Math.max(car.width, car.height) / 2 + 4;

        // --- A. Screen Boundaries Collision (Varied Turn Angles: 30°, 45°, 60°, 90°, 120°) ---
        if (car.cooldown === 0) {
          let bounced = false;
          let baseNormalAngle = null;

          if (nextX - radius < 15) {
            // Left Wall: turn rightwards (-60° to +60°)
            baseNormalAngle = 0; // 0 degrees = right
            nextX = 15 + radius;
            bounced = true;
          } else if (nextX + radius > canvas.width - 15) {
            // Right Wall: turn leftwards (120° to 240°)
            baseNormalAngle = Math.PI; // 180 degrees = left
            nextX = canvas.width - 15 - radius;
            bounced = true;
          } else if (nextY - radius < 15) {
            // Top Wall: turn downwards (30° to 150°)
            baseNormalAngle = Math.PI / 2; // 90 degrees = down
            nextY = 15 + radius;
            bounced = true;
          } else if (nextY + radius > canvas.height - 15) {
            // Bottom Wall: turn upwards (-30° to -150°)
            baseNormalAngle = -Math.PI / 2; // -90 degrees = up
            nextY = canvas.height - 15 - radius;
            bounced = true;
          }

          if (bounced && baseNormalAngle !== null) {
            // Apply randomized varied angle offset (30°, 45°, 60°, 90°, 120°)
            const offset = getRandomAngleOffset();
            const newHeadingAngle = baseNormalAngle + offset;

            car.vx = Math.cos(newHeadingAngle) * car.speed;
            car.vy = Math.sin(newHeadingAngle) * car.speed;
            car.cooldown = 18;
          }
        }

        // --- B. Login Modal Card Bounding Box Collision ("Finestrino Login") ---
        if (cardBox && car.cooldown === 0) {
          if (
            nextX + radius > cardBox.left &&
            nextX - radius < cardBox.right &&
            nextY + radius > cardBox.top &&
            nextY - radius < cardBox.bottom
          ) {
            // Calculate angle pushing away from login card center
            const dx = car.x - cardBox.cx;
            const dy = car.y - cardBox.cy;
            const angleFromCenter = Math.atan2(dy, dx);

            // Add varied angle turn (30°, 45°, 60°, 90°)
            const turnOffset = getRandomAngleOffset();
            const newAngle = angleFromCenter + turnOffset;

            car.vx = Math.cos(newAngle) * car.speed * 1.05;
            car.vy = Math.sin(newAngle) * car.speed * 1.05;

            nextX = car.x + car.vx * 2;
            nextY = car.y + car.vy * 2;

            car.cooldown = 20;
          }
        }

        // --- C. Car to Car Collisions (Gentle deflection) ---
        cars.forEach((otherCar) => {
          if (otherCar.id === car.id) return;
          const dx = otherCar.x - car.x;
          const dy = otherCar.y - car.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = radius * 2.2;

          if (dist < minDist && dist > 0 && car.cooldown === 0) {
            const angleBetween = Math.atan2(dy, dx);
            const bounceAngle = angleBetween + Math.PI + getRandomAngleOffset() * 0.5;

            car.vx = Math.cos(bounceAngle) * car.speed;
            car.vy = Math.sin(bounceAngle) * car.speed;
            car.cooldown = 15;
          }
        });

        // Apply updated position
        car.x = nextX;
        car.y = nextY;

        // Smooth Rotation Steering towards velocity heading
        car.targetAngle = Math.atan2(car.vy, car.vx);
        let diff = car.targetAngle - car.currentAngle;

        // Normalize diff to -PI .. PI
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        car.currentAngle += diff * 0.09; // Smooth steering turn

        // Draw Supercar
        drawSupercar(car);
      });

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
