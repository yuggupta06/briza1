"use client"
import React, { useEffect, useState } from 'react';

// Type definitions
interface MousePosition {
  x: number;
  y: number;
}

interface TrailPoint {
  x: number;
  y: number;
  id: number;
}

export default function  CircleCursor() {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isClicking, setIsClicking] = useState<boolean>(false);
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent): void => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Add to trail
      setTrail(prev => {
        const newTrail: TrailPoint[] = [...prev, { x: e.clientX, y: e.clientY, id: Date.now() }];
        return newTrail.slice(-8); // Keep last 8 positions
      });
    };

    const handleMouseOver = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInteractive = target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.closest('button') !== null || 
                           target.closest('a') !== null ||
                           target.classList.contains('cursor-pointer') ||
                           getComputedStyle(target).cursor === 'pointer';
      
      setIsHovering(isInteractive);
    };

    const handleMouseDown = (): void => setIsClicking(true);
    const handleMouseUp = (): void => setIsClicking(false);

    const handleMouseLeave = (): void => {
      setIsHovering(false);
      setIsClicking(false);
    };

    // Hide default cursor
    document.body.style.cursor = 'none';
    
    // Add event listeners
    document.addEventListener('mousemove', updateMousePosition);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      // Cleanup
      document.body.style.cursor = 'auto';
      document.removeEventListener('mousemove', updateMousePosition);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Trail Effect */}
      {trail.map((point: TrailPoint, index: number) => (
        <div
          key={index}
          className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
          style={{
            left: point.x - 2,
            top: point.y - 2,
            opacity: (index + 1) / trail.length * 0.6,
            transform: `scale(${(index + 1) / trail.length})`,
            transition: 'all 0.1s ease-out'
          }}
        />
      ))}

      {/* Main Cursor Circle */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-200 ease-out ${
          isHovering 
            ? 'w-12 h-12 border-purple-400 bg-purple-400/10 backdrop-blur-sm' 
            : 'w-8 h-8 border-blue-400 bg-blue-400/5'
        } ${
          isClicking ? 'scale-75' : 'scale-100'
        }`}
        style={{
          left: mousePosition.x - (isHovering ? 24 : 16),
          top: mousePosition.y - (isHovering ? 24 : 16),
          boxShadow: isHovering 
            ? '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)'
            : '0 0 15px rgba(59, 130, 246, 0.3)',
        }}
      >
        {/* Inner Dot */}
        <div 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${
            isHovering ? 'w-2 h-2 bg-purple-400' : 'w-1.5 h-1.5 bg-blue-400'
          }`}
        />
        
        {/* Ripple Effect on Click */}
        {isClicking && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping"
            style={{ 
              animation: 'ping 0.4s cubic-bezier(0, 0, 0.2, 1)' 
            }}
          />
        )}
      </div>

      {/* Hover Ring Effect */}
      {isHovering && (
        <div
          className="absolute rounded-full border border-purple-300/30 animate-pulse"
          style={{
            left: mousePosition.x - 32,
            top: mousePosition.y - 32,
            width: '64px',
            height: '64px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
      )}

      {/* Sparkle Effects on Hover */}
      {isHovering && (
        <>
          <div
            className="absolute w-1 h-1 bg-purple-400 rounded-full animate-ping"
            style={{
              left: mousePosition.x - 30,
              top: mousePosition.y - 15,
              animationDelay: '0s',
              animationDuration: '1.5s'
            }}
          />
          <div
            className="absolute w-0.5 h-0.5 bg-blue-400 rounded-full animate-ping"
            style={{
              left: mousePosition.x + 25,
              top: mousePosition.y - 20,
              animationDelay: '0.3s',
              animationDuration: '1.8s'
            }}
          />
          <div
            className="absolute w-0.5 h-0.5 bg-pink-400 rounded-full animate-ping"
            style={{
              left: mousePosition.x - 20,
              top: mousePosition.y + 25,
              animationDelay: '0.6s',
              animationDuration: '1.2s'
            }}
          />
        </>
      )}
    </div>
  );
};


