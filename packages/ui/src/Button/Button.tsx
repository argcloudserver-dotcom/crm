import React from "react";
export interface ButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({ children, ...rest }) => (
  <div data-ui="button" {...rest}>{children}</div>
);
