import { IParallax, Parallax, ParallaxLayer } from "@react-spring/parallax";
import { useRef, useState, useEffect } from "react";
import styles from './Portfolio.module.css';
import SlidingLetter from "./SlidingLetter";

export default function Portfolio() {
  const parallax = useRef<IParallax>(null!)
  const word = "BRANDON STRYKER";
  const [imageDiameter, setImageDiameter] = useState(0);

  useEffect(() => {
    setImageDiameter(window.innerWidth * 0.3);
  }, []);

  return (
    <div className='w-full h-full bg-moonstone'>
      <Parallax ref={parallax} pages={2}>
        <ParallaxLayer
          offset={0}
          speed={-5}
          factor={1}
          onClick={() => parallax.current.scrollTo(.5)}
          className="bg-delft_blue flex items-center justify-center"
        >
          <img src="me.png" alt="Me" className="block w-[30%] rounded-full" />
        </ParallaxLayer>

        {word.split('').map((letter, index, { length }) => {
          console.log('letter:', letter, 'index:', index, 'length:', length, 1 + Math.abs(length - index - 1) / length);
          const midIndex = (length - 1) / 2;
          // Calculate the distance from the middle (squared for more dramatic effect)
          const distanceFromMiddle = Math.pow(index - midIndex, 4);
          // Use the distance to set the speed, normalizing it to keep within a reasonable range
          const speed = 1 + distanceFromMiddle / Math.pow(midIndex, 2); // You can adjust this formula for more dramatic effect
          return (
            <ParallaxLayer key={letter + index} offset={0.45} speed={speed}>
              <div style={{ width: `${100 / length}%`, display: 'flex', justifyContent: 'center' }}>
                <SlidingLetter
                  letter={letter}
                  index={index}
                  length={length}
                  imageDiameter={imageDiameter}
                />
              </div>
            </ParallaxLayer>
          );
        })}
      </Parallax>
    </div>
  );
}
