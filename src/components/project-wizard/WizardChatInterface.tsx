import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, FileText, MapPin, Building2, Loader2 } from "lucide-react";
import { WizardCitation, WORK_TYPES, WORK_TYPE_LABELS, WorkType } from "@/types/projectWizard";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ChatMessage {
  id: string;
  type: 'system' | 'user';
  content: string;
  citation?: WizardCitation;
  timestamp: string;
}

interface WizardChatInterfaceProps {
  onAnswerSubmit: (questionKey: string, answer: string, citation: WizardCitation) => void;
  onCitationClick: (citationId: string) => void;
  highlightedCitationId?: string | null;
  currentStep: number;
}

const WIZARD_QUESTIONS = [
  {
    key: 'project_name',
    question: 'What would you like to name this project?',
    placeholder: 'e.g., Downtown Office Renovation',
    icon: FileText,
  },
  {
    key: 'project_address',
    question: 'Where is the project located?',
    placeholder: 'Enter the full address...',
    icon: MapPin,
  },
  {
    key: 'work_type',
    question: 'What type of work will be done?',
    placeholder: 'Select work type...',
    icon: Building2,
    options: WORK_TYPES,
  },
];

const WizardChatInterface = ({
  onAnswerSubmit,
  onCitationClick,
  highlightedCitationId,
  currentStep,
}: WizardChatInterfaceProps) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  const handleSubmit = (value?: string) => {
    const answer = value || inputValue.trim();
    if (!answer || currentStep >= WIZARD_QUESTIONS.length) return;

    const question = WIZARD_QUESTIONS[currentStep];
    const citationId = `citation_${question.key}_${Date.now()}`;
    
    const citation: WizardCitation = {
      id: citationId,
      questionKey: question.key,
      answer: answer,
      timestamp: new Date().toISOString(),
      elementType: question.key === 'project_name' ? 'project_label' 
        : question.key === 'project_address' ? 'map_location' 
        : 'wireframe',
    };

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: question.key === 'work_type' 
        ? WORK_TYPE_LABELS[answer as WorkType] || answer 
        : answer,
      citation,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      setIsTyping(false);
      onAnswerSubmit(question.key, answer, citation);
    }, 300);

    scrollToBottom();
  };

  const currentQuestion = WIZARD_QUESTIONS[currentStep];
  const isSelectQuestion = currentQuestion?.options;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-secondary/30">
      {/* Chat Header */}
      <div className="p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">Project Architect</h2>
            <p className="text-xs text-muted-foreground">
              Step {Math.min(currentStep + 1, WIZARD_QUESTIONS.length)} of {WIZARD_QUESTIONS.length}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
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
                  ? "0 0 0 2px hsl(var(--primary))" 
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
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border shadow-sm rounded-bl-md",
                  message.citation?.id === highlightedCitationId && "ring-2 ring-primary ring-offset-2"
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
                        ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    <span className="font-mono">
                      {message.citation.id.slice(0, 12)}...
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-muted-foreground rounded-full"
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
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        {currentStep < WIZARD_QUESTIONS.length ? (
          isSelectQuestion ? (
            /* Work Type Selection Grid */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Select the type of work
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {currentQuestion.options?.map((option) => (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSubmit(option)}
                    className="p-3 text-sm text-left rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {WORK_TYPE_LABELS[option as WorkType]}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* Text Input */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex gap-2"
            >
              <div className="flex-1 relative">
                {currentQuestion.icon && (
                  <currentQuestion.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="pl-10 h-11 rounded-full bg-card"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-full shrink-0"
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )
        ) : (
          /* Completion State */
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Generating project...</span>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardChatInterface;
