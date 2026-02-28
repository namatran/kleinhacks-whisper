import { useState } from 'react';
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}

export default function StarRating({
  value,
  onChange,
  size = 44,
  disabled = false,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          className={`
            transition-transform duration-150
            ${disabled ? "cursor-not-allowed opacity-60" : "hover:scale-110 cursor-pointer"}
          `}
        >
          <Star
            size={size}
            className={`
              ${star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 dark:text-gray-600"}
            `}
            strokeWidth={star <= (hover || value) ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  );
}