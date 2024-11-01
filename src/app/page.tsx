/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiSendPlaneFill } from "react-icons/ri"

export default function Chat() {
  // Load initial messages from localStorage
  const initialMessages = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('chatMessages') || '[]')
    : [];
  const specificDivRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);
  
  useEffect(() => {
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant', 
      content: '<p>Hello, I am a chatbot that can help you with vocational guidance. I hope to help you find your path.</p> <p>First,what is your name? Then, tell me if you are comfortable speaking english or would you prefer another language.</p>'
    }]);
  }, []);
  
  useEffect(() => {
    if (specificDivRef.current) {
      specificDivRef.current.scrollTop = specificDivRef.current.scrollHeight;
    }
  });

  const [isTyping, setIsTyping] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;

    setIsTyping(true)
    const messagesCopy = [...messages];
    messagesCopy.push({ id: crypto.randomUUID(), role: "user", content: `<p>${input}</p>`});
    setMessages(messagesCopy);
    setInput('');

    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: messagesCopy })
    })
    const aiMessage = await response.json();
    console.log(aiMessage);
    messagesCopy.push(aiMessage.message);
    setStudentProfile(aiMessage.profile);
    setMessages(messagesCopy);
    setIsTyping(false)
  }

  return (

    <div className="flex gap-2">
      {studentProfile && (
        <div className='w-[40%] flex flex-col h-screen'>
          <h2 className='text-white text-xl font-bold mb-4'>Profile Evaluation</h2>
          <div className='flex-1 overflow-y-auto custom-scrollbar'>
            <pre>{JSON.stringify(studentProfile, null, 2)}</pre>
          </div>
          {/* <div className='flex flex-wrap'>
            {Object.keys(AspectsScores).map((aspect) => (
              <div key={aspect} className={`w-48 mx-auto my-1 flex justify-between p-2 rounded-md ${colors[Math.floor(AspectsScores[aspect])]}`}>
              <h3 className='text-white text-sm'>{aspect}</h3>
              <p className='text-white text-sm'>{Number(AspectsScores[aspect]).toFixed(2)}</p>
              </div>
            ))}
          </div> */}
        </div>
      )}
      <div className='mx-auto w-full'>
        <div className="flex flex-col h-screen">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={specificDivRef}>
            <div className="max-w-2xl mx-auto">
              <AnimatePresence>
                {messages.map((message: any) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`mb-4 text-left flex ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`inline-block p-2 rounded-lg message ${message.role === 'user'
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

          </div>
          <div className='w-full flex justify-center'>
            <form onSubmit={onSubmit} className="flex p-1 ps-3 rounded-[2rem] mb-8 bg-gray-700 w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%]">
              <div className="flex w-full h-full">
                <div className='flex-1 p-2 me-4 h-fit'>
                  <input
                    value={input}
                    onInput={handleInputChange}
                    placeholder="Type your message..."
                    className="w-full focus:outline-none bg-transparent resize-none text-white"
                  />
                </div>

                <button
                  type="submit"
                  className={`bg-cyan-700 text-white p-1 m-1 rounded-full hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-8 h-8 text-center
              ${input.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RiSendPlaneFill className='text-xl' />
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>

  )
}