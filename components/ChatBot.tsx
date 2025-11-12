
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Chat } from '@google/genai';
import { createChat, sendMessageToChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import Spinner from './Spinner';
import { IconSend, IconUser, IconBot } from './Icons';
import { useTranslation } from '../App';

const ChatBot: React.FC = () => {
    const { t, language } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Initialize chat session when language changes
        chatRef.current = createChat(language);
        setMessages([{ role: 'model', text: t('chat.greeting') }]);
    }, [language, t]);

    useEffect(() => {
        // Scroll to the bottom when new messages are added
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (chatRef.current) {
                const responseText = await sendMessageToChat(chatRef.current, input);
                const modelMessage: ChatMessage = { role: 'model', text: responseText };
                setMessages(prev => [...prev, modelMessage]);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage: ChatMessage = { role: 'model', text: t('chat.error') };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
            <div className="bg-gray-800 rounded-lg shadow-lg flex-grow flex flex-col">
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                             {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <IconBot className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                <p className="text-sm break-words">{msg.text}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <IconUser className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                <IconBot className="w-5 h-5 text-white" />
                            </div>
                             <div className="bg-gray-700 text-gray-200 rounded-lg rounded-bl-none px-4 py-3">
                                 <Spinner />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
                    <div className="flex items-center bg-gray-700 rounded-lg">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('chat.placeholder')}
                            className="flex-grow bg-transparent text-white p-3 focus:outline-none"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="p-3 text-white disabled:text-gray-500 hover:text-indigo-400 transition-colors duration-200">
                            <IconSend className="w-6 h-6" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatBot;
