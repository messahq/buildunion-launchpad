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
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowNegative = false, decimalPlaces, ...props }, ref) => {
    // Local string state for free text editing
    const [localValue, setLocalValue] = React.useState<string>(() => {
      if (value === null || value === undefined || value === 0) return "";
      return String(value);
    });
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync external value changes when not focused
    React.useEffect(() => {
      if (!isFocused) {
        if (value === null || value === undefined || value === 0) {
          setLocalValue("");
        } else {
          setLocalValue(String(value));
        }
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
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
        // DON'T update parent during typing - only on blur
        // This prevents re-renders that cause focus/cursor issues
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      
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
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
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
