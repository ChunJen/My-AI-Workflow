import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`border-b border-zinc-100 px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
