import { useEffect, useState } from "react";

const useSpeech = () => {
  const [voice, setVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes("Google") ||
        v.name.includes("Samantha") ||
        v.name.includes("Alex") ||
        v.name.includes("Zira") ||
        v.name.includes("David")
      );
      setVoice(preferred || voices[0]);
    };

    // Wait for voices to load (some browsers load async)
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }

    // Cleanup function
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = (text) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.voice = voice;

    // Fine-tune tone
    utter.rate = .95;   // slightly slower
    utter.pitch = 3;  // slightly higher pitch
    utter.volume = 1;    // full volume

    // Add event listeners
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utter);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};

export default useSpeech; 