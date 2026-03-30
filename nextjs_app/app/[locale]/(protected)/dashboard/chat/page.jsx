import React from "react";
import Chat from "@/components/Chat";

import SideBar from "@/components/sidebar";

export const metadata = {
  title: "Chatbot - Maplytics",
};

export default function ChatbotPage() {
  return (
    <div className="min-h-[93vh] bg-gray-50 flex h-screen overflow-hidden">
        <SideBar
            name1="Create New Project"
            href1="/dashboard/createProject"
            name2="Map view"
            href2="/dashboard/map"
            name3="Comparison"
            href3="/dashboard/comparison"
            name4="Public Dataset"
            href4="/dashboard/public-dataset"
        />
        <main className="flex-1 overflow-hidden w-full flex">
          <Chat />
        </main>
    </div>
  );
}
