import os
import json
from typing import List, Dict, Optional
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db, Conversation as DBConversation, Message as DBMessage, Feedback as DBFeedback


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


if not GROQ_API_KEY:
    raise ValueError("API key for Groq is missing. Please set the GROQ_API_KEY in the .env file.")


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = Groq(api_key=GROQ_API_KEY)


class UserInput(BaseModel):
    message: str
    role: str = "user"
    conversation_id: str

class SystemMessageInput(BaseModel):
    system_message: str
    conversation_id: str

class FeedbackInput(BaseModel):
    conversation_id: str
    message_id: int
    is_positive: bool
    
class ConversationResponse(BaseModel):
    id: int
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    
class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    
# Almacenamiento en memoria para conversaciones activas
# Esto se usa como caché para evitar consultas a la base de datos en cada mensaje
active_conversations: Dict[str, List[Dict[str, str]]] = {}




def query_groq_api(messages: List[Dict[str, str]]) -> str:
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=1,
            max_tokens=1024,
            top_p=1,
            stream=True,
            stop=None,
        )
        
        response = ""
        for chunk in completion:
            response += chunk.choices[0].delta.content or ""
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error with Groq API: {str(e)}")


def get_or_create_conversation_in_db(conversation_id: str, db: Session) -> DBConversation:
    # Buscar la conversación en la base de datos
    db_conversation = db.query(DBConversation).filter(DBConversation.conversation_id == conversation_id).first()
    
    # Si no existe, crear una nueva
    if not db_conversation:
        db_conversation = DBConversation(conversation_id=conversation_id)
        # Agregar el mensaje del sistema
        system_message = DBMessage(
            role="system",
            content="You are a useful AI assistant.",
            conversation=db_conversation
        )
        db.add(db_conversation)
        db.add(system_message)
        db.commit()
        db.refresh(db_conversation)
    
    return db_conversation

def get_conversation_messages(conversation_id: str, db: Session) -> List[Dict[str, str]]:
    # Primero verificamos si la conversación está en memoria
    if conversation_id in active_conversations:
        return active_conversations[conversation_id]
    
    # Si no está en memoria, la buscamos en la base de datos
    db_conversation = get_or_create_conversation_in_db(conversation_id, db)
    
    # Convertir los mensajes de la base de datos al formato esperado por la API
    messages = []
    for db_message in db.query(DBMessage).filter(DBMessage.conversation_id == db_conversation.id).order_by(DBMessage.created_at).all():
        messages.append({
            "role": db_message.role,
            "content": db_message.content
        })
    
    # Guardar en memoria para acceso rápido
    active_conversations[conversation_id] = messages
    
    return messages




@app.post("/chat/")
async def chat(input: UserInput, db: Session = Depends(get_db)):
    # Obtener o crear la conversación en la base de datos
    db_conversation = get_or_create_conversation_in_db(input.conversation_id, db)

    if not db_conversation.active:
        raise HTTPException(
            status_code=400, 
            detail="The chat session has ended. Please start a new session."
        )
        
    try:
        # Obtener los mensajes actuales
        messages = get_conversation_messages(input.conversation_id, db)
        
        # Añadir el mensaje del usuario
        user_message = DBMessage(
            role=input.role,
            content=input.message,
            conversation_id=db_conversation.id
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Actualizar los mensajes en memoria
        messages.append({
            "role": input.role,
            "content": input.message
        })
        
        # Obtener respuesta de la API
        response = query_groq_api(messages)
        
        # Guardar la respuesta en la base de datos
        assistant_message = DBMessage(
            role="assistant",
            content=response,
            conversation_id=db_conversation.id
        )
        db.add(assistant_message)
        
        # Actualizar el título de la conversación si es la primera interacción
        if len(messages) <= 2:  # Solo el mensaje del sistema y el primer mensaje del usuario
            # Usar las primeras palabras del mensaje del usuario como título
            title_words = input.message.split()[:5]
            title = " ".join(title_words) + "..." if len(title_words) == 5 else input.message
            db_conversation.title = title
            db.add(db_conversation)
        
        db.commit()
        db.refresh(assistant_message)
        
        # Actualizar los mensajes en memoria
        messages.append({
            "role": "assistant",
            "content": response
        })
        active_conversations[input.conversation_id] = messages
        
        return {
            "response": response,
            "conversation_id": input.conversation_id,
            "message_id": assistant_message.id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clear-conversation/")
async def clear_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Endpoint para borrar una conversación actual y crear una nueva"""
    # Desactivar la conversación anterior en lugar de eliminarla
    db_conversation = db.query(DBConversation).filter(DBConversation.conversation_id == conversation_id).first()
    if db_conversation:
        db_conversation.active = False
        db.commit()
    
    # Eliminar de la caché de memoria
    if conversation_id in active_conversations:
        del active_conversations[conversation_id]
    
    # Crear una nueva conversación
    new_conversation_id = f"{datetime.now().timestamp():.0f}"
    new_conversation = DBConversation(conversation_id=new_conversation_id)
    db.add(new_conversation)
    
    # Añadir mensaje del sistema
    system_message = DBMessage(
        role="system",
        content="You are a useful AI assistant.",
        conversation=new_conversation
    )
    db.add(system_message)
    db.commit()
    
    # Inicializar en memoria
    active_conversations[new_conversation_id] = [
        {"role": "system", "content": "You are a useful AI assistant."}
    ]
    
    return {"conversation_id": new_conversation_id}


@app.post("/feedback/")
async def submit_feedback(feedback: FeedbackInput, db: Session = Depends(get_db)):
    """Endpoint para recibir feedback sobre respuestas específicas del chatbot"""
    # Verificar que el mensaje existe
    message = db.query(DBMessage).filter(DBMessage.id == feedback.message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verificar si ya existe feedback para este mensaje
    existing_feedback = db.query(DBFeedback).filter(DBFeedback.message_id == feedback.message_id).first()
    
    if existing_feedback:
        # Actualizar feedback existente
        existing_feedback.is_positive = feedback.is_positive
    else:
        # Crear nuevo feedback
        new_feedback = DBFeedback(
            message_id=feedback.message_id,
            is_positive=feedback.is_positive
        )
        db.add(new_feedback)
    
    db.commit()
    
    return {"status": "success"}


@app.post("/update-system-message/")
async def update_system_message(input: SystemMessageInput, db: Session = Depends(get_db)):
    """Endpoint para actualizar el mensaje del sistema en una conversación"""
    # Obtener la conversación
    db_conversation = get_or_create_conversation_in_db(input.conversation_id, db)
    
    # Actualizar el mensaje del sistema en la base de datos (normalmente el primer mensaje)
    system_message = db.query(DBMessage).filter(
        DBMessage.conversation_id == db_conversation.id,
        DBMessage.role == "system"
    ).first()
    
    if system_message:
        system_message.content = input.system_message
    else:
        system_message = DBMessage(
            role="system",
            content=input.system_message,
            conversation_id=db_conversation.id
        )
        db.add(system_message)
    
    # Actualizar en la conversación
    db_conversation.system_message = input.system_message
    db.add(db_conversation)
    db.commit()
    
    # Actualizar en memoria
    if input.conversation_id in active_conversations:
        messages = active_conversations[input.conversation_id]
        if messages and messages[0]["role"] == "system":
            messages[0]["content"] = input.system_message
        else:
            messages.insert(0, {"role": "system", "content": input.system_message})
        active_conversations[input.conversation_id] = messages
    
    return {"status": "success"}


@app.get("/export-conversation/{conversation_id}")
async def export_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Endpoint para exportar una conversación como archivo de texto"""
    # Buscar la conversación en la base de datos
    db_conversation = db.query(DBConversation).filter(DBConversation.conversation_id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Obtener todos los mensajes de la conversación
    messages = db.query(DBMessage).filter(
        DBMessage.conversation_id == db_conversation.id
    ).order_by(DBMessage.created_at).all()
    
    # Crear un archivo temporal con el contenido de la conversación
    filename = f"conversation_{conversation_id}.txt"
    with open(filename, "w") as f:
        for msg in messages:
            if msg.role != "system":  # No incluir el mensaje del sistema en la exportación
                f.write(f"{msg.role.upper()}: {msg.content}\n\n")
    
    return FileResponse(path=filename, filename=filename, media_type="text/plain")


@app.get("/conversations/")
async def get_conversations(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """Endpoint para obtener la lista de conversaciones"""
    conversations = db.query(DBConversation).\
        filter(DBConversation.active == True).\
        order_by(DBConversation.updated_at.desc()).\
        offset(skip).limit(limit).all()
    
    return [
        {
            "id": conv.id,
            "conversation_id": conv.conversation_id,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at
        } for conv in conversations
    ]


@app.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages_endpoint(
    conversation_id: str, 
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """Endpoint para obtener los mensajes de una conversación específica"""
    # Buscar la conversación
    db_conversation = db.query(DBConversation).filter(DBConversation.conversation_id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Obtener los mensajes, excluyendo los del sistema
    messages = db.query(DBMessage).\
        filter(DBMessage.conversation_id == db_conversation.id).\
        filter(DBMessage.role != "system").\
        order_by(DBMessage.created_at).\
        offset(skip).limit(limit).all()
    
    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at
        } for msg in messages
    ]


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Endpoint para eliminar (desactivar) una conversación"""
    db_conversation = db.query(DBConversation).filter(DBConversation.conversation_id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Desactivar en lugar de eliminar
    db_conversation.active = False
    db.commit()
    
    # Eliminar de la memoria si existe
    if conversation_id in active_conversations:
        del active_conversations[conversation_id]
    
    return {"status": "success"}
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)