import React from "react";
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}
export const Card: React.FC<CardProps> = ({ children, ...rest }) => (
  <div data-ui="card" {...rest}>{children}</div>
);
