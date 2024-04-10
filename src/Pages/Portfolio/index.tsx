import { IParallax, Parallax, ParallaxLayer } from "@react-spring/parallax";
import { useRef, useState, useEffect } from "react";
import styles from './Portfolio.module.css';
import ItalianFlag from "./ItalianFlag";
import MyName from "./MyName";
import { useSprings, animated } from "@react-spring/web";
import Skyline from "./Skyline";

export default function Portfolio() {
  const parallax = useRef<IParallax>(null!)

  const [imageDiameter, setImageDiameter] = useState(0);
  
  useEffect(() => {
      setImageDiameter(window.innerWidth * 0.3);
  }, []);

  const [showFlag, setShowFlag] = useState(false);

  // Define the springs for the flag animation, initially off-screen
  const [springs, api] = useSprings(3, i => ({
    from: { x: -1000 },
    config: { tension: 280, friction: 60 }
  }));

  // Start the animation when the flag is visible
  const triggerAnimation = () => {
    setShowFlag(true);
    api.start({ x: 0 });
  };


  return (
    <div className='w-full h-full bg-azure'>
      {/* <Parallax ref={parallax} pages={2}>
        <ParallaxLayer
          offset={0}
          speed={-5}
          factor={1}
          onClick={() => parallax.current.scrollTo(.5)}
          className="bg-delft_blue flex items-center justify-center"
        >
          <img src="me.png" alt="Me" className="block w-[30%] rounded-full" />
        </ParallaxLayer>

        <MyName imageDiameter={imageDiameter}/>
        <ParallaxLayer offset={1} speed={1.2} onScroll={triggerAnimation}>
            <ItalianFlag />
        </ParallaxLayer>

        <ParallaxLayer offset={1} speed={0.5} onScroll={triggerAnimation}>
          {springs.map((props, i) => (
            <animated.div
              key={i}
              style={{
                transform: props.x.to(x => `translateX(${x}%)`),
                width: '33.3%',
                height: '100vh',
                position: 'absolute',
                left: `${i * 33.3}%`,
                backgroundColor: i === 0 ? 'green' : i === 1 ? 'white' : 'red',
              }}
            />
          ))}
        </ParallaxLayer>
      </Parallax> */}
      {/* <Parallax ref={parallax} pages={3}>
        <ParallaxLayer offset={0} speed={.2} onClick={() => parallax.current.scrollTo(1)}>
          <SteamyMountains />
        </ParallaxLayer>
      </Parallax> */}
      <Skyline />
    </div>
  );
}