/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiSendPlaneFill } from "react-icons/ri"
import Image from 'next/image'
import Logo from './HatchWorksAI.svg'
import HackathonLogo from './hackathon.png'

interface StudentProfile {
  Language: string | null;
  Name: string | null;
  ScholarYear: string | null;
  Location: string | null;
  Age: string | null;
  Gender: string | null;
  Economy: string | null;
  CognitiveSkills: string[];
  Interests: string[];
  SoftSkills: string[];
  FavoriteSubjects: string[];
  WorkPreferences: string[];
  EconomicConstraints: string[];
  LearningStyle: string[];
  TechnologicalAffinity: string[];
}

export default function Chat() {
  // Load initial messages from localStorage
  const initialMessages = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('chatMessages') || '[]')
    : [];
  const specificDivRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string>("Do you prefer english or another language?");
  const [recommendationGiven, setRecommendationGiven] = useState<boolean>(false); 

  useEffect(() => {
    setStudentProfile(
      {
        Language: null,
        Name: null,
        ScholarYear: null,
        Location: null,
        Age: null,
        Gender: null,
        Economy: null,

        CognitiveSkills: [],
        Interests: [],
        SoftSkills: [],
        FavoriteSubjects: [],
        WorkPreferences: [],
        EconomicConstraints: [],
        LearningStyle: [],
        TechnologicalAffinity: []
      });
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "<p>Hello, I am CareerPilot, and I'm here to help you with vocational guidance. I hope to help you find your path.</p> <p>First, tell me if you are comfortable speaking english or would you prefer another language.</p>"
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
    messagesCopy.push({ id: crypto.randomUUID(), role: "user", content: input });
    setMessages(messagesCopy);
    setInput('');

    let response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: messagesCopy, studentProfile: studentProfile, recommendationGiven: recommendationGiven })
    })
    if (!response.ok) {
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!response.ok && retryCount < maxRetries) {
        console.log(`Retrying request (${retryCount + 1}/${maxRetries})...`);
        response = await fetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ messages: messagesCopy, studentProfile: studentProfile })
        });
        retryCount++;
      }

      if (!response.ok) {
        console.error('Failed to get response after retries');
        messagesCopy.push({ id: crypto.randomUUID(), role: "assistant", content: "<p>I'm sorry, but I'm having trouble processing your request. Please try again later.</p>" });
        setIsTyping(false);
        return;
      }
    }
    const aiMessage = await response.json();
    console.log(aiMessage);
    messagesCopy.push(aiMessage.message);
    setStudentProfile(aiMessage.profile);
    if (aiMessage.evaluation) {
      setRecommendationGiven(true);
    }
    setMessages(messagesCopy);
    setIsTyping(false)
  }

  return (

    <div className="flex gap-2">
      {studentProfile && (<></>
        // <div className='w-[40%] flex flex-col h-screen'>
        //   <h2 className='text-white text-xl font-bold mb-4'>Profile Evaluation</h2>
        //   <div className='flex-1 overflow-y-auto custom-scrollbar'>
        //     <pre>{JSON.stringify(studentProfile, null, 2)}</pre>
        //   </div>
        //   {/* <div className='flex flex-wrap'>
        //     {Object.keys(AspectsScores).map((aspect) => (
        //       <div key={aspect} className={`w-48 mx-auto my-1 flex justify-between p-2 rounded-md ${colors[Math.floor(AspectsScores[aspect])]}`}>
        //       <h3 className='text-white text-sm'>{aspect}</h3>
        //       <p className='text-white text-sm'>{Number(AspectsScores[aspect]).toFixed(2)}</p>
        //       </div>
        //     ))}
        //   </div> */}
        // </div>
      )}
      <div className='mx-auto w-full'>
        <div className="flex flex-col h-screen">
          <header className='flex justify-between items-start p-4 bg-transparent xl:fixed top-0 w-full mb-1 sm:mb-0 md:mb-[-100px]'>
            <div>
              <div className="hidden sm:block">
                <Image 
                  src={Logo} 
                  alt="Company Logo" 
                  width={230} 
                  height={40} 
                  className="m-2 text-primary 
                    sm:w-[140px] sm:h-[45px]
                    md:w-[160px] md:h-[50px] 
                    lg:w-[180px] lg:h-[60px]
                    xl:w-[200px] xl:h-[65px]"
                />
              </div>
              <div className="sm:hidden">
                <Image
                  src={Logo}
                  alt="Company Logo" 
                  width={150}
                  height={40}
                  className="m-2 text-primary"
                />
              </div>
            </div>
            <div>
              <div className='hidden sm:block'>
                <Image 
                src={HackathonLogo} 
                alt="Hackathon" 
                width={200} 
                height={180} 
                className="m-3 text-primary
                  sm:w-[120px] sm:h-[100px]
                  md:w-[135px] md:h-[120px]
                  lg:w-[160px] lg:h-[140px]
                  xl:w-[200px] xl:h-[180px]" 
                />
              </div>
              <div className="sm:hidden">
                <Image
                  src={HackathonLogo}
                  alt="Company Logo" 
                  width={90}
                  height={90}
                  className="m-2 text-primary"
                />
              </div>
            </div>
          </header>
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