"use client";

import React, { useCallback } from 'react';
import Image from "next/image";

export default function Home() {
  const handleParagraphClick = useCallback(() => {
    console.log('Paragraph clicked');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 bg-base00">
      <header className="text-center mb-16">
        <h1 className="text-4xl sm:text-6xl font-bold text-base05">
          Alex Spaulding
        </h1>
        <p className="text-lg sm:text-xl text-base04 mt-4">
          Professional Software Developer
        </p>
      </header>

      <main className="flex flex-col items-center gap-8">
        <Image
          className="rounded-full border-4 border-base02"
          src="/profile.png"
          alt="Profile Picture"
          width={150}
          height={150}
        />
        <p className="text-center text-base05 max-w-2xl" onClick={handleParagraphClick}>
          Welcome to my portfolio! I am passionate about machine learning and AI,
          actively seeking opportunities as an ML intern. With a strong foundation
          in programming and data analysis, I'm eager to contribute to innovative
          ML projects. Explore my projects to see my work with algorithms,
          data science, and AI applications.
        </p>
        <div className="flex gap-4 mt-8">
          <a
            className="bg-base0D text-base00 py-2 px-4 rounded hover:bg-base0C transition-colors"
            href="/projects"
          >
            View Projects
          </a>
          <a
            className="bg-base03 text-base07 py-2 px-4 rounded hover:bg-base04 transition-colors"
            href="#contact"
          >
            Contact Me
          </a>
        </div>
      </main>

      <footer className="mt-16 text-center text-base03">
        <p>© 2024-2025 Alex Spaulding. All rights reserved.</p>
      </footer>
    </div>
  );
}
