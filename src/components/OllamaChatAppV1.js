import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Utility function to detect code blocks
const extractCodeBlocks = (text) => {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const inlineCodeRegex = /`([^`]+)`/g;
  const blocks = [];
  let match;

  // Extract code blocks
  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      type: 'codeBlock',
      language: match[1] || 'text',
      content: match[2].trim()
    });
  }

  // If no code blocks, check for inline code
  if (blocks.length === 0) {
    let inlineMatch;
    while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
      blocks.push({
        type: 'inlineCode',
        content: inlineMatch[1]
      });
    }
  }

  // If no code detected, return original text
  return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
};

// CodeBlock component with copy functionality
const CodeBlock = ({ content, language = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 bg-gray-700 text-white p-2 rounded hover:bg-gray-600"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <SyntaxHighlighter 
        language={language}
        style={coldarkDark}
        customStyle={{
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
          marginTop: '0.5rem',
          marginBottom: '0.5rem'
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

// Message rendering component
const MessageContent = ({ content }) => {
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
                className="bg-gray-100 text-red-500 px-1 py-0.5 rounded mx-1"
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

const OllamaChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch available Ollama models
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        const models = data.models.map(model => model.name);
        setAvailableModels(models.length > 0 ? models : ['llama2', 'mistral', 'phi']);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setAvailableModels(['llama2', 'mistral', 'phi']);
      }
    };

    fetchAvailableModels();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: 'user', content: inputMessage }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const modelMessage = { 
        role: 'assistant', 
        content: data.message.content 
      };
      setMessages(prevMessages => [...prevMessages, modelMessage]);
    } catch (error) {
      console.error('Error:', error);
      setError(`Failed to get response from ${selectedModel}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Model Selection Dropdown */}
      <div className="bg-white p-4 border-b flex items-center space-x-4">
        <label className="font-medium">Model:</label>
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="p-2 border rounded"
        >
          {availableModels.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-grow overflow-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div 
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 border'
              }`}
            >
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

      {/* Input Area */}
      <div className="bg-white p-4 border-t flex">
        <input 
          type="text" 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
          className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  );
};

export default OllamaChatApp;