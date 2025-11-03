export const fadeIn = (delay = '0s') => ({
  animationName: 'fadeIn',
  animationDuration: '1s',
  animationTimingFunction: 'ease-out',
  animationDelay: delay,
  animationFillMode: 'forwards',
  opacity: 0
});

export const drawLine = (delay = '0s') => ({
  animationName: 'drawLine',
  animationDuration: '12s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationDelay: delay
});


export const fadePin = (delay = '0s') => ({
  animationName: 'fadePin',
  animationDuration: '12s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationDelay: delay
});

export const spinAnimation = {
  animationName: 'spin',
  animationDuration: '60s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite'
};

export const typingAnimation = {
  animationName: 'typing, blink',
  animationDuration: '2s, 0.75s',
  animationTimingFunction: 'steps(10, end), step-end',
  animationDelay: '0s, 2s',
  animationIterationCount: '1, 3',
  animationDirection: 'normal, normal',
  animationFillMode: 'both, both'
};
