import React from 'react';

const DeleteConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  warningMessage,
  confirmText = "Eliminar",
  cancelText = "Cancelar"
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '28rem',
          width: '100%',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.875rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>{title}</h3>
          </div>
          
          <p style={{ color: '#4b5563', marginBottom: '1rem', margin: '0 0 1rem 0' }}>{message}</p>
          
          {warningMessage && (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '0.5rem', 
              padding: '0.75rem', 
              marginBottom: '1rem' 
            }}>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>{warningMessage}</p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              className="btn btn-gray"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="btn btn-red"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation; 