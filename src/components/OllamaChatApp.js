import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, RefreshCw, Copy, Check, Plus, Trash2, MessageSquare } from 'lucide-react';

// Code Block Component
const CodeBlock = ({ content, language = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-2 mb-2">
      <div className="absolute top-2 right-2 z-10">
        <button 
          onClick={handleCopy}
          className="bg-gray-700 text-white p-2 rounded hover:bg-gray-600"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="bg-gray-800 rounded-lg overflow-x-auto">
        {language && (
          <div className="px-4 py-2 bg-gray-700 text-gray-200 text-sm border-b border-gray-600">
            {language}
          </div>
        )}
        <pre className="p-4 text-gray-100 text-sm overflow-x-auto">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};

// Message Content Component
const MessageContent = ({ content }) => {
  const extractCodeBlocks = (text) => {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      blocks.push({
        type: 'codeBlock',
        language: match[1] || 'text',
        content: match[2].trim()
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      let inlineMatch;
      let lastInlineIndex = 0;

      while ((inlineMatch = inlineCodeRegex.exec(remainingText)) !== null) {
        if (inlineMatch.index > lastInlineIndex) {
          blocks.push({
            type: 'text',
            content: remainingText.slice(lastInlineIndex, inlineMatch.index)
          });
        }
        blocks.push({
          type: 'inlineCode',
          content: inlineMatch[1]
        });
        lastInlineIndex = inlineMatch.index + inlineMatch[0].length;
      }

      if (lastInlineIndex < remainingText.length) {
        blocks.push({
          type: 'text',
          content: remainingText.slice(lastInlineIndex)
        });
      }
    }

    return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
  };

  const parsedContent = extractCodeBlocks(content);

  return (
    <div>
      {parsedContent.map((block, index) => {
        switch (block.type) {
          case 'codeBlock':
            return (
              <CodeBlock 
                key={index} 
                content={block.content} 
                language={block.language} 
              />
            );
          case 'inlineCode':
            return (
              <code 
                key={index} 
                className="bg-gray-100 text-red-500 px-1 py-0.5 rounded mx-1 font-mono"
              >
                {block.content}
              </code>
            );
          default:
            return (
              <p key={index} className="whitespace-pre-wrap">
                {block.content}
              </p>
            );
        }
      })}
    </div>
  );
};

// Chat Sidebar Component
const ChatSidebar = ({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat }) => {
  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Chats</h2>
        <button
          onClick={onNewChat}
          className="p-2 hover:bg-gray-700 rounded"
          title="New Chat"
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {chats.map(chat => (
          <div
            key={chat.id}
            className={`flex justify-between items-center p-2 rounded mb-2 cursor-pointer ${
              chat.id === activeChatId ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="flex items-center space-x-2 overflow-hidden">
              <MessageSquare size={16} />
              <span className="truncate">{chat.title || 'New Chat'}</span>
            </div>
            {chat.id === activeChatId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="p-1 hover:bg-gray-600 rounded"
                title="Delete Chat"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Chat Component
const OllamaChatApp = () => {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState(['llama2']);
  const messagesEndRef = useRef(null);
  const activeChat = chats.find(chat => chat.id === activeChatId);

  // Load chats and model preference from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('ollama-chats');
    const savedModel = localStorage.getItem('ollama-selected-model');
    
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setActiveChatId(parsedChats[0].id);
      }
    }
    
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Save to localStorage whenever chats or selected model changes
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('ollama-chats', JSON.stringify(chats));
    }
    localStorage.setItem('ollama-selected-model', selectedModel);
  }, [chats, selectedModel]);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        const models = data.models?.map(model => model.name) || ['llama2'];
        setAvailableModels(models);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError('Failed to fetch available models');
      }
    };
    fetchModels();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId]);

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      model: selectedModel
    };
    setChats(prevChats => [newChat, ...prevChats]);
    setActiveChatId(newChat.id);
    return newChat;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    let currentChat = activeChat;
    if (!currentChat) {
      currentChat = createNewChat();
    }

    const userMessage = { role: 'user', content: inputMessage };
    
    // Update chat with user message
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === currentChat.id
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              title: chat.messages.length === 0 ? inputMessage.slice(0, 30) : chat.title
            }
          : chat
      )
    );

    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...currentChat.messages, userMessage],
          stream: false
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      const modelMessage = { role: 'assistant', content: data.message.content };

      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChat.id
            ? { ...chat, messages: [...chat.messages, modelMessage] }
            : chat
        )
      );
    } catch (error) {
      console.error('Error:', error);
      setError(`Failed to get response from ${selectedModel}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={createNewChat}
        onDeleteChat={(id) => {
          setChats(prev => prev.filter(chat => chat.id !== id));
          if (activeChatId === id) {
            const remaining = chats.filter(chat => chat.id !== id);
            setActiveChatId(remaining[0]?.id || null);
          }
        }}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-white p-4 border-b flex items-center space-x-4">
          <label className="font-medium">Model:</label>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="p-2 border rounded"
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="flex-grow overflow-auto p-4 space-y-4">
          {activeChat?.messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border'
              }`}>
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-lg border flex items-center">
                <RefreshCw className="mr-2 animate-spin" />
                Generating response...
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-100 text-red-800 p-3 rounded-lg flex items-center">
                <AlertCircle className="mr-2" />
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white p-4 border-t flex">
        <textarea 
            rows="1"
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={handleKeyPress}
            placeholder="Type your message... (Shift + Enter for new line)"
            className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OllamaChatApp;