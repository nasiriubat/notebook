import React from 'react';
import { getCurrentLanguage, setLanguage, getTranslation } from '../utils/ln';

const LanguageSwitcher = ({ className = '' }) => {
    const currentLang = getCurrentLanguage();

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        window.location.reload(); // Reload to apply changes
    };

    return (
        <div className={`justify-content-center language-switcher ${className}`} >
            
            <div className="language-toggle">
                <input
                    type="radio"
                    id="lang-en"
                    name="language"
                    value="en"
                    checked={currentLang === 'en'}
                    onChange={() => handleLanguageChange('en')}
                />
                <label htmlFor="lang-en">EN</label>
                <input
                    type="radio"
                    id="lang-fi"
                    name="language"
                    value="fi"
                    checked={currentLang === 'fi'}
                    onChange={() => handleLanguageChange('fi')}
                />
                <label htmlFor="lang-fi">FI</label>
            </div>
            <style jsx>{`
                .language-switcher {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .language-toggle {
                    display: flex;
                    background: var(--bs-gray-200);
                    padding: 0.25rem;
                    border-radius: 0.5rem;
                    position: relative;
                }
                .language-toggle input[type="radio"] {
                    display: none;
                }
                .language-toggle label {
                    padding: 0.25rem 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--bs-gray-600);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border-radius: 0.25rem;
                }
                .language-toggle input[type="radio"]:checked + label {
                    color: var(--bs-primary);
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                @media (prefers-color-scheme: dark) {
                    .language-toggle {
                        background: var(--bs-gray-700);
                    }
                    .language-toggle label {
                        color: var(--bs-gray-300);
                    }
                    .language-toggle input[type="radio"]:checked + label {
                        color: var(--bs-primary);
                        background: var(--bs-gray-800);
                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    }
                }
            `}</style>
        </div>
    );
};

export default LanguageSwitcher; 