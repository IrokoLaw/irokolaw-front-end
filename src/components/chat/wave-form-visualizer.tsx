"use client";

import type React from "react";

import { useEffect, useState } from "react";

export const WaveformVisualizer: React.FC<{
  isRecording: boolean;
  amplitude?: number;
}> = ({ isRecording, amplitude = 0.5 }) => {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));

  useEffect(() => {
    if (!isRecording) {
      setBars(Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setBars((prev) => prev.map(() => Math.random() * amplitude + 0.1));
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, amplitude]);

  return (
    <div className="flex items-center justify-center space-x-1 h-8">
      {bars.map((height, index) => (
        <div
          key={index}
          className="bg-primary transition-all duration-100 ease-out rounded-full w-1"
          style={{
            height: `${height * 100}%`,
            minHeight: "4px",
          }}
        />
      ))}
    </div>
  );
};
