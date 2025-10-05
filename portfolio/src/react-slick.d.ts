declare module 'react-slick' {
  import { Component, ReactNode } from 'react';

  interface Settings {
    dots?: boolean;
    infinite?: boolean;
    speed?: number;
    slidesToShow?: number;
    slidesToScroll?: number;
    autoplay?: boolean;
    autoplaySpeed?: number;
    swipe?: boolean;
    touchMove?: boolean;
    arrows?: boolean;
    afterChange?: (current: number) => void;
    children?: ReactNode;
    // Add more settings as needed
  }

  export default class Slider extends Component<Settings> {}
}
