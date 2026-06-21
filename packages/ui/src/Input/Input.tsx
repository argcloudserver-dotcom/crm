import React from "react";
export interface InputProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}
export const Input: React.FC<InputProps> = ({ children, ...rest }) => (
  <div data-ui="input" {...rest}>{children}</div>
);
