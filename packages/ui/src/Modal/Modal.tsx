import React from "react";
export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ children, ...rest }) => (
  <div data-ui="modal" {...rest}>{children}</div>
);
