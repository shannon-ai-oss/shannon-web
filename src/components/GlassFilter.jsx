import React from 'react';

const GlassFilter = () => (
  <svg style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}>
    <defs>
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence 
          type="turbulence" 
          baseFrequency="0.02 0.08" 
          numOctaves="2" 
          result="turbulence"
        />
        <feDisplacementMap 
          in2="turbulence" 
          in="SourceGraphic" 
          scale="3" 
          xChannelSelector="R" 
          yChannelSelector="G"
        />
      </filter>
      <filter id="glass-blur" x="0%" y="0%" width="100%" height="100%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.2"/>
      </filter>
    </defs>
  </svg>
);

export default GlassFilter;