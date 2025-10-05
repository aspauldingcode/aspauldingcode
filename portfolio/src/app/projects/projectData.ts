export interface Project {
  id: number;
  title: string;
  description: string;
  images: string[];
  startYear: number;
  endYear?: number; // Optional - if not provided, project is ongoing
  link?: string;
}

export const projects: Project[] = [
  {
    id: 1,
    title: "Dumonds.com",
    images: [
      '/dumonds_slider/about.png',
      '/dumonds_slider/footer.png', 
      '/dumonds_slider/home.png',
      '/dumonds_slider/products.png',
      '/dumonds_slider/search.png',
      '/dumonds_slider/sidebar.png'
    ],
    description: "A custom WordPress website for a Montana furniture company completed in 2018 while working with Wheelbound Productions. The site features over 700 pages and was rebuilt from scratch for optimization. Check my resume for 2018 employment details.",
    startYear: 2018,
    link: "https://dumonds.com"
  },
  {
    id: 2,
    title: "Whisperer", 
    images: [
      '/whisperer_slider/appearence.png',
      '/whisperer_slider/chatGreen.png', 
      '/whisperer_slider/homeRedFlatUI.png',
      '/whisperer_slider/homeSlateGlowUI.png',
      '/whisperer_slider/inputTimeout.png',
      '/whisperer_slider/promptListenBlue.png',
      '/whisperer_slider/selectLanguage.png',
      '/whisperer_slider/selectTTS&Language.png',
      '/whisperer_slider/settingsAPIKey.png'
    ],
    description: "An innovative Apple Watch application leveraging advanced AI technology to enable natural conversation through whispered speech. Built with Swift and SwiftUI, this app combines OpenAI's Whisper for accurate speech recognition with ChatGPT for intelligent responses, allowing users to interact with AI through quiet voice commands. Perfect for discrete AI interactions on the go.",
    startYear: 2024
  },
  {
    id: 3,
    title: "Sentinel High School Computer Building Club",
    images: [
      '/shspcbuildingclub_2018_slider/Computer Building Club.jpg',
      '/shspcbuildingclub_2018_slider/Gatsby advert.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0037.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0038.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0039.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0154.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0157.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0158.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0160.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0162.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0163.jpg',
      '/shspcbuildingclub_2018_slider/IMG_0166.jpg'
    ],
    description: "Founder and Leader of the Computer Building Club at Sentinel High School in Missoula, Montana in 2018. Created flyers, presentations, and interactive disassembly/reassembly sessions for desktops and laptops. Organized fundraising and recruiting booths featuring Rocket League that attracted 40+ incoming freshmen. Taught club members to build a gaming desktop which they successfully sold for $850 at Missoula Computes computer store with Quint Billings. Became the most popular club of 2018 at Sentinel High School.",
    startYear: 2018,
  },
  {
    id: 4,
    title: "Sentinel High School Computer Building Club",
    images: [
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_20190222_152843.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_20190301_154922.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152411.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152506.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152755.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152823.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152909.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152927.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0222_152936.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0301_151733.jpg',
      '/shspcbuildingclub_2019_slider/pcbuildingclub2019_2019_0301_152259.jpg'
    ],
    description: "Founder and Leader of the Computer Building Club at Sentinel High School in 2019. Returned after graduation to lead another successful year of the club in Missoula, Montana. Continued the program's success with hands-on computer assembly training, technical workshops, and community building activities. Taught club members to build a gaming desktop which they successfully sold for $850 at Missoula Computes computer store with Quint Billings. The club maintained its status as one of the most popular clubs at Sentinel High School for the second consecutive year. Since stepping down from the club, Computer Building is now offered as an actual class at Sentinel High School, undoubtedly inspired by the passion and success of this program.",
    startYear: 2019,
  },
  {
    id: 5,
    title: "Apple Sharpener",
    images: [
      '/applesharpener_slider/apple_sharpener_preview.png'
    ],
    description: "A macOS tweak that programmatically removes window corner radius to achieve clean, square corners on all application windows. Built for use with the Ammonia injection system, it uses method swizzling to modify window behavior while preserving rounded corners for context menus and system UI elements. Compatible with both Intel and Apple Silicon Macs.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/apple-sharpener"
  },
  {
    id: 6,
    title: "Modern Orange Band",
    images: [
      '/modernorange_slider/modernorangeband_forester_tollefson_apartment_1.jpg',
      '/modernorange_slider/modernorangeband_forester_tollefson_apartment_2.jpg',
      '/modernorange_slider/modernorangeband_spacetion_album_painting_1.jpg',
      '/modernorange_slider/modernorangeband_spacetion_album_painting_2.jpg',
      '/modernorange_slider/owen_alex_modernorangeband.jpg',
      '/modernorange_slider/spacetion_pt_2_coverart_modernorangeband.jpg'
    ],
    description: "Modern Orange Band is a creative musical project featuring original compositions and artistic collaborations. The project includes album artwork, live performances, and creative visual content that blends music with visual arts. This showcases artistic versatility and creative project management skills in the music and entertainment industry.",
    startYear: 2019,
    endYear: 2023
  },
  {
    id: 7,
    title: "PlatformChat",
    images: [
      '/platformchat_slider/Demo_Java.png',
      '/platformchat_slider/Demo_iOS.png'
    ],
    description: "A lightweight Minecraft Bukkit/Spigot plugin that enhances chat functionality by supporting both Java and Bedrock players through Floodgate integration. Features configurable chat formats, PlaceholderAPI support for dynamic placeholders, and color-coded messages that differentiate between Java and Bedrock editions. Built with a focus on simplicity and efficiency, avoiding heavy plugin dependencies while providing essential cross-platform chat enhancements for Minecraft servers.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/PlatformChat"
  },
  {
    id: 8,
    title: "TintedThemingSwift",
    images: [
      '/tintedthemingswift_slider/TintedThemingSwift_preview1.png',
      '/tintedthemingswift_slider/TintedThemingSwift_preview2.png'
    ],
    description: "A comprehensive Swift package for working with Base16 and Base24 color themes, providing easy access to a wide variety of color schemes for iOS, macOS, watchOS, and tvOS applications. Features complete Base16/Base24 theme support, network theme loading, semantic color mappings, and seamless SwiftUI integration. Built as a Swift API implementation for the TintedTheming/Schemes project, offering multi-platform compatibility and modern Swift development practices.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/TintedThemingSwift"
  },
  {
    id: 9,
    title: "TintedMac",
    images: [
      '/tintedmac_slider/TintedMac_Preview1.png',
      '/tintedmac_slider/TintedMac_Preview2.png',
      '/tintedmac_slider/TintedMac_Preview3.png',
      '/tintedmac_slider/TintedMac_Preview4.png'
    ],
    description: "A custom macOS tweak that applies Base16 color schemes to customize the appearance of macOS windows system-wide. Features over 290 built-in color schemes, a standalone GUI configurator application, blacklist support for excluding specific applications, and SIMBL-compatible injection for seamless integration. Requires disabling System Integrity Protection (SIP) and uses the Ammonia injection framework for system-wide window tinting capabilities.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/TintedMac"
  },
  {
    id: 10,
    title: "YeetBar",
    images: ["/yeetbar_slider/Yeetbar_preview.png"],
    description: "A macOS utility designed to remove window titlebars, providing a cleaner interface and maximizing screen real estate. YeetBar is a system-level tweak that integrates seamlessly with macOS, allowing users to enjoy a more minimalist desktop experience by eliminating unnecessary UI elements. This work-in-progress project focuses on creating a lightweight solution with minimal system overhead while maintaining full compatibility with macOS window management.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/Yeetbar"
  },
  {
    id: 11,
    title: "iproute2-pretty",
    images: ["/iproute2pretty_slider/iproute2_preview.png"],
    description: "A command-line utility that transforms the raw output of the 'ip a' command into a clean, formatted table for better readability. Built in C with a modular design, iproute2-pretty parses network interface information and renders it with color-coded output, making it easier to understand network configurations. The tool displays key information including interface names, MAC addresses, IPv4/IPv6 addresses, interface status, and MTU values in an organized, user-friendly format.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/iproute2-pretty"
  },
  {
    id: 12,
    title: "aspauldingcode.com Portfolio",
    images: [
      "/aspauldingcode_slider/aspauldingcode_preview1.png",
      "/aspauldingcode_slider/aspauldingcode_preview2.png",
      "/aspauldingcode_slider/aspauldingcode_preview3.png",
      "/aspauldingcode_slider/aspauldingcode_preview4.png",
      "/aspauldingcode_slider/aspauldingcode_preview5.png",
      "/aspauldingcode_slider/aspauldingcode_preview6.png",
      "/aspauldingcode_slider/aspauldingcode_preview7.png"
    ],
    description: "A modern, responsive Next.js portfolio website featuring a unique swipe-through interface inspired by dating apps. Built with React and showcasing my Front-End React JS Developer certification from 2020, this open-source portfolio adapts seamlessly across all screen sizes and devices. The project incorporates advanced technologies including Nix Flake for development environment management and LaTeX for automated resume generation, demonstrating proficiency in both modern web development and DevOps practices.",
    startYear: 2024,
    link: "https://github.com/aspauldingcode/aspauldingcode"
  }
];
