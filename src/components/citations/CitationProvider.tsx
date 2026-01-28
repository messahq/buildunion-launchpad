import React, { createContext, useContext, useState, useCallback } from "react";
import { CitationSource } from "@/types/citation";
import { SourceProofPanel } from "./SourceProofPanel";

interface CitationContextValue {
  openProofPanel: (source: CitationSource) => void;
  closeProofPanel: () => void;
  currentSource: CitationSource | null;
  isProofPanelOpen: boolean;
}

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

export const useCitation = () => {
  const context = useContext(CitationContext);
  if (!context) {
    throw new Error("useCitation must be used within a CitationProvider");
  }
  return context;
};

interface CitationProviderProps {
  children: React.ReactNode;
}

export const CitationProvider: React.FC<CitationProviderProps> = ({ children }) => {
  const [currentSource, setCurrentSource] = useState<CitationSource | null>(null);
  const [isProofPanelOpen, setIsProofPanelOpen] = useState(false);

  const openProofPanel = useCallback((source: CitationSource) => {
    setCurrentSource(source);
    setIsProofPanelOpen(true);
  }, []);

  const closeProofPanel = useCallback(() => {
    setIsProofPanelOpen(false);
    // Delay clearing the source to allow for animation
    setTimeout(() => setCurrentSource(null), 300);
  }, []);

  return (
    <CitationContext.Provider
      value={{
        openProofPanel,
        closeProofPanel,
        currentSource,
        isProofPanelOpen,
      }}
    >
      {children}
      <SourceProofPanel
        isOpen={isProofPanelOpen}
        onClose={closeProofPanel}
        source={currentSource}
      />
    </CitationContext.Provider>
  );
};

export default CitationProvider;
