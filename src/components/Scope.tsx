import { useEffect, useRef } from 'react';

type ScopeProps = {
  samples?: number[];
  color: string;
  width?: number;
  height?: number;
};

export function Scope({ samples, color, width = 48, height = 18 }: ScopeProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (!samples || samples.length === 0) {
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const len = samples.length;
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * width;
      const y = (1 - Math.max(-1, Math.min(1, samples[i] / 5)) * 0.5 - 0.5) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, [samples, color, width, height]);

  return <canvas className="Scope" ref={ref} width={width} height={height} />;
}
