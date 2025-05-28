import React from 'react';

const Card = ({ title, children, className }) => {
  return (
    <div className={`card w-full bg-base-100 shadow-xl ${className || ''}`}>
      <div className="card-body">
        {title && <h2 className="card-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default Card;
