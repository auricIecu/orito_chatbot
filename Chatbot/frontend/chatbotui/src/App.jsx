import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import customLogo from './assets/Banana in a Speech Bubble.png';
import ConversationHistory from './ConversationHistory';

const App = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatActive, setIsChatActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [systemMessage, setSystemMessage] = useState('You are a useful AI assistant.');
  const [showSystemMessage, setShowSystemMessage] = useState(false);
  const chatContainerRef = useRef(null);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (!conversationId) {
      setConversationId(Date.now().toString());
    }
  }, [conversationId]);
  
  // Función para cargar los mensajes de una conversación seleccionada del historial
  const loadConversation = async (selectedConversationId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/conversations/${selectedConversationId}/messages`);
      
      if (!response.ok) {
        throw new Error('Error loading conversation');
      }
      
      const messages = await response.json();
      
      // Transformar los mensajes al formato utilizado en el chatHistory
      const formattedMessages = messages.map(msg => ({
        sender: msg.role,
        text: msg.content,
        id: msg.id
      }));
      
      setChatHistory(formattedMessages);
      setConversationId(selectedConversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    if (message.trim() === '') return;

    setLoading(true);
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { sender: 'user', text: message },
    ]);

    try {
      const response = await fetch(`http://localhost:8000/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          role: 'user',
          conversation_id: conversationId, // Send the conversation_id with the message
        }),
      });

      if (!response.ok) {
        throw new Error('Error with API request');
      }

      const data = await response.json();
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { sender: 'ai', text: data.response, id: data.message_id },
      ]);
      setMessage('');
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Función para borrar la conversación actual
  const clearConversation = async () => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/clear-conversation/?conversation_id=${conversationId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error clearing conversation');
      }
      
      const data = await response.json();
      setConversationId(data.conversation_id);
      setChatHistory([]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };
  
  // Función para iniciar una nueva conversación sin borrar la actual
  const startNewConversation = () => {
    // Generamos un nuevo ID basado en la marca de tiempo actual
    const newConversationId = Date.now().toString();
    setConversationId(newConversationId);
    setChatHistory([]);
  };

  // Función para enviar feedback sobre una respuesta
  const sendFeedback = async (message, isPositive) => {
    try {
      // Verificar si el mensaje tiene un ID (necesario para mensajes cargados del historial)
      if (!message.id) {
        console.error('No message ID available for feedback');
        return;
      }
      
      const response = await fetch(`http://localhost:8000/feedback/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_id: message.id,
          is_positive: isPositive,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error sending feedback');
      }
      
      // Actualizar el estado local para mostrar que se ha enviado feedback
      setChatHistory((prevHistory) => {
        return prevHistory.map(msg => {
          if (msg === message) {
            return {
              ...msg,
              feedback: isPositive ? 'positive' : 'negative',
            };
          }
          return msg;
        });
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  // Función para actualizar el mensaje del sistema
  const updateSystemMessage = async () => {
    try {
      const response = await fetch(`http://localhost:8000/update-system-message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          system_message: systemMessage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error updating system message');
      }
      
      setShowSystemMessage(false);
    } catch (error) {
      console.error('Error updating system message:', error);
    }
  };

  // Función para exportar la conversación
  const exportConversation = () => {
    if (!conversationId) return;
    
    // Crear un enlace para descargar el archivo
    const link = document.createElement('a');
    link.href = `http://localhost:8000/export-conversation/${conversationId}`;
    link.download = `conversation_${conversationId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#bc983a] fixed inset-0 flex justify-center items-center p-4">

      <div className="w-full max-w-lg bg-[#bc983a] rounded-lg shadow-lg p-4 sm:p-6 border-2 border-[#efca2d]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <img 
              src={customLogo} 
              alt="Orito Logo" 
              className="h-10 w-auto" 
            />
            <h1 className="text-xl text-white sm:text-2xl font-semibold">orito</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSystemMessage(!showSystemMessage)}
              className="bg-zinc-700 text-white py-1 px-3 rounded-lg text-sm"
            >
              Personalizar AI
            </button>
            <button
              onClick={exportConversation}
              className="bg-zinc-700 text-white py-1 px-3 rounded-lg text-sm"
            >
              Exportar
            </button>
            <button
              onClick={startNewConversation}
              className="bg-green-600 text-white py-1 px-3 rounded-lg text-sm"
            >
              Nueva
            </button>
            <button
              onClick={clearConversation}
              className="bg-red-700 text-white py-1 px-3 rounded-lg text-sm"
            >
              Borrar
            </button>
          </div>
        </div>
        
        {/* Componente de historial de conversaciones */}
        <ConversationHistory 
          onSelectConversation={loadConversation} 
          currentConversationId={conversationId} 
        />

        {showSystemMessage && (
          <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
            <textarea
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              className="w-full p-2 mb-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-950 text-white text-sm"
              rows="3"
              placeholder="Personaliza el comportamiento del chatbot..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSystemMessage(false)}
                className="bg-zinc-700 text-white py-1 px-3 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={updateSystemMessage}
                className="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        <div
          ref={chatContainerRef}
          className="overflow-y-auto h-96 space-y-4 mb-4 p-4 border border-zinc-900 rounded-lg "
        >
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-xs p-3 rounded-lg bg-[#efca2d] text-black`}>
                {msg.text}
              </div>
              {msg.sender === 'ai' && (
                <div className="flex mt-1 space-x-2">
                  <button
                    onClick={() => sendFeedback(msg, true)}
                    className={`text-xs p-1 rounded ${msg.feedback === 'positive' ? 'bg-green-600' : 'bg-zinc-800'} text-white`}
                    title="Me gusta esta respuesta"
                    disabled={msg.feedback}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => sendFeedback(msg, false)}
                    className={`text-xs p-1 rounded ${msg.feedback === 'negative' ? 'bg-red-600' : 'bg-zinc-800'} text-white`}
                    title="No me gusta esta respuesta"
                    disabled={msg.feedback}
                  >
                    👎
                  </button>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-xs p-3 rounded-lg bg-gray-900 text-white animate-pulse">
                Orito está escribiendo...
              </div>
            </div>
          )}
        </div>


        {isChatActive && (
          <form onSubmit={sendMessage} className="flex flex-col sm:flex-row items-center  sm:space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-950 text-white text-sm sm:text-base"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="bg-gray-600 text-white py-2 px-4 rounded-lg text-sm sm:text-base disabled:opacity-50"
              disabled={loading || !message.trim()}
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default App;