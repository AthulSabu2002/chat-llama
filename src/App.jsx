import { useState } from 'react'
import './App.css'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';

// Remove API_KEY constant as it's not needed for local Llama
const systemMessage = { //  Explain things like you're talking to a software professional with 5 years of experience.
  "role": "system", "content": "Explain things like you're talking to a software professional with 2 years of experience."
}

function App() {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm Llama! Ask me anything!",
      sentTime: "just now",
      sender: "Llama"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (message) => {
    const newMessage = {
      message: message.trim(), // Add trim() to remove any extra whitespace
      direction: 'outgoing',
      sender: "user",
      position: "normal"
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setIsTyping(true);
    await processMessageToChatGPT(newMessages);
  };

  async function processMessageToChatGPT(chatMessages) {
    const lastMessage = chatMessages[chatMessages.length - 1];

    // Format the prompt to handle code formatting requests
    const prompt = `${lastMessage.message}\n\nPlease format your response appropriately. If showing code, use proper formatting with language specification.`;

    const apiRequestBody = {
      "model": "llama3.2",
      "prompt": prompt,
      "stream": false
    }

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequestBody)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Llama Response:', data);
      
      // Format the response based on content type
      let formattedMessage = formatResponse(data.response);
      
      setMessages([...chatMessages, {
        message: formattedMessage,
        sender: "Llama",
        direction: 'incoming'
      }]);
      setIsTyping(false);
      
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
    }
  }

  const formatResponse = (response) => {
    if (!response) return '';

    // Handle code blocks with language specification
    if (response.includes('```')) {
      return response.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        const highlighted = Prism.highlight(
          code.trim(),
          Prism.languages[language] || Prism.languages.text,
          language
        );
        return `<div class="code-block ${language}">
                  <div class="code-header">${language}</div>
                  <pre><code class="language-${language}">${highlighted}</code></pre>
                </div>`;
      });
    }

    // Handle JSON content
    if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
      try {
        const jsonObj = JSON.parse(response);
        const formatted = JSON.stringify(jsonObj, null, 2);
        const highlighted = Prism.highlight(
          formatted,
          Prism.languages.json,
          'json'
        );
        return `<div class="code-block json">
                  <div class="code-header">json</div>
                  <pre><code class="language-json">${highlighted}</code></pre>
                </div>`;
      } catch {
        return `<div class="text-block">${response}</div>`;
      }
    }

    // Handle normal text
    return `<div class="text-block">${response}</div>`;
  };

  return (
    <div className="App">
      <div style={{ position:"relative", height: "700px", width: "900px"  }}>  {/* Changed height from 800px to 600px */}
        <MainContainer>
          <ChatContainer>       
            <MessageList 
              scrollBehavior="smooth" 
              typingIndicator={isTyping ? <TypingIndicator content="Llama is typing" /> : null}
            >
              {messages.map((message, i) => (
                <Message 
                  key={i} 
                  model={message}
                  html={true} // Add this to enable HTML rendering
                />
              ))}
            </MessageList>
            <MessageInput placeholder="Type message here" onSend={handleSend} />        
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  )
}

export default App
