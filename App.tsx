
import React, { useState, createContext, useContext, ReactNode } from 'react';
import Header from './components/Header';
import ClutterIdentifier from './components/ClutterIdentifier';
import ChatBot from './components/ChatBot';

// --- I18N Setup ---
export type Language = 'en' | 'ru';

const translations = {
    en: {
        'app.title': 'Gemini Garage Sale',
        'nav.clutter': 'Clutter Finder',
        'nav.chat': 'Chat Bot',
        'clutter.title': 'Garage Clutter Finder',
        'clutter.description': 'Upload a photo of a cluttered garage or storage area, and our AI will identify valuable items, estimate their worth, and show you where they are in the image.',
        'clutter.upload.change': 'Change Image',
        'clutter.upload.new': 'Upload Image',
        'clutter.button.analyze': 'Scan for Treasures',
        'clutter.button.analyzing': 'Scanning...',
        'clutter.button.selectArea': 'Select Area',
        'clutter.button.analyzeSelection': 'Analyze Selection',
        'clutter.button.clearSelection': 'Clear',
        'clutter.error.noImage': 'Please select an image first.',
        'clutter.error.fail': 'Failed to analyze the image. Please try again.',
        'clutter.results.title': 'Analysis Results',
        'clutter.results.highValue': 'HIGH VALUE',
        'clutter.results.marketValue': 'Market Value',
        'clutter.results.quickSale': 'Quick Sale Price',
        'clutter.results.description': 'Description',
        'clutter.results.sources': 'Sources',
        'clutter.results.noSources': 'No online sources found.',
        'clutter.results.analytics': 'Analytics & Advice',
        'clutter.results.buyRecommendation': 'Buying Advice',
        'clutter.results.saleSpeed': 'Demand',
        'chat.greeting': 'Hello! How can I help you today?',
        'chat.placeholder': 'Type your message...',
        'chat.error': 'Sorry, I encountered an error. Please try again.',
    },
    ru: {
        'app.title': 'Гаражная распродажа Gemini',
        'nav.clutter': 'Поиск вещей',
        'nav.chat': 'Чат-бот',
        'clutter.title': 'Поиск ценностей в гараже',
        'clutter.description': 'Загрузите фотографию заваленного гаража или склада, и наш ИИ определит ценные предметы, оценит их стоимость и покажет, где они находятся на изображении.',
        'clutter.upload.change': 'Изменить изображение',
        'clutter.upload.new': 'Загрузить изображение',
        'clutter.button.analyze': 'Искать сокровища',
        'clutter.button.analyzing': 'Сканирую...',
        'clutter.button.selectArea': 'Выбрать область',
        'clutter.button.analyzeSelection': 'Анализ области',
        'clutter.button.clearSelection': 'Очистить',
        'clutter.error.noImage': 'Пожалуйста, сначала выберите изображение.',
        'clutter.error.fail': 'Не удалось проанализировать изображение. Пожалуйста, попробуйте еще раз.',
        'clutter.results.title': 'Результаты анализа',
        'clutter.results.highValue': 'ВЫСОКАЯ ЦЕННОСТЬ',
        'clutter.results.marketValue': 'Рыночная стоимость',
        'clutter.results.quickSale': 'Цена быстрой продажи',
        'clutter.results.description': 'Описание',
        'clutter.results.sources': 'Источники',
        'clutter.results.noSources': 'Онлайн-источники не найдены.',
        'clutter.results.analytics': 'Аналитика и советы',
        'clutter.results.buyRecommendation': 'Совет по покупке',
        'clutter.results.saleSpeed': 'Спрос (скорость продажи)',
        'chat.greeting': 'Здравствуйте! Чем я могу вам помочь сегодня?',
        'chat.placeholder': 'Введите ваше сообщение...',
        'chat.error': 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
    }
};

type TranslationsKeys = keyof typeof translations.en;

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: TranslationsKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useTranslation = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};

const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('ru');

    const t = (key: TranslationsKeys): string => {
        return translations[language][key] || translations['en'][key];
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
// --- End I18N Setup ---


type View = 'clutter' | 'chat';

const AppContent: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('clutter');

    const renderView = () => {
        switch (activeView) {
            case 'clutter':
                return <ClutterIdentifier />;
            case 'chat':
                return <ChatBot />;
            default:
                return <ClutterIdentifier />;
        }
    };

     return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <Header activeView={activeView} setActiveView={setActiveView} />
            <main className="p-4 sm:p-6 md:p-8">
                {renderView()}
            </main>
        </div>
    );
}

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
};

export default App;
