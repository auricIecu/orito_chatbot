// Configuración de la aplicación
export const config = {
  // URL base de la API
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Configuración de la aplicación
  app: {
    name: 'Chatbot UI',
    version: '1.0.0'
  },
  
  // Configuración de la API
  api: {
    endpoints: {
      chat: '/chat',
      conversations: '/conversations',
      messages: '/messages',
      feedback: '/feedback',
      systemMessage: '/system-message',
      export: '/export'
    }
  }
};

export default config;
