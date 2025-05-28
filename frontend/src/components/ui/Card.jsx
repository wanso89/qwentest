import React from 'react';

const Card = ({ title, children, className }) => {
  return (
    <div className={`card w-full bg-base-100 shadow-xl border border-base-300 ${className || ''}`}>
      <div className="card-body p-6">
        {title && <h2 className="card-title mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default Card;
