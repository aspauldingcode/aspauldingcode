'use client';

import React, { useState } from 'react';

interface ResponsiveButtonProps {
  fullText: string;
  mediumText?: string;
  shortText?: string;
  iconText?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  target?: string;
  rel?: string;
}

export default function SimpleResponsiveButtons({
  fullText,
  mediumText = fullText,
  shortText = mediumText,
  iconText = shortText,
  onClick,
  href,
  className = '',
  target,
  rel
}: ResponsiveButtonProps) {
  // Simple responsive text selection based on screen width
  const getResponsiveText = () => {
    if (typeof window === 'undefined') return fullText;
    
    const screenWidth = window.innerWidth;
    if (screenWidth >= 768) return fullText;
    if (screenWidth >= 640) return mediumText;
    if (screenWidth >= 480) return shortText;
    return iconText;
  };

  const [currentText] = useState(getResponsiveText());

  const buttonContent = (
    <span className="full-text">{currentText}</span>
  );

  const buttonProps = {
    className: `full-text inline-flex items-center justify-center ${className}`,
    ...(onClick && { onClick }),
    ...(href && { href }),
    ...(target && { target }),
    ...(rel && { rel })
  };

  if (href) {
    return <a {...buttonProps}>{buttonContent}</a>;
  }

  return <button {...buttonProps}>{buttonContent}</button>;
}