import React from 'react';
import Card from '@mui/material/Card';
import './MaterialCard.css';

const MaterialCard = ({
  children,
  className = '',
  component = 'div',
  elevation = 0,
  ...props
}) => {
  return (
    <Card
      component={component}
      elevation={elevation}
      className={`material-card ${className}`.trim()}
      {...props}
    >
      {children}
    </Card>
  );
};

export default MaterialCard;
