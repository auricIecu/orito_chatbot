# 🍌 Orito - Chatbot Inteligente

# 🔍 ¿Qué es Orito?

Orito es una solución de chatbot de próxima generación diseñada para transformar la interacción entre empresas y usuarios. Nuestra plataforma combina inteligencia artificial avanzada con una interfaz excepcionalmente intuitiva, ofreciendo una experiencia de conversación fluida y natural.

## 🎯 Valor Proporcionado

- **Asistencia 24/7**: Ofrece soporte ininterrumpido a tus usuarios en cualquier momento del día.
- **Automatización Inteligente**: Reduce la carga de trabajo de tu equipo al manejar consultas frecuentes de manera autónoma.
- **Integración Perfecta**: Fácil de integrar con tus sistemas existentes y canales de comunicación.
- **Personalización**: Adapta las respuestas y el comportamiento del chatbot según las necesidades específicas de tu negocio.
- **Análisis en Tiempo Real**: Obtén información valiosa sobre las interacciones de los usuarios para mejorar continuamente el servicio.

## 🌟 Beneficios Clave

- **Aumento de la eficiencia**: Reduce los tiempos de respuesta y la carga de trabajo del personal.
- **Mejora la satisfacción del cliente**: Proporciona respuestas rápidas y precisas las 24 horas del día.
- **Escalable**: Crece con tu negocio, manejando desde unas pocas hasta miles de interacciones diarias.
- **Fácil de implementar**: Solución lista para usar con documentación detallada y soporte completo.

Orito no es solo un chatbot, es un aliado estratégico que potencia la comunicación de tu negocio, mejorando la experiencia del usuario mientras optimizas tus operaciones.

## 🚀 Características

- Interfaz de usuario moderna y responsiva
- Historial de conversaciones
- Integración con modelos de lenguaje avanzados
- Fácil de desplegar con Docker
- Backend escalable con FastAPI
- Frontend construido con React y Vite

## 🛠️ Tecnologías

### Backend
- Python 3.9+
- FastAPI
- SQLite (base de datos)
- Uvicorn (servidor ASGI)

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Icons

## 📋 Requisitos previos

- Docker y Docker Compose
- Node.js 16+ (solo para desarrollo frontend)
- Python 3.9+ (solo para desarrollo backend)

## 🚀 Instalación

1. Clona el repositorio:
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd orito_chatbot/Chatbot
   ```

2. Inicia los contenedores con Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. La aplicación estará disponible en:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Documentación de la API: http://localhost:8000/docs

## 🏗️ Estructura del proyecto

```
.
├── backend/               # Código del servidor
│   ├── app.py            # Aplicación principal de FastAPI
│   ├── database.py       # Configuración de la base de datos
│   └── requirements.txt  # Dependencias de Python
├── frontend/             # Aplicación React
│   └── chatbotui/       # Código fuente del frontend
└── docker-compose.yml    # Configuración de Docker
```

## 🌐 Despliegue

### Despliegue local sin Docker

#### Backend
1. Crea un entorno virtual:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: .\venv\Scripts\activate
   ```

2. Instala las dependencias:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Inicia el servidor:
   ```bash
   uvicorn app:app --reload
   ```

#### Frontend
1. Instala las dependencias:
   ```bash
   cd frontend/chatbotui
   npm install
   ```

2. Inicia la aplicación de desarrollo:
   ```bash
   npm run dev
   ```

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz un fork del proyecto
2. Crea una rama con tu característica (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Haz push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## ✨ Agradecimientos

- Equipo de desarrollo de Orito (YO)
- Profe Hugo
- Profe Alberto
- Profe Miguel

---

Hecho con ❤️ por el equipo de Orito (YO)
