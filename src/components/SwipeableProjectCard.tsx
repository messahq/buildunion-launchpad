import { useState, useRef, ReactNode } from "react";
import { Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableProjectCardProps {
  children: ReactNode;
  onDelete: () => void;
  onArchive?: () => void;
  deleteLabel?: string;
  archiveLabel?: string;
  showArchiveOption?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 150;

const SwipeableProjectCard = ({
  children,
  onDelete,
  onArchive,
  deleteLabel = "Delete",
  archiveLabel = "Archive",
  showArchiveOption = true,
  className,
}: SwipeableProjectCardProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;

    const currentX = e.touches[0].clientX;
    const diff = startXRef.current - currentX;

    // Only allow left swipe (positive diff)
    if (diff > 10) {
      isDraggingRef.current = true;
      // Limit the swipe distance with rubber band effect
      const limitedDiff = Math.min(diff, DELETE_THRESHOLD * 1.2);
      setTranslateX(-limitedDiff);
    } else if (diff < -10 && translateX < 0) {
      // Allow right swipe to close
      isDraggingRef.current = true;
      setTranslateX(Math.min(0, translateX + Math.abs(diff)));
    }
  };

  const handleTouchEnd = () => {
    if (startXRef.current === null) return;

    if (Math.abs(translateX) >= DELETE_THRESHOLD) {
      // Show confirmation instead of immediate delete
      setShowConfirm(true);
      setTranslateX(-SWIPE_THRESHOLD * 1.5);
    } else if (Math.abs(translateX) >= SWIPE_THRESHOLD) {
      // Show action buttons
      setTranslateX(-SWIPE_THRESHOLD * 1.5);
    } else {
      // Snap back
      setTranslateX(0);
    }

    startXRef.current = null;
    
    // Reset dragging state after a short delay
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive();
    }
    setTranslateX(0);
    setShowConfirm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTranslateX(-window.innerWidth);
    setTimeout(() => {
      onDelete();
    }, 300);
  };

  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    // If we're showing the action buttons, close them instead of triggering click
    if (translateX < -10) {
      e.stopPropagation();
      e.preventDefault();
      setTranslateX(0);
      setShowConfirm(false);
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Action background */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end transition-all duration-200",
          translateX < 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: Math.abs(translateX) + 20 }}
      >
        {/* Two-button layout when archive is available */}
        {showArchiveOption && onArchive ? (
          <div className="flex h-full">
            {/* Archive button */}
            <button
              onClick={handleArchiveClick}
              className="flex flex-col items-center justify-center px-3 py-2 bg-amber-500 text-white h-full min-w-[70px]"
            >
              <Archive className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{archiveLabel}</span>
            </button>
            {/* Delete button */}
            <button
              onClick={handleDeleteClick}
              className="flex flex-col items-center justify-center px-3 py-2 bg-destructive text-destructive-foreground h-full min-w-[70px]"
            >
              <Trash2 className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{deleteLabel}</span>
            </button>
          </div>
        ) : (
          // Single delete button
          <button
            onClick={handleDeleteClick}
            className="flex flex-col items-center justify-center px-4 py-2 bg-destructive text-destructive-foreground h-full min-w-[80px]"
          >
            <Trash2 className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{deleteLabel}</span>
          </button>
        )}
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        className={cn(
          "relative bg-card transition-transform",
          !isDraggingRef.current && "duration-200 ease-out",
          isDeleting && "duration-300"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableProjectCard;
