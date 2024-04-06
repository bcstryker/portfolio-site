import React from 'react';
import { useSpring, animated } from '@react-spring/web';

const Role = () => {
  const word = "JACK-OF-ALL-TRADES";
  // Define the animation for each letter
  const [props, set] = useSpring(() => ({ y: -1000, delay: 1000 })); // Start above the view

  React.useEffect(() => {
    set({ y: 0 }); // Animate to the final position
  }, [set]);

  // Calculate start and end angles for the letters to be on the top of the circle
  const startAngle = -90; // Start from the left (9 o'clock)
  const endAngle = 90; // End at the right (3 o'clock)
  const anglePerLetter = (endAngle - startAngle) / (word.length - 1);

  return (
    <div style={{
      position: 'absolute',
      top: '50%', // Align with the top of the circle
      left: '50%',
      width: '60vw', // Width of the circle or container to fit the letters around
      height: '60vw', // Height to make it circular or match your image
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {word.split('').map((letter, index) => (
        <animated.span key={index} style={{
          ...props,
          color: 'white',
          fontSize: '24px',
          position: 'absolute',
          transform: `rotate(${startAngle + index * anglePerLetter}deg) translateY(-30vh)`, // Adjust 'translateY' for distance from center
          transformOrigin: '50% 100%'
        }}>
          {letter}
        </animated.span>
      ))}
    </div>
  );
};

export default Role;
