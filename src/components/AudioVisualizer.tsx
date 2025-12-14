import React, { useEffect, useRef } from 'react';

type AudioVisualizerProps = {
    isSpeaking: boolean;
    stream?: MediaStream; // Optional: visualize user mic
    audioContext?: AudioContext; // Optional: visualize AI output
    mode: 'wave' | 'bars' | 'orb';
    color?: string;
};

export default function AudioVisualizer({ isSpeaking, stream, audioContext, mode, color = '#3b82f6' }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !isSpeaking) {
            if (!isSpeaking) {
                // Stop animation when not speaking to save resources/clear view
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        // Setup Audio Analysis if stream is provided (User Mic)
        // If no stream/context, we simulate the visualization (AI Speaking fallback)
        let analyser: AnalyserNode | null = null;

        if (stream) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;
            sourceRef.current = source;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const draw = () => {
            const width = rect.width;
            const height = rect.height;
            ctx.clearRect(0, 0, width, height);

            if (mode === 'orb') {
                // Simulation for AI Orb (when we don't have direct access to AI output stream easily)
                const time = Date.now() / 1000;
                const baseRadius = Math.min(width, height) * 0.3;
                // Dynamic radius based on "isSpeaking" (can be modulated by real data later)
                const pulse = isSpeaking ? Math.sin(time * 10) * 10 + Math.random() * 5 : 0;

                const gradient = ctx.createRadialGradient(width / 2, height / 2, baseRadius * 0.2, width / 2, height / 2, baseRadius + pulse);
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.5, `${color}88`); // Semi-transparent
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, baseRadius + pulse + 20, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, baseRadius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else if (mode === 'bars') {
                // Bar visualizer
                const barCount = 30;
                const barWidth = width / barCount / 1.5;
                const spacing = width / barCount;

                ctx.fillStyle = color;

                for (let i = 0; i < barCount; i++) {
                    // Simulate frequency data if real analyser not attached
                    let value = 0.2;
                    if (isSpeaking) {
                        // Create a symmetrical wave pattern
                        const distanceFromCenter = Math.abs(i - barCount / 2);
                        const wave = Math.sin(Date.now() / 200 + i * 0.5);
                        value = Math.max(0.1, (1 - distanceFromCenter / (barCount / 2)) * Math.abs(wave));
                    }

                    const barHeight = value * height * 0.8;
                    const x = i * spacing + (spacing - barWidth) / 2;
                    const y = (height - barHeight) / 2;

                    // Rounded rectangle bars
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, 5);
                    ctx.fill();
                }
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            // Note: We don't close external AudioContexts here
        };
    }, [isSpeaking, stream, mode, color]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
