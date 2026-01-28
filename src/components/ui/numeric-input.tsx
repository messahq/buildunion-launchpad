import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | null | undefined;
  onChange: (value: number) => void;
  allowNegative?: boolean;
  decimalPlaces?: number;
}

/**
 * NumericInput - A text-based input for numbers that allows free typing.
 * Uses local string state during editing and converts to number on blur.
 * This avoids the issues with type="number" inputs (spinners, awkward editing).
 * 
 * IMPORTANT: This component uses a stable internal state that doesn't get
 * overwritten by parent updates while the user is focused/typing.
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowNegative = false, decimalPlaces, ...props }, ref) => {
    // Local string state for free text editing
    const [localValue, setLocalValue] = React.useState<string>(() => {
      if (value === null || value === undefined || value === 0) return "";
      return String(value);
    });
    const [isFocused, setIsFocused] = React.useState(false);
    
    // Track if user has modified the value since focusing
    const hasLocalEditsRef = React.useRef(false);
    
    // Store the input element ref for focus state checking
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    // Combine refs
    const setRefs = React.useCallback((node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    // Sync external value changes ONLY when not focused AND no local edits
    React.useEffect(() => {
      // Never update while focused - this prevents input "jumping"
      if (isFocused || hasLocalEditsRef.current) {
        return;
      }
      
      if (value === null || value === undefined || value === 0) {
        setLocalValue("");
      } else {
        setLocalValue(String(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Mark that user has made local edits
      hasLocalEditsRef.current = true;
      
      // Allow empty string
      if (inputValue === "") {
        setLocalValue("");
        return;
      }

      // Allow typing partial numbers (e.g., "12.", "-", "0.")
      // Only allow valid number characters
      const regex = allowNegative
        ? /^-?\d*\.?\d*$/
        : /^\d*\.?\d*$/;

      if (regex.test(inputValue)) {
        setLocalValue(inputValue);
        // Don't update parent here - only on blur for smooth typing
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      hasLocalEditsRef.current = false;
      
      // Convert to number on blur
      if (localValue === "" || localValue === "-" || localValue === ".") {
        setLocalValue("");
        onChange(0);
        return;
      }

      let num = parseFloat(localValue);
      if (isNaN(num)) {
        num = 0;
      }

      // Apply decimal places if specified
      if (decimalPlaces !== undefined) {
        num = parseFloat(num.toFixed(decimalPlaces));
      }

      // Update with cleaned value
      setLocalValue(num === 0 ? "" : String(num));
      onChange(num);
    };

    const handleFocus = () => {
      setIsFocused(true);
      hasLocalEditsRef.current = false;
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={setRefs}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
