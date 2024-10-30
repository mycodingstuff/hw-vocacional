'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Chat() {
  // Load initial messages from localStorage
  const initialMessages = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('chatMessages') || '[]')
    : [];

  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  // const { messages, input, handleInputChange, handleSubmit } = useChat({
  //   api: '/api/chat',
  //   initialMessages,
  // })

//  useEffect(() => {
//    localStorage.setItem('chatMessages', JSON.stringify(messages));
//  }, [messages]);

  const [isTyping, setIsTyping] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsTyping(true)
    let messagesCopy = [...messages];
    messagesCopy.push({id: crypto.randomUUID(), role: "user", content: input});
    setMessages(messagesCopy);
    setInput('');

    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({messages: messagesCopy})
    })
    const aiMessage = await response.json();
    console.log(aiMessage);
    messagesCopy.push(aiMessage);
    setMessages(messagesCopy);
    setIsTyping(false)
  }

  return (
    <div className='mx-auto w-full max-w-2xl'>
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {messages.map((message: any) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-4 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block p-2 rounded-lg message ${
                  message.role === 'user'
                    ? 'bg-cyan-700 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-100 text-sm"
          >
            AI is typing...
          </motion.div>
        )}
      </div>
      <form onSubmit={onSubmit} className="p-4">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 p-2 me-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600 bg-gray-800"
          />
          <button
            type="submit"
            className="bg-cyan-700 text-white p-2 rounded-lg hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
    </div>
  )
}