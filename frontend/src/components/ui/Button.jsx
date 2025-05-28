import React from 'react';

const Button = ({
  children,
  variant,
  size,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
  outline = false,
  ...props
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    link: 'btn-link',
    info: 'btn-info',
    success: 'btn-success',
    warning: 'btn-warning',
    error: 'btn-error',
    neutral: 'btn-neutral', // Added neutral variant
  };
  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md', // Default DaisyUI size
    lg: 'btn-lg',
  };

  const buttonClasses = [
    baseClasses,
    variant ? variantClasses[variant] : '', // Default is 'btn' without specific color
    size ? sizeClasses[size] : '',
    fullWidth ? 'btn-block' : '',
    outline ? 'btn-outline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
