import React from 'react';

const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  variant, // 'bordered', 'ghost', or undefined for default
  size,    // 'xs', 'sm', 'md', 'lg'
  className = '',
  name,
  ...props
}) => {
  const baseClasses = 'input'; // Base DaisyUI input class

  const variantClasses = {
    bordered: 'input-bordered',
    ghost: 'input-ghost',
  };

  const sizeClasses = {
    xs: 'input-xs',
    sm: 'input-sm',
    md: 'input-md', // Default DaisyUI size
    lg: 'input-lg',
  };

  const inputClasses = [
    baseClasses,
    variant ? variantClasses[variant] : 'input-bordered', // Default to bordered if no variant specified
    size ? sizeClasses[size] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={inputClasses}
      name={name}
      {...props}
    />
  );
};

export default Input;
