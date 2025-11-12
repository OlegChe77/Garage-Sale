import React from 'react';

const ScanningOverlay: React.FC = () => {
    return (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-md">
            {/* Pulsing Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(66,153,225,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(66,153,225,0.2)_1px,transparent_1px)] bg-[size:2rem_2rem] animate-pulse-grid"></div>
            
            {/* Scanning Line */}
            <div className="absolute left-0 w-full h-1 bg-cyan-400/80 shadow-[0_0_15px_5px_rgba(0,255,255,0.7)] animate-scan-line"></div>
        </div>
    );
};

export default ScanningOverlay;
