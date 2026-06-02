import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function VoiceInput({ onTranscript, fieldName = "" }) {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      // Select recognition language based on active application language
      rec.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
      
      rec.onstart = () => {
        setIsListening(true);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      rec.onerror = (e) => {
        console.error("Speech Recognition error: ", e);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          toast.error("Microphone access blocked. Enable permissions in settings.");
        }
      };
      
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        onTranscript(transcript);
        toast.success(fieldName ? `${t('home.voicePrompt')} (${transcript})` : transcript);
      };
      
      setRecognition(rec);
    }
  }, [i18n.language, onTranscript, fieldName, t]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error("Voice input is not supported in this browser. Try Google Chrome.");
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-2.5 rounded-full transition-all duration-300 ${
        isListening
          ? 'bg-red-500 text-white animate-pulse shadow-[0_0_12px_#ef4444]'
          : 'bg-[#f1ebd9] hover:bg-primary-light text-primary hover:text-white'
      }`}
      title={isListening ? "Listening..." : "Tap to speak"}
    >
      {isListening ? (
        <Mic className="w-5 h-5 animate-bounce" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
