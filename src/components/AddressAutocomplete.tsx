import { useEffect, useRef, useState, useCallback } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";

const libraries: ("places")[] = ["places"];

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Inner component that only mounts when we have a valid API key
// This ensures useJsApiLoader is only called once with the correct key
const AddressAutocompleteWithMaps = ({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  apiKey,
}: AddressAutocompleteProps & { apiKey: string }) => {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.formatted_address) {
        setInputValue(place.formatted_address);
        onChange(place.formatted_address);
      } else if (place.name) {
        setInputValue(place.name);
        onChange(place.name);
      }
    }
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // Error loading Google Maps - fallback to regular input
  if (loadError) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={cn("pr-10", className)}
            disabled={disabled}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Include city and province for accurate location (e.g., 123 Main St, Toronto, ON)
        </p>
      </div>
    );
  }

  // Still loading Google Maps
  if (!isLoaded) {
    return (
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          disabled={disabled}
        />
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // Google Maps loaded - show autocomplete
  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: "ca" },
        types: ["geocode", "establishment"],
        fields: ["formatted_address", "name", "address_components", "geometry"],
      }}
    >
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          disabled={disabled}
        />
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
      </div>
    </Autocomplete>
  );
};

// Main component that handles API key fetching
export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter address...",
  className,
  disabled = false,
}: AddressAutocompleteProps) => {
  const { apiKey, isLoading: isLoadingKey, error: keyError } = useGoogleMapsApi();
  const [inputValue, setInputValue] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // If loading API key, show regular input with loader
  if (isLoadingKey) {
    return (
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          disabled={disabled}
        />
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // No API key available - fallback to regular input with hint
  if (!apiKey || keyError) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={cn("pr-10", className)}
            disabled={disabled}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Include city and province for accurate location (e.g., 123 Main St, Toronto, ON)
        </p>
      </div>
    );
  }

  // API key available - render the inner component that uses Google Maps
  return (
    <AddressAutocompleteWithMaps
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      apiKey={apiKey}
    />
  );
};

export default AddressAutocomplete;
