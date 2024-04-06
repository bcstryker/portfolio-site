import { useSprings, animated } from '@react-spring/web';
import styles from './Portfolio.module.css';

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
    from: { x: window.innerWidth / 2, y: -1000, rotateZ: 0 }, // Start above the viewport, centered horizontally
    to: {
      x: finalX,
      y: finalY,
      rotateZ: finalRotate
    },
    delay: 1000 + 100 * i, // Delay each letter slightly to create a sequence
    config: { tension: 280, friction: 60 } // Adjust for a smoother animation feel
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
        ...animations[index],
      }}
    >
      <p className={styles.myName}>{letter}</p>
    </animated.div>
  );
}
