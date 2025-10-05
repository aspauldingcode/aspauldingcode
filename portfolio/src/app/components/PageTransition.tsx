'use client';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen">
      {children}
    </div>
  );
}