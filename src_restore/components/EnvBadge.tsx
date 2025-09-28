import React from 'react';

export default function EnvBadge() {
  const env = import.meta.env.MODE || 'development';
  const isDev = import.meta.env.DEV;
  
  return (
    <div style={{
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      backgroundColor: isDev ? '#ff6b6b' : '#4ecdc4',
      color: '#fff',
      textTransform: 'uppercase'
    }}>
      {env}
    </div>
  );
}
