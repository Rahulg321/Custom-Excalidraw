import { useState, useEffect } from "react";

const useSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const newSocket = new WebSocket(url);

    newSocket.onopen = () => {
      console.log("Connection established");
      setIsConnected(true);
    };

    newSocket.onmessage = (event) => {
      console.log("Message received:", event.data);
      setMessage(event.data);
    };

    newSocket.onclose = () => {
      console.log("Connection closed");
      setIsConnected(false);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [url]);

  const sendMessage = (msg: string) => {
    if (socket && isConnected) {
      socket.send(msg);
    } else {
      console.warn("WebSocket is not connected or ready to send messages.");
    }
  };

  return { socket, message, isConnected, sendMessage };
};

export default useSocket;
