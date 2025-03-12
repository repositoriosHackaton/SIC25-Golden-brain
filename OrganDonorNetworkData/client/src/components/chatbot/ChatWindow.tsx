import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, MinusCircle, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  text: string;
  isBot: boolean;
  id?: string;
  hasFeedback?: boolean;
}

export function ChatWindow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: "¡Hola! Soy tu asistente virtual especializado en compatibilidad sanguínea. ¿En qué puedo ayudarte?", 
      isBot: true,
      id: "initial",
      hasFeedback: false
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    try {
      const response = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messageId,
          isPositive,
          userMessage: messages.find(m => !m.isBot && m.id === messageId)?.text,
          botResponse: messages.find(m => m.isBot && m.id === messageId)?.text
        })
      });

      if (!response.ok) {
        throw new Error("Error al enviar feedback");
      }

      if (!isPositive) {
        // Si es feedback negativo, intentar obtener una nueva respuesta
        const userMessage = messages.find(m => !m.isBot && m.id === messageId)?.text;
        if (userMessage) {
          setIsTyping(true);
          const newResponse = await fetch("/api/chat", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: userMessage })
          });

          setIsTyping(false);
          if (newResponse.ok) {
            const data = await newResponse.json();
            setMessages(prev => [
              ...prev,
              { 
                text: "Permíteme intentar con una respuesta diferente:", 
                isBot: true,
                id: messageId + "_retry",
                hasFeedback: true
              },
              {
                text: data.response,
                isBot: true,
                id: messageId + "_new",
                hasFeedback: false
              }
            ]);
          }
        }
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, hasFeedback: true } : msg
        )
      );

      toast({
        title: isPositive ? "Gracias por tu feedback" : "Lo siento por la confusión",
        description: isPositive ? "Tu opinión nos ayuda a mejorar" : "Intentaré darte una mejor respuesta",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el feedback",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para usar el chat",
        variant: "destructive"
      });
      return;
    }

    const messageId = Date.now().toString();

    // Añadir mensaje del usuario
    setMessages(prev => [...prev, { 
      text: message, 
      isBot: false,
      id: messageId,
      hasFeedback: false
    }]);

    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Añadir respuesta del bot
      setMessages(prev => [...prev, { 
        text: data.response, 
        isBot: true,
        id: messageId,
        hasFeedback: false
      }]);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setMessages(prev => [...prev, { 
        text: "Lo siento, ha ocurrido un error. Por favor, intenta de nuevo.", 
        isBot: true,
        id: messageId,
        hasFeedback: false
      }]);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }

    setMessage("");
  };

  if (!user) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 rounded-full p-4 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 w-[400px] shadow-lg transition-all duration-300",
      isMinimized ? "h-[60px]" : "h-[500px]"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Asistente Virtual AVADON</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[380px]">
            {messages.map((msg, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg",
                    msg.isBot
                      ? "bg-primary/10 text-foreground"
                      : "bg-primary text-primary-foreground ml-auto"
                  )}
                >
                  {msg.text}
                </div>
                {msg.isBot && msg.id && !msg.hasFeedback && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFeedback(msg.id!, true)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFeedback(msg.id!, false)}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Escribiendo...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button type="submit" disabled={isTyping}>
                Enviar
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
}