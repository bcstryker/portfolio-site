import React from 'react';

const Sun = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{
          background: 'radial-gradient(circle at center, #FFFF66 10%, #FFDD00 35%, #FFAA00 70%, transparent 90%)',
          borderRadius: '50%',
          width: '200px',
          height: '200px',
          boxShadow: '0 0 8px 2px #FFDD00', // Soft glow effect
        }}
      />
    </div>
  );
};

export default Sun;
