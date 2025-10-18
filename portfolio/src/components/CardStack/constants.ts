// Swipe and interaction constants
export const SWIPE_THRESHOLD = 75; // Reduced for easier swiping
export const ROTATION_FACTOR = 0.15; // Increased for more responsive rotation
export const MAX_ROTATION = 20; // Increased max rotation

// Playing card aspect ratio constants (2.5:3.5 = 5:7)
export const CARD_ASPECT_RATIO = 5 / 7; // Width to height ratio
export const BASE_CARD_WIDTH = 320; // Base width in pixels
export const BASE_CARD_HEIGHT = BASE_CARD_WIDTH / CARD_ASPECT_RATIO; // 448px (maintains 5:7 ratio)

// Max card dimensions - 500px maximum for both orientations
export const MAX_CARD_DIMENSION_PX = 500; // Maximum dimension (height for portrait, width for landscape)
export const MAX_PORTRAIT_HEIGHT = MAX_CARD_DIMENSION_PX; // 500px
export const MAX_PORTRAIT_WIDTH = MAX_PORTRAIT_HEIGHT * CARD_ASPECT_RATIO; // ~357px
export const MAX_LANDSCAPE_WIDTH = MAX_CARD_DIMENSION_PX; // 500px  
export const MAX_LANDSCAPE_HEIGHT = MAX_LANDSCAPE_WIDTH / CARD_ASPECT_RATIO; // ~700px, but capped by width

// Threshold for switching to overlay mode when cards become too small
export const OVERLAY_MODE_THRESHOLD = 200; // Switch to overlay when height < 200px

// Animation constants
export const CARD_TRANSITION_DURATION = 300; // milliseconds
export const SPAWN_ANIMATION_DURATION = 400; // milliseconds
export const SWIPE_ANIMATION_DURATION = 300; // milliseconds

// Stack configuration
export const VISIBLE_CARDS_COUNT = 3; // Number of cards visible in the stack
export const CARD_STACK_OFFSET = 8; // Vertical offset between stacked cards
export const CARD_SCALE_DECREMENT = 0.05; // Scale reduction for each card in the stack
export const CARD_ROTATION_INCREMENT = 2; // Rotation increment for each card in the stack