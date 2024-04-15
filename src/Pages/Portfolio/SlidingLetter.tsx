import { useSprings, animated } from '@react-spring/web';

export default function SlidingLetter({
  letter, index, length, imageDiameter
}: {
  letter: string,
  index: number,
  length: number,
  imageDiameter: number
}) {
  // Constants for circular movement
  const circleRadius = imageDiameter * 0.75;
  const circleCenterX = window.innerWidth * 0.49; // Adjusted to where the image seems to be centered
  const circleCenterY = imageDiameter * 0.15; // Vertical position based on image and desired circle position

  // Calculate final positions for each letter based on the circle
  const angle = 180 + (index * (180 / (length - 1))); // Angle for each letter around the top of the circle
  const finalX = circleCenterX + circleRadius * Math.cos(angle * Math.PI / 180) - 40; // Subtract half of letter width for centering
  const finalY = circleCenterY + circleRadius * Math.sin(angle * Math.PI / 180) - 40; // Subtract half of letter height for centering
  const finalRotate = angle + 90; // Adjust the rotation so 'down' is towards the center of the circle, flipped by 180 degrees

  // useSprings to handle the animations
  const [animations] = useSprings(length, i => ({
    from: { x: window.innerWidth / 2, y: 0, rotateZ: 0 }, // Start above the viewport, centered horizontally
    to: {
      x: finalX,
      y: finalY,
      rotateZ: finalRotate
    },
    delay: 1000 + 100 * i, // Delay each letter slightly to create a sequence
    config: { tension: 20, friction: 10 } // Adjust for a smoother animation feel
  }));

  // Render the animated component
  return (
    <animated.div
  style={{
    width: 80,
    height: 80,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    backgroundColor: 'transparent',
    ...animations[index],
  }}
>
  <p style={{
      color: 'white',
      fontSize: '4rem',
      textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4), 0 0 40px #9500ff, 0 0 70px #9500ff, 0 0 80px #9500ff, 0 0 100px #9500ff'
  }}>
    {letter}
  </p>
</animated.div>
    // <animated.div
    //   style={{
    //     width: 80,
    //     height: 80,
    //     display: 'flex',
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     position: 'absolute',
    //     ...animations[index],
    //   }}
    // >
    //   <p className={styles.myName}>{letter}</p>
    // </animated.div>
  );
}
