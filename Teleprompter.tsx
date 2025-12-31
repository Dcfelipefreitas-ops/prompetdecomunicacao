
import React, { useRef, useEffect, useState } from 'react';
import { PrompterConfig } from '../types';

interface TeleprompterProps {
  config: PrompterConfig;
  isScrolling: boolean;
}

const Teleprompter: React.FC<TeleprompterProps> = ({ config, isScrolling }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const requestRef = useRef<number>();

  const animate = (time: number) => {
    setScrollPos(prev => {
      // Logic for pixel-perfect scrolling
      // speed factor: config.speed pixels per frame (roughly)
      return prev + (config.speed * 0.5);
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isScrolling) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isScrolling, config.speed]);

  // Reset scroll when script changes or stopped
  useEffect(() => {
    if (!isScrolling) {
      setScrollPos(0);
    }
  }, [config.script, isScrolling]);

  return (
    <div 
      className="absolute inset-0 z-30 pointer-events-none flex flex-col overflow-hidden"
      style={{ 
        backgroundColor: `rgba(0, 0, 0, ${config.opacity === 1 ? '0' : '0.4'})`
      }}
    >
      {/* Target Marker */}
      <div className="absolute top-[20%] left-0 right-0 h-2 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-40" />
      
      {/* Scrolling Content */}
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col"
        style={{
          transform: `translateY(${-scrollPos}px)`,
          transition: isScrolling ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Spacer to start text at the bottom initially */}
        <div className="min-h-[60%] flex-shrink-0" />
        
        <div 
          ref={textRef}
          className={`px-12 md:px-24 py-12 text-center font-bold tracking-tight ${config.mirror ? 'scale-x-[-1]' : ''}`}
          style={{ 
            fontSize: `${config.fontSize}px`,
            lineHeight: 1.4,
            textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
            color: 'white'
          }}
        >
          {config.script.split('\n').map((line, i) => (
            <p key={i} className="mb-6 last:mb-0 whitespace-pre-wrap">{line}</p>
          ))}
        </div>

        {/* Bottom Spacer to allow full scroll out */}
        <div className="min-h-screen flex-shrink-0" />
      </div>

      {/* Aesthetic Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />
    </div>
  );
};

export default Teleprompter;
