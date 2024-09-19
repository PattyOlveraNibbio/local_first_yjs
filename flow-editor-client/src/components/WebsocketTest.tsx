import { useState, useEffect } from "react";
import useWebSocket from "../hooks/useWebsocket";
import { Send, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/Alert";

const WebSocketTest = () => {
  const [inputMessage, setInputMessage] = useState("");
  const { isConnected, messages, sendMessage } = useWebSocket(
    "ws://127.0.0.1:8787"
  );
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowAlert(true);
      const timer = setTimeout(() => setShowAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage("");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">WebSocket Test</h2>

      {showAlert && (
        <Alert className="mb-4">
          <AlertTitle>Connected!</AlertTitle>
          <AlertDescription>
            WebSocket connection established successfully.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center mb-4">
        <span className="mr-2">Status:</span>
        {isConnected ? (
          <Wifi className="text-green-500" size={24} />
        ) : (
          <WifiOff className="text-red-500" size={24} />
        )}
      </div>

      <div className="flex mb-4">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message"
          className="flex-grow border rounded-l px-3 py-2"
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition-colors"
          disabled={!isConnected}
        >
          <Send size={20} />
        </button>
      </div>

      <h3 className="text-xl font-semibold mb-2">Messages:</h3>
      <ul className="border rounded p-2 h-64 overflow-y-auto">
        {messages.map((message, index) => (
          <li key={index} className="mb-1 p-2 bg-gray-100 rounded">
            {message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WebSocketTest;
