import React from "react";
import Chat from "@/components/Chat";

import SideBar from "@/components/sidebar";

export const metadata = {
  title: "Chatbot - Maplytics",
};

export default function ChatbotPage() {
  return (
    <div className="min-h-[93vh] bg-gray-50 flex h-screen overflow-hidden">
        <SideBar />
        <main className="flex-1 overflow-hidden w-full flex">
          <Chat />
        </main>
    </div>
  );
}
