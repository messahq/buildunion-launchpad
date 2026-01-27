import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Pen, Type, Check, Calendar } from "lucide-react";

export interface SignatureData {
  type: 'drawn' | 'typed';
  data: string;
  dataUrl?: string; // For backwards compatibility with drawn signatures
  name: string;
  signedAt: string; // ISO date string when signature was captured
}

interface SignatureCaptureProps {
  onSignatureChange: (signature: SignatureData | null) => void;
  label?: string;
  placeholder?: string;
  initialSignature?: SignatureData | null;
}

const SignatureCapture = ({ 
  onSignatureChange, 
  label = "Signature",
  placeholder = "Type your full name",
  initialSignature
}: SignatureCaptureProps) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('type');
  const [typedName, setTypedName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [signedDate, setSignedDate] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedSignature, setLockedSignature] = useState<SignatureData | null>(null);

  // Load initial signature if provided
  useEffect(() => {
    if (initialSignature) {
      setIsLocked(true);
      setLockedSignature(initialSignature);
      setSignedDate(initialSignature.signedAt);
      
      if (initialSignature.type === 'typed') {
        setTypedName(initialSignature.data || initialSignature.name || '');
        setActiveTab('type');
      } else if (initialSignature.type === 'drawn') {
        setActiveTab('draw');
        setHasDrawnSignature(true);
        // Load the drawn signature into canvas
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = initialSignature.dataUrl || initialSignature.data;
        }
      }
    }
  }, [initialSignature]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing style
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasDrawnSignature && !isLocked) {
      const canvas = canvasRef.current;
      if (canvas) {
        const now = new Date().toISOString();
        setSignedDate(now);
        const signatureData: SignatureData = {
          type: 'drawn',
          data: canvas.toDataURL('image/png'),
          dataUrl: canvas.toDataURL('image/png'),
          name: '',
          signedAt: now
        };
        onSignatureChange(signatureData);
      }
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (isLocked) {
      // Unlock and clear
      setIsLocked(false);
      setLockedSignature(null);
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
    setSignedDate(null);
    setTypedName("");
    onSignatureChange(null);
  };

  const handleTypedNameChange = (name: string) => {
    if (isLocked) return;
    setTypedName(name);
    if (name.trim()) {
      const now = new Date().toISOString();
      setSignedDate(now);
      onSignatureChange({
        type: 'typed',
        data: name,
        name: name,
        signedAt: now
      });
    } else {
      setSignedDate(null);
      onSignatureChange(null);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render locked/existing signature view
  if (isLocked && lockedSignature) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{label}</Label>
        
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          {lockedSignature.type === 'drawn' ? (
            <img 
              src={lockedSignature.dataUrl || lockedSignature.data} 
              alt="Signature" 
              className="max-h-20 mb-2"
            />
          ) : (
            <div 
              className="text-3xl text-slate-800 mb-2"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              {lockedSignature.data || lockedSignature.name}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <Check className="w-4 h-4" />
            <span>Signed</span>
          </div>
          {signedDate && (
            <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(signedDate)}</span>
            </div>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="gap-2"
        >
          <Eraser className="w-4 h-4" />
          Clear & Re-sign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'type')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="type" className="gap-2">
            <Type className="w-4 h-4" />
            Type
          </TabsTrigger>
          <TabsTrigger value="draw" className="gap-2">
            <Pen className="w-4 h-4" />
            Draw
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="type" className="mt-3">
          <div className="space-y-3">
            <Input
              placeholder={placeholder}
              value={typedName}
              onChange={(e) => handleTypedNameChange(e.target.value)}
              className="text-lg"
            />
            {typedName && (
              <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
                <p className="text-xs text-muted-foreground mb-2">Signature preview:</p>
                <div 
                  className="text-3xl text-slate-800"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  {typedName}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="draw" className="mt-3">
          <div className="space-y-3">
            <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawnSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm">Draw your signature here</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="gap-2"
              >
                <Eraser className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Signature confirmation with date */}
      {((activeTab === 'type' && typedName) || (activeTab === 'draw' && hasDrawnSignature)) && signedDate && (
        <div className="flex flex-col gap-1 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <Check className="w-4 h-4" />
            <span>Signature captured</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Calendar className="w-3 h-3" />
            <span>Signed: {formatDate(signedDate)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureCapture;
