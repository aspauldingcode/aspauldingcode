'use client';

import React from 'react';
import Slider from 'react-slick';
import Image from 'next/image';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface ProjectModalSliderProps {
  images: string[];
  title: string;
}

// Custom styles for carousel dots and animations
const customDotsStyle = `
  .custom-dots {
    bottom: 15px !important;
  }
  .custom-dots li button:before {
    font-size: 10px !important;
    color: rgba(255, 255, 255, 0.5) !important;
  }
  .custom-dots li.slick-active button:before {
    color: rgba(255, 255, 255, 0.9) !important;
  }
  @keyframes horizontal-bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateX(0) translateY(-50%);
    }
    40% {
      transform: translateX(4px) translateY(-50%);
    }
    60% {
      transform: translateX(2px) translateY(-50%);
    }
  }
`;

export default function ProjectModalSlider({ images, title }: ProjectModalSliderProps) {
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    dotsClass: 'slick-dots custom-dots',
    pauseOnHover: true,
    adaptiveHeight: true,
    fade: true,
    cssEase: 'linear',
  };

  return (
    <>
      <style jsx>{customDotsStyle}</style>
      <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden bg-base02">
        {images.length === 1 ? (
          <Image
            src={images[0]}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <Slider {...sliderSettings}>
            {images.map((image, index) => (
              <div key={index} className="relative w-full h-64 md:h-80 lg:h-96">
                <Image
                  src={image}
                  alt={`${title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </Slider>
        )}
      </div>
    </>
  );
}