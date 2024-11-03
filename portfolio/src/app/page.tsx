"use client";

import React, { useCallback } from 'react';
import Image from "next/image";

export default function Home() {
  const handleParagraphClick = useCallback(() => {
    console.log('Paragraph clicked');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 bg-gradient-to-b from-gray-100 to-gray-300">
      <header className="text-center mb-16">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-800">
          Alex Spaulding
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mt-4">
          Professional Software Developer
        </p>
      </header>

      <main className="flex flex-col items-center gap-8">
        <Image
          className="rounded-full border-4 border-gray-300"
          src="/profile.png"
          alt="Profile Picture"
          width={150}
          height={150}
        />
        <p className="text-center text-gray-700 max-w-2xl" onClick={handleParagraphClick}>
          Welcome to my portfolio! I specialize in front-end development with a
          focus on creating engaging and dynamic user experiences. Explore my
          projects and get in touch to learn more about my work.
        </p>
        <div className="flex gap-4 mt-8">
          <a
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
            href="/projects"
          >
            View Projects
          </a>
          <a
            className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition"
            href="#contact"
          >
            Contact Me
          </a>
        </div>
      </main>

      <footer className="mt-16 text-center text-gray-500">
        <p>© 2023 Alex Spaulding. All rights reserved.</p>
      </footer>
    </div>
  );
}
