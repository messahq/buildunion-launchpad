// ============================================
// WIZARD CHAT INTERFACE - Citation-Driven
// ============================================
// DB-First Architecture: Save citation FIRST, then UI updates as EFFECT
// ============================================

import { useState, useRef, useEffect, forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, FileText, MapPin, Building2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Citation, CITATION_TYPES, getCitationType, createCitation } from "@/types/citation";
import { WORK_TYPES, WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import AddressAutocomplete, { type PlaceData } from "@/components/AddressAutocomplete";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  type: 'system' | 'user';
  content: string;
  citation?: Citation;
  timestamp: string;
  isSaving?: boolean;
  saveError?: boolean;
}

interface WizardChatInterfaceProps {
  projectId: string;
  userId: string;
  onCitationSaved: (citation: Citation) => void;
  onCitationClick: (citationId: string) => void;
  highlightedCitationId?: string | null;
  currentStep: number;
  onStepComplete: () => void;
}

// Track place data for address submissions
let pendingPlaceData: PlaceData | null = null;

const WIZARD_QUESTIONS = [
  {
    key: 'project_name',
    question: 'What would you like to name this project?',
    placeholder: 'e.g., Downtown Office Renovation',
    icon: FileText,
    citeType: CITATION_TYPES.PROJECT_NAME,
  },
  {
    key: 'project_address',
    question: 'Where is the project located?',
    placeholder: 'Enter the full address (Toronto-focused)...',
    icon: MapPin,
    citeType: CITATION_TYPES.LOCATION,
  },
  {
    key: 'work_type',
    question: 'What type of work will be done?',
    placeholder: 'Select work type...',
    icon: Building2,
    options: WORK_TYPES,
    citeType: CITATION_TYPES.WORK_TYPE,
  },
];

const WizardChatInterface = forwardRef<HTMLDivElement, WizardChatInterfaceProps>(
  ({ projectId, userId, onCitationSaved, onCitationClick, highlightedCitationId, currentStep, onStepComplete }, ref) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [placeData, setPlaceData] = useState<PlaceData | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const highlightedRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll to highlighted citation
    useEffect(() => {
      if (highlightedCitationId && highlightedRef.current) {
        highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, [highlightedCitationId]);

    // Add initial system message
    useEffect(() => {
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          type: 'system',
          content: "Welcome to Project 3.0! Let's build something amazing together. I'll guide you through creating your construction project with precision and style.",
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        
        // Add first question after delay
        setTimeout(() => {
          addSystemQuestion(0);
        }, 800);
      }
    }, []);

    // Progress to next question when step changes
    useEffect(() => {
      if (currentStep > 0 && currentStep < WIZARD_QUESTIONS.length) {
        setTimeout(() => {
          addSystemQuestion(currentStep);
        }, 500);
      }
    }, [currentStep]);

    const addSystemQuestion = (stepIndex: number) => {
      if (stepIndex >= WIZARD_QUESTIONS.length) return;
      
      const question = WIZARD_QUESTIONS[stepIndex];
      const questionMessage: ChatMessage = {
        id: `question_${question.key}`,
        type: 'system',
        content: question.question,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, questionMessage]);
      scrollToBottom();
    };

    /**
     * CORE FUNCTION: Save citation to DB FIRST, then update UI as EFFECT
     * Also updates project table with project_name and address
     */
    const saveCitationToDb = useCallback(async (citation: Citation): Promise<boolean> => {
      try {
        // Get current citations from DB
        const { data: currentData } = await supabase
          .from("project_summaries")
          .select("id, verified_facts")
          .eq("project_id", projectId)
          .maybeSingle();

        const currentFacts = Array.isArray(currentData?.verified_facts) 
          ? currentData.verified_facts 
          : [];

        // Append new citation
        const updatedFacts = [...currentFacts, citation as unknown as Record<string, unknown>];

        // Save to project_summaries
        let error;
        if (currentData?.id) {
          const result = await supabase
            .from("project_summaries")
            .update({
              verified_facts: updatedFacts as unknown as null,
              updated_at: new Date().toISOString(),
            })
            .eq("project_id", projectId);
          error = result.error;
        } else {
          const result = await supabase
            .from("project_summaries")
            .insert({
              project_id: projectId,
              user_id: userId,
              verified_facts: updatedFacts as unknown as null,
            });
          error = result.error;
        }

        if (error) throw error;

        // ✓ CRITICAL: Also update the projects table with real data
        if (citation.cite_type === CITATION_TYPES.PROJECT_NAME) {
          const { error: projectError } = await supabase
            .from("projects")
            .update({ 
              name: citation.answer,
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
          
          if (projectError) {
            console.error("[WizardChat] Failed to update project name:", projectError);
          } else {
            console.log("[WizardChat] Project name updated to:", citation.answer);
          }
        }

        // ✓ Update address and trade on projects table too
        if (citation.cite_type === CITATION_TYPES.LOCATION) {
          const { error: addressError } = await supabase
            .from("projects")
            .update({ 
              address: citation.answer,
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
          
          if (addressError) {
            console.error("[WizardChat] Failed to update project address:", addressError);
          } else {
            console.log("[WizardChat] Project address updated to:", citation.answer);
          }
        }

        if (citation.cite_type === CITATION_TYPES.WORK_TYPE) {
          const { error: tradeError } = await supabase
            .from("projects")
            .update({ 
              trade: citation.value as string,
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
          
          if (tradeError) {
            console.error("[WizardChat] Failed to update project trade:", tradeError);
          } else {
            console.log("[WizardChat] Project trade updated to:", citation.value);
          }
        }

        return true;

      } catch (err) {
        console.error("[WizardChat] Citation save failed:", err);
        return false;
      }
    }, [projectId, userId]);

    /**
     * Geocode address and return coordinates
     */
    const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
      try {
        const { data } = await supabase.functions.invoke("get-maps-key");
        if (!data?.key) return null;

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${data.key}`
        );
        const result = await response.json();
        
        if (result.results?.[0]?.geometry?.location) {
          return result.results[0].geometry.location;
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
      return null;
    }, []);

    const handleSubmit = async (value?: string) => {
      const answer = value || inputValue.trim();
      if (!answer || currentStep >= WIZARD_QUESTIONS.length || isSaving) return;

      const question = WIZARD_QUESTIONS[currentStep];
      
      // Create the citation base
      let citation = createCitation({
        cite_type: question.citeType,
        question_key: question.key,
        answer: question.key === 'work_type' 
          ? WORK_TYPE_LABELS[answer as WorkType] || answer 
          : answer,
        value: answer,
        metadata: question.key === 'work_type' 
          ? { work_type_key: answer }
          : undefined,
      });

      // For address, include place data with coordinates
      if (question.key === 'project_address') {
        let finalAddress = answer;
        let finalCoordinates: { lat: number; lng: number } | null = null;
        
        if (placeData) {
          // User selected from autocomplete - use exact data
          finalAddress = placeData.formattedAddress;
          finalCoordinates = placeData.coordinates;
          console.log("[WizardChat] Using autocomplete coordinates:", finalCoordinates);
        } else {
          // User typed manually - attempt geocoding as fallback
          console.log("[WizardChat] No placeData, attempting geocode for:", answer);
          finalCoordinates = await geocodeAddress(answer);
          if (finalCoordinates) {
            console.log("[WizardChat] Geocoded coordinates:", finalCoordinates);
          } else {
            console.warn("[WizardChat] Geocoding failed, proceeding without coordinates");
          }
        }
        
        citation = {
          ...citation,
          answer: finalAddress,
          value: finalAddress,
          metadata: {
            ...citation.metadata,
            coordinates: finalCoordinates || undefined,
          },
        };
      }

      // Create user message with saving state
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: citation.answer, // Use the final citation answer (includes formatted address)
        citation,
        timestamp: new Date().toISOString(),
        isSaving: true,
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      setPlaceData(null); // Reset place data after use
      setIsSaving(true);
      scrollToBottom();

      // CRITICAL: Save to DB FIRST
      const saveSuccess = await saveCitationToDb(citation);

      if (saveSuccess) {
        // SUCCESS: Update message state to show saved
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, isSaving: false, citation } 
            : msg
        ));
        
        // EFFECT: Notify parent that citation was saved
        onCitationSaved(citation);
        
        // EFFECT: Move to next step
        onStepComplete();
      } else {
        // FAILURE: Mark message as failed
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, isSaving: false, saveError: true } 
            : msg
        ));
        toast.error("Failed to save - please try again");
      }

      setIsSaving(false);
    };

    const currentQuestion = WIZARD_QUESTIONS[currentStep];
    const isSelectQuestion = currentQuestion?.options;

    return (
      <div ref={ref} className="flex flex-col h-full bg-gradient-to-b from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10">
        {/* Chat Header */}
        <div className="p-4 border-b border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                Project Architect
              </h2>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                Step {Math.min(currentStep + 1, WIZARD_QUESTIONS.length)} of {WIZARD_QUESTIONS.length}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-amber-100 dark:bg-amber-950 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / WIZARD_QUESTIONS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                ref={message.citation?.id === highlightedCitationId ? highlightedRef : undefined}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  boxShadow: message.citation?.id === highlightedCitationId 
                    ? "0 0 0 2px hsl(35 90% 55%)" 
                    : "none"
                }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 transition-all duration-300",
                    message.type === 'user'
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-br-md shadow-lg shadow-amber-500/25"
                      : "bg-card border border-amber-200/50 dark:border-amber-800/30 shadow-sm rounded-bl-md",
                    message.citation?.id === highlightedCitationId && "ring-2 ring-amber-500 ring-offset-2",
                    message.saveError && "ring-2 ring-red-500"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {/* Citation Badge */}
                  {message.citation && (
                    <button
                      onClick={() => onCitationClick(message.citation!.id)}
                      className={cn(
                        "mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all",
                        message.type === 'user'
                          ? "bg-white/20 text-white hover:bg-white/30"
                          : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50"
                      )}
                    >
                      {message.isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : message.saveError ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span className="font-mono">
                        {message.isSaving 
                          ? "Saving..." 
                          : message.saveError 
                            ? "Failed" 
                            : `${message.citation.id.slice(0, 12)}...`}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isSaving && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-amber-200/50 dark:border-amber-800/30 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 bg-amber-500 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-amber-500 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-amber-500 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/80 via-white/80 to-orange-50/80 dark:from-amber-950/50 dark:via-background/80 dark:to-orange-950/50 backdrop-blur-sm">
          {currentStep < WIZARD_QUESTIONS.length ? (
            isSelectQuestion ? (
              /* Work Type Selection Grid */
              <div className="space-y-3">
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
                  Select the type of work
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {currentQuestion.options?.map((option) => (
                    <motion.button
                      key={option}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubmit(option)}
                      disabled={isSaving}
                      className="p-3 text-sm text-left rounded-lg border border-amber-200 dark:border-amber-800 bg-card hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 dark:hover:from-amber-950/50 dark:hover:to-orange-950/50 hover:border-amber-400 dark:hover:border-amber-600 transition-all disabled:opacity-50"
                    >
                      {WORK_TYPE_LABELS[option as WorkType]}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              /* Text/Address Input */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="flex gap-2"
              >
                <div className="flex-1">
                  {currentQuestion.key === 'project_address' ? (
                    <AddressAutocomplete
                      value={inputValue}
                      onChange={setInputValue}
                      onPlaceSelected={(placeData) => {
                        setPlaceData(placeData);
                        console.log("[WizardChat] Place selected:", placeData);
                      }}
                      placeholder={currentQuestion.placeholder}
                      className="pl-10 h-11 rounded-full bg-card border-amber-200 dark:border-amber-800 focus:border-amber-500 focus:ring-amber-500/20"
                    />
                  ) : (
                    <div className="relative">
                      {currentQuestion.icon && (
                        <currentQuestion.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                      )}
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        className="pl-10 h-11 rounded-full bg-card border-amber-200 dark:border-amber-800 focus:border-amber-500 focus:ring-amber-500/20"
                        autoFocus
                        disabled={isSaving}
                      />
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 rounded-full shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25"
                  disabled={!inputValue.trim() || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            )
          ) : (
            /* Completion State */
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-700 dark:text-amber-300"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">All citations verified!</span>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

WizardChatInterface.displayName = "WizardChatInterface";

export default WizardChatInterface;
