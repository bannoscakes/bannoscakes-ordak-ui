import React from 'react';
import { createPortal } from 'react-dom';
import QueueDebug from '../features/queue/QueueDebug';
import EnvBadge from './EnvBadge';

export default function DebugOverlay() {
  const el = (
    <div style={{
      position: 'fixed', top: 12, right: 12, zIndex: 9999,
      width: 420, maxHeight: '80vh', overflow: 'auto',
      background: '#0b0b0f', color: '#fff', borderRadius: 12,
      padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,.35)'
    }}>
      <div style={{fontWeight: 700, marginBottom: 8}}>DEV · Queue Debug</div>
      <QueueDebug />
      <div style={{marginTop: 8}}><EnvBadge /></div>
    </div>
  );
  return createPortal(el, document.body);
}
