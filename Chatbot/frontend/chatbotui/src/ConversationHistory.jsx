import React, { useState, useEffect } from 'react';

const ConversationHistory = ({ onSelectConversation, currentConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (showHistory) {
      fetchConversations();
    }
  }, [showHistory]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/conversations/');
      if (!response.ok) {
        throw new Error('Error fetching conversations');
      }
      const data = await response.json();
      setConversations(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('No se pudieron cargar las conversaciones. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (e, conversationId) => {
    e.stopPropagation(); // Evitar que se seleccione la conversación al eliminarla
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error deleting conversation');
      }
      
      // Actualizar la lista de conversaciones
      setConversations(conversations.filter(conv => conv.conversation_id !== conversationId));
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('Error al eliminar la conversación');
    }
  };

  // Formatear fecha para mostrarla más amigable
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center text-white bg-[#bc983a] hover:bg-[#d4ac3a] px-3 py-1 rounded-lg text-sm mb-2"
      >
        <span>{showHistory ? '▼' : '►'} Historial de conversaciones</span>
      </button>
      
      {showHistory && (
        <div className="bg-[#d4ac3a]/30 border border-[#efca2d] rounded-lg p-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center text-white">Cargando...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-white">No hay conversaciones guardadas</div>
          ) : (
            <ul className="space-y-2">
              {conversations.map((conv) => (
                <li
                  key={conv.conversation_id}
                  className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                    conv.conversation_id === currentConversationId
                      ? 'bg-[#efca2d] text-black'
                      : 'bg-[#bc983a]/50 text-white hover:bg-[#bc983a]/70'
                  }`}
                  onClick={() => onSelectConversation(conv.conversation_id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{conv.title}</span>
                    <span className="text-xs opacity-80">{formatDate(conv.updated_at)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.conversation_id)}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;
