"use client";
import { useEffect, useState } from "react";
import useSocket from "../../hooks/useSocket";
import { Button } from "@repo/ui/components/ui/button";

export default function () {
 const { message, isConnected, sendMessage, socket } = useSocket("ws://localhost:8080");

 const handleSendMessage = () => {
   sendMessage("Hello from client!");
 };

  return (
    <div className="big-container">
      <p>Connection Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <p>Last Message: {message}</p>

      {/* Reconnect Button - Triggers effect in useSocket when URL is updated */}
      {!isConnected && (
        <Button
          onClick={() => {
            window.location.reload(); // Simplest way to force a refresh and thus re-run the useSocket hook
          }}
          className="rounded-md"
        >
          Reconnect
        </Button>
      )}

      <Button onClick={handleSendMessage} disabled={!isConnected}>
        {!isConnected ? "disabled" : "Send Message"}
      </Button>
    </div>
  );
}
