import React from 'react';

const CRTOverlay: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden h-full w-full">
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.02)] to-transparent bg-[length:100%_4px] animate-scanlines pointer-events-none"></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]"></div>
    </div>
  );
};

export default CRTOverlay;