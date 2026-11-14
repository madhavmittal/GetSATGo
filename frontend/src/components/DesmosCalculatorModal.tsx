import React, { useEffect, useRef, useState } from 'react';
import { X, Minimize2, Maximize2, Calculator, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';

declare global {
  interface Window {
    Desmos?: any;
  }
}

interface DesmosCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesmosCalculatorModal: React.FC<DesmosCalculatorModalProps> = ({ isOpen, onClose }) => {
  const calcContainerRef = useRef<HTMLDivElement>(null);
  const calculatorInstanceRef = useRef<any>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [hasScriptLoaded, setHasScriptLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Check if Desmos API is available
    if (window.Desmos) {
      setHasScriptLoaded(true);
      return;
    }

    // Attempt to load Desmos script dynamically if not yet on page
    const existingScript = document.querySelector('script[src*="desmos.com/api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
      script.async = true;
      script.onload = () => setHasScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.Desmos) {
          setHasScriptLoaded(true);
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || isMinimized) return;

    if (hasScriptLoaded && calcContainerRef.current && !calculatorInstanceRef.current && window.Desmos) {
      try {
        calculatorInstanceRef.current = window.Desmos.GraphingCalculator(calcContainerRef.current, {
          keypad: true,
          graphpaper: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          border: false,
          fontSize: 14,
        });
      } catch (err) {
        console.error("Desmos init error:", err);
      }
    }

    return () => {
      if (calculatorInstanceRef.current && !isOpen) {
        try {
          calculatorInstanceRef.current.destroy();
        } catch (e) {}
        calculatorInstanceRef.current = null;
      }
    };
  }, [isOpen, hasScriptLoaded, isMinimized]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 shadow-2xl rounded-2xl border border-slate-700/30 overflow-hidden bg-slate-900 ${
        isMinimized
          ? 'bottom-6 right-6 w-72 h-14'
          : 'top-16 right-6 md:right-10 w-[92vw] sm:w-[540px] md:w-[600px] h-[520px] max-h-[80vh]'
      }`}
    >
      {/* Header / Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-white select-none cursor-move">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-wide">Desmos Graphing Calculator</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Digital SAT Built-in
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Close Calculator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="w-full h-[calc(100%-44px)] bg-white relative">
          {hasScriptLoaded ? (
            <div ref={calcContainerRef} className="w-full h-full" />
          ) : (
            <iframe
              src="https://www.desmos.com/calculator"
              title="Desmos Graphing Calculator"
              className="w-full h-full border-0"
              allow="clipboard-write"
            />
          )}
        </div>
      )}
    </div>
  );
};

