import React from "react";
import Chat from "@/components/Chat";



export const metadata = {
  title: "Chatbot - Maplytics",
};

export default function ChatbotPage() {
  return (
    <main className="flex-1 overflow-hidden w-full flex">
      <Chat />
    </main>
  );
}
