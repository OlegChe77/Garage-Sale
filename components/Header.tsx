
import React from 'react';
import { IconCamera, IconSparkles, IconChat } from './Icons';
import { useTranslation } from '../App';

type View = 'clutter' | 'chat';

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
    const { t, language, setLanguage } = useTranslation();

    const navItems = [
        { id: 'clutter', label: t('nav.clutter'), icon: <IconCamera className="w-5 h-5 mr-2" /> },
        { id: 'chat', label: t('nav.chat'), icon: <IconChat className="w-5 h-5 mr-2" /> },
    ];

    return (
        <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 md:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <IconSparkles className="h-8 w-8 text-indigo-400" />
                        <h1 className="text-xl font-bold ml-3 hidden sm:block">{t('app.title')}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <nav className="flex items-center space-x-2 sm:space-x-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveView(item.id as View)}
                                    className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                        activeView === item.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {item.icon}
                                    <span className="hidden md:inline">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                         <div className="flex items-center space-x-1 bg-gray-700 rounded-md p-1">
                             <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>EN</button>
                             <button onClick={() => setLanguage('ru')} className={`px-2 py-1 text-xs font-bold rounded ${language === 'ru' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>RU</button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
