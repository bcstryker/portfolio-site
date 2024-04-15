import { ParallaxLayer } from "@react-spring/parallax";
import SlidingLetter from "./SlidingLetter";

export default function MyName({imageDiameter}: { imageDiameter: number}) {
    const word = "BRANDON STRYKER";
    
    return (
      <>
        {word.split('').map((letter, index, { length }) => {
          console.log('letter:', letter, 'index:', index, 'length:', length, 1 + Math.abs(length - index - 1) / length);
          const midIndex = (length - 1) / 2;
          // Calculate the distance from the middle (squared for more dramatic effect)
          const distanceFromMiddle = Math.pow(index - midIndex, 4);
          // Use the distance to set the speed, normalizing it to keep within a reasonable range
          const speed = 1 + distanceFromMiddle / Math.pow(midIndex, 2); // You can adjust this formula for more dramatic effect
          // make speed a random number either between -10 and -5 or 1 and 10
          // const speed = Math.random() < 0.5 ? Math.random() * 5 + 1 : Math.random() * 5 - 10;
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
      </>
    )
}