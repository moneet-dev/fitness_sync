# WebSocket Implementation Guide for Chat

## 📋 Overview

This guide outlines the changes required to replace polling-based chat with WebSocket real-time connections.

---

## 🔧 Backend Changes

### 1. **Add WebSocket Dependencies**

**File:** `backendV0/requirements.txt`

Add:
```
websockets==12.0
```

FastAPI has built-in WebSocket support, so no additional framework needed.

### 2. **Create WebSocket Connection Manager**

**New File:** `backendV0/websocket_manager.py`

```python
from typing import Dict, Set
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections for chat"""
    
    def __init__(self):
        # Map: conversation_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Map: WebSocket -> user_id (for authentication)
        self.connection_users: Dict[WebSocket, int] = {}
    
    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = set()
        
        self.active_connections[conversation_id].add(websocket)
        self.connection_users[websocket] = user_id
    
    def disconnect(self, websocket: WebSocket, conversation_id: int):
        """Remove a WebSocket connection"""
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].discard(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
        
        self.connection_users.pop(websocket, None)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific connection"""
        await websocket.send_text(message)
    
    async def broadcast_to_conversation(
        self, 
        conversation_id: int, 
        message: dict,
        exclude_user_id: int = None
    ):
        """Broadcast message to all connections in a conversation"""
        if conversation_id not in self.active_connections:
            return
        
        message_json = json.dumps(message)
        dead_connections = set()
        
        for connection in self.active_connections[conversation_id]:
            # Skip sender if exclude_user_id provided
            if exclude_user_id and self.connection_users.get(connection) == exclude_user_id:
                continue
            
            try:
                await connection.send_text(message_json)
            except Exception:
                dead_connections.add(connection)
        
        # Clean up dead connections
        for dead in dead_connections:
            self.disconnect(dead, conversation_id)
    
    async def broadcast_typing(
        self, 
        conversation_id: int, 
        user_id: int, 
        user_name: str, 
        is_typing: bool
    ):
        """Broadcast typing indicator to conversation"""
        message = {
            "type": "typing",
            "user_id": user_id,
            "user_name": user_name,
            "is_typing": is_typing
        }
        await self.broadcast_to_conversation(
            conversation_id, 
            message, 
            exclude_user_id=user_id
        )


# Global instance
manager = ConnectionManager()
```

### 3. **Add WebSocket Endpoint**

**File:** `backendV0/routers/chat.py`

Add imports:
```python
from fastapi import WebSocket, WebSocketDisconnect
from ..websocket_manager import manager
import json
```

Add endpoint:
```python
@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: int,
    session: AsyncSession = Depends(get_session),
):
    """
    WebSocket endpoint for real-time chat
    
    Message format from client:
    {
        "type": "message" | "typing" | "read",
        "content": "...",  // for type=message
        "is_typing": bool,  // for type=typing
        "token": "jwt_token"  // authentication
    }
    
    Message format to client:
    {
        "type": "message" | "typing" | "read" | "error",
        "data": {...}  // varies by type
    }
    """
    
    # Initial connection - wait for auth message
    await websocket.accept()
    current_user = None
    
    try:
        # First message must be auth
        auth_data = await websocket.receive_text()
        auth_msg = json.loads(auth_data)
        
        if auth_msg.get("type") != "auth":
            await websocket.send_json({"type": "error", "message": "First message must be auth"})
            await websocket.close()
            return
        
        # Verify JWT token
        token = auth_msg.get("token")
        if not token:
            await websocket.send_json({"type": "error", "message": "Token required"})
            await websocket.close()
            return
        
        # Get current user from token (reuse existing auth logic)
        from ..deps import verify_token
        from sqlalchemy.future import select
        from ..models import User
        
        payload = verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return
        
        stmt = select(User).where(User.id == int(user_id))
        result = await session.execute(stmt)
        current_user = result.scalar_one_or_none()
        
        if not current_user:
            await websocket.send_json({"type": "error", "message": "User not found"})
            await websocket.close()
            return
        
        # Verify user is participant
        stmt = select(Participant).where(
            Participant.conversation_id == conversation_id,
            Participant.user_id == current_user.id
        )
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            await websocket.send_json({"type": "error", "message": "Not a participant"})
            await websocket.close()
            return
        
        # Register connection
        await manager.connect(websocket, conversation_id, current_user.id)
        await websocket.send_json({"type": "connected", "conversation_id": conversation_id})
        
        # Main message loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "message":
                # Store message in database
                new_message = Message(
                    conversation_id=conversation_id,
                    sender_id=current_user.id,
                    content=message.get("content", "")
                )
                session.add(new_message)
                await session.commit()
                await session.refresh(new_message)
                
                # Broadcast to all participants
                await manager.broadcast_to_conversation(
                    conversation_id,
                    {
                        "type": "message",
                        "data": {
                            "id": new_message.id,
                            "conversation_id": conversation_id,
                            "sender_id": current_user.id,
                            "sender_name": current_user.full_name,
                            "content": new_message.content,
                            "created_at": new_message.created_at.isoformat()
                        }
                    }
                )
            
            elif msg_type == "typing":
                # Broadcast typing indicator
                await manager.broadcast_typing(
                    conversation_id,
                    current_user.id,
                    current_user.full_name,
                    message.get("is_typing", False)
                )
            
            elif msg_type == "read":
                # Update last_read_at
                stmt = select(Participant).where(
                    Participant.conversation_id == conversation_id,
                    Participant.user_id == current_user.id
                )
                result = await session.execute(stmt)
                participant = result.scalar_one_or_none()
                
                if participant:
                    participant.last_read_at = datetime.utcnow()
                    await session.commit()
                    
                    # Notify sender about read receipt
                    await manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "read",
                            "data": {
                                "user_id": current_user.id,
                                "user_name": current_user.full_name,
                                "read_at": participant.last_read_at.isoformat()
                            }
                        },
                        exclude_user_id=current_user.id
                    )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if current_user:
            manager.disconnect(websocket, conversation_id)
        try:
            await websocket.close()
        except:
            pass
```

### 4. **Update Existing Endpoints (Optional)**

Keep REST endpoints for:
- Initial conversation list loading
- Message history retrieval
- Creating conversations

WebSocket only handles real-time updates.

### 5. **Add Helper Function for Token Verification**

**File:** `backendV0/deps.py`

Add function if not exists:
```python
def verify_token(token: str):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 💻 Frontend Changes

### 1. **Install WebSocket Library**

**React Native doesn't need additional libraries** - WebSocket is built-in!

### 2. **Create WebSocket Hook**

**New File:** `frontendV0/hooks/useWebSocket.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/services/auth';

interface WebSocketMessage {
  type: 'message' | 'typing' | 'read' | 'connected' | 'error';
  data?: any;
  message?: string;
  conversation_id?: number;
  user_id?: number;
  user_name?: string;
  is_typing?: boolean;
}

interface UseWebSocketOptions {
  conversationId: number;
  onMessage?: (message: any) => void;
  onTyping?: (userId: number, userName: string, isTyping: boolean) => void;
  onRead?: (userId: number, userName: string, readAt: string) => void;
}

export function useWebSocket({
  conversationId,
  onMessage,
  onTyping,
  onRead,
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef<any>(null);

  const connect = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Replace http with ws in API URL
      const wsUrl = `ws://192.168.1.6:8000/chat/ws/${conversationId}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send auth message
        ws.current?.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
      };

      ws.current.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            console.log('Authenticated and connected to conversation', message.conversation_id);
            break;
          
          case 'message':
            if (onMessage && message.data) {
              onMessage(message.data);
            }
            break;
          
          case 'typing':
            if (onTyping && message.user_id && message.user_name) {
              onTyping(message.user_id, message.user_name, message.is_typing ?? false);
            }
            break;
          
          case 'read':
            if (onRead && message.data) {
              onRead(message.data.user_id, message.data.user_name, message.data.read_at);
            }
            break;
          
          case 'error':
            console.error('WebSocket error:', message.message);
            break;
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  };

  const sendMessage = (content: string) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'message',
        content: content
      }));
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  };

  const sendRead = () => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'read'
      }));
    }
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [conversationId]);

  return {
    isConnected,
    sendMessage,
    sendTyping,
    sendRead,
    reconnect: connect,
    disconnect
  };
}
```

### 3. **Update Chat Screen**

**File:** `frontendV0/app/chat.tsx`

Replace polling with WebSocket:

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

export default function ChatScreenRoute() {
  const router = useRouter();
  const { user, isClient } = useUser();
  const { conversationId } = useLocalSearchParams();
  const convId = conversationId ? Number(conversationId) : null;

  const [message, setMessage] = useState('');
  const [messagesState, setMessagesState] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<any>(null);

  // WebSocket connection
  const { isConnected, sendMessage: wsSendMessage, sendTyping, sendRead } = useWebSocket({
    conversationId: convId || 0,
    onMessage: (newMessage) => {
      setMessagesState((prev) => [...prev, newMessage]);
    },
    onTyping: (userId, userName, isTyping) => {
      if (isTyping) {
        setTypingUsers((prev) => [...new Set([...prev, userName])]);
      } else {
        setTypingUsers((prev) => prev.filter(name => name !== userName));
      }
      
      // Auto-clear typing indicator after 5 seconds
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter(name => name !== userName));
      }, 5000);
    },
    onRead: (userId, userName, readAt) => {
      console.log(`${userName} read the conversation at ${readAt}`);
      // Optionally show read receipts in UI
    }
  });

  // Load initial messages (keep REST API for history)
  useEffect(() => {
    const fetchMessages = async () => {
      if (!convId) return;
      try {
        const msgs = await getMessages(convId);
        setMessagesState(msgs || []);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    fetchMessages();
  }, [convId]);

  // Mark as read when opening (keep REST API)
  useEffect(() => {
    if (convId && isConnected) {
      sendRead();
    }
  }, [convId, isConnected]);

  // Auto-scroll when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messagesState]);

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    // Send typing indicator via WebSocket
    if (text.length > 0) {
      sendTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 3000);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !convId) return;
    
    try {
      // Send via WebSocket
      wsSendMessage(message.trim());
      setMessage('');
      
      // Clear typing indicator
      sendTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (err: any) {
      console.error('Send failed', err);
      Alert.alert('Error', err?.message || 'Failed to send message');
    }
  };

  // Rest of component stays the same...
}
```

### 4. **Update Conversations Screen (Optional)**

Keep polling for conversation list (less critical for real-time), or add WebSocket connection to update unread counts when messages arrive.

### 5. **Add Connection Status Indicator (Optional)**

```typescript
// In chat screen header
{!isConnected && (
  <View style={styles.offlineBanner}>
    <Text style={styles.offlineText}>Reconnecting...</Text>
  </View>
)}
```

---

## 🔄 Migration Strategy

### Phase 1: Add WebSocket Alongside Polling
1. Implement WebSocket endpoints
2. Keep existing polling as fallback
3. Test WebSocket in development

### Phase 2: Switch to WebSocket
1. Update chat screen to use WebSocket
2. Keep REST endpoints for history/list
3. Monitor connection stability

### Phase 3: Remove Polling
1. Remove polling intervals
2. Keep REST endpoints for initial data load
3. Verify all features working

---

## 📊 Comparison: Polling vs WebSocket

| Feature | Current (Polling) | WebSocket |
|---------|-------------------|-----------|
| **Latency** | 2-3 seconds | <100ms instant |
| **Server Load** | High (constant requests) | Low (push only) |
| **Battery** | Higher drain | Lower drain |
| **Bandwidth** | High (repeated requests) | Low (single connection) |
| **Complexity** | Simple | Moderate |
| **Real-time Feel** | Delayed | Instant |
| **Typing Indicators** | 2s delay | Instant |
| **Read Receipts** | Delayed | Instant |
| **Message Delivery** | 3s delay | Instant |

---

## ⚠️ Important Considerations

### 1. **Authentication**
- WebSocket connections require auth token in first message
- Token validation happens on connection, not per message
- Need to handle token expiry and reconnection

### 2. **Connection Management**
- Handle reconnection on network changes
- Clean up connections on component unmount
- Implement exponential backoff for reconnection

### 3. **Message Persistence**
- Always save messages to database (even with WebSocket)
- WebSocket broadcasts to online users
- REST API provides history for offline users

### 4. **Scalability**
- Single server: Simple in-memory ConnectionManager works
- Multiple servers: Need Redis pub/sub or similar
- Consider load balancer sticky sessions

### 5. **Error Handling**
- Network failures
- Server restarts
- Token expiry
- Connection timeouts

### 6. **Testing**
- Test on poor network conditions
- Test reconnection logic
- Test with multiple clients
- Test typing indicators don't stick

---

## 🎯 Minimal Implementation (Quick Start)

If you want to start small:

1. **Backend:** Add WebSocket endpoint for messages only (no typing)
2. **Frontend:** Use WebSocket for sending/receiving messages
3. **Keep:** REST API for conversation list, message history, typing indicators
4. **Later:** Migrate typing indicators and read receipts to WebSocket

This gives you instant message delivery while keeping complexity low.

---

## 📝 Files to Create/Modify

### Backend
- **NEW:** `backendV0/websocket_manager.py` - Connection manager
- **MODIFY:** `backendV0/routers/chat.py` - Add WebSocket endpoint
- **MODIFY:** `backendV0/requirements.txt` - Add websockets (optional, FastAPI has built-in)
- **MODIFY:** `backendV0/deps.py` - Export verify_token function

### Frontend
- **NEW:** `frontendV0/hooks/useWebSocket.ts` - WebSocket hook
- **MODIFY:** `frontendV0/app/chat.tsx` - Replace polling with WebSocket
- **OPTIONAL:** `frontendV0/app/conversations.tsx` - Add WebSocket for unread counts

---

## ✅ Summary

WebSocket implementation would provide:
- **Instant message delivery** (no 3-second delay)
- **Real-time typing indicators** (no 2-second polling)
- **Immediate read receipts**
- **Lower server load** (push instead of poll)
- **Better battery life** (fewer network requests)
- **True real-time chat experience**

The current polling implementation works well and is simpler to debug. WebSocket is the next evolution for production-grade real-time chat.
