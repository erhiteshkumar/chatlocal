import React, { useState } from 'react';
import OllamaChatApp from './OllamaChatApp';
import { MessageCircle } from 'lucide-react';

function AppWithModalChat() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="App">
      {/* Chat Trigger Button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
      >
        <MessageCircle size={24} />
      </button>

      {/* Modal Chat */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setIsChatOpen(false)}
          />
          <div className="relative w-full max-w-md h-[80vh] z-60">
            <OllamaChatApp />
            <button 
              onClick={() => setIsChatOpen(false)}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppWithModalChat;