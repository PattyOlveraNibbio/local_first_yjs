import { useState, useEffect, useCallback, useRef } from "react";

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: string[];
  sendMessage: (message: object) => void;
  connectionStatus: string;
}

type WebSocketMessage = {
  type: string;
  [key: string]: unknown;
};

const useWebSocket = (url: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "state":
        console.log("Received current state:", message.data);
        break;
      case "updateNodes":
        console.log("Nodes updated:", message.nodes);
        break;
      case "updateEdges":
        console.log("Edges updated:", message.edges);
        break;
      case "left":
        console.log("A client disconnected:", message.id);
        break;
      default:
        console.log("Unknown message type:", message);
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log("Attempting to reconnect...");
      connectWebSocket();
    }, 3000);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!("WebSocket" in window)) {
      console.error("WebSocket is not supported in this browser");
      setConnectionStatus("WebSocket not supported");
      return;
    }

    setConnectionStatus("Connecting...");
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`WebSocket connected to ${url}`);
      setIsConnected(true);
      setConnectionStatus("Connected");
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("Received message:", message);
        handleMessage(message);
        setMessages((prevMessages) => [
          ...prevMessages,
          JSON.stringify(message),
        ]);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log(
        `WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`
      );
      setIsConnected(false);
      setConnectionStatus(`Disconnected (Code: ${event.code})`);
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error occurred:", error);
      setConnectionStatus("Error occurred");
      if (
        ws.readyState === WebSocket.CLOSED ||
        ws.readyState === WebSocket.CLOSING
      ) {
        console.log(
          "WebSocket is closing or already closed. ReadyState:",
          ws.readyState
        );
      } else {
        console.log(
          "WebSocket error, but connection is still open. ReadyState:",
          ws.readyState
        );
        ws.close();
      }
    };

    webSocketRef.current = ws;
  }, [url, handleMessage, scheduleReconnect]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  const sendMessage = useCallback(
    (message: object) => {
      if (
        webSocketRef.current &&
        webSocketRef.current.readyState === WebSocket.OPEN
      ) {
        webSocketRef.current.send(JSON.stringify(message));
      } else {
        console.error(
          "WebSocket is not connected. Current status:",
          connectionStatus
        );
      }
    },
    [connectionStatus]
  );

  return { isConnected, messages, sendMessage, connectionStatus };
};

export default useWebSocket;