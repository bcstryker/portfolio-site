import { IParallax, Parallax, ParallaxLayer } from "@react-spring/parallax";
import { useRef, useState, useEffect } from "react";
import MyName from "./MyName";
import Sun from "./Sun";
import WebDeveloper from "./EchoText";

export default function Portfolio() {
  const parallax = useRef<IParallax>(null!)

  const [imageDiameter, setImageDiameter] = useState(0);

  useEffect(() => {
    setImageDiameter(window.innerWidth * 0.3);
  }, []);

  return (
    <div className='w-full h-full bg-azure'>
      {/* <p>Nothing Here.</p> */}
      <Parallax ref={parallax} pages={2}>
        <ParallaxLayer
          offset={0}
          speed={-5}
          factor={1}
          onClick={() => parallax.current.scrollTo(1)}
          className="bg-slate-950"
        />
        <ParallaxLayer
          offset={0}
          speed={0}
          factor={2}
          style={{
            backgroundImage: url('stars', true),
            backgroundSize: 'cover',
          }}
        />
        <MyName imageDiameter={imageDiameter} />
        <ParallaxLayer offset={.7} speed={-5}>
          <WebDeveloper />
        </ParallaxLayer>
        <ParallaxLayer
          offset={0}
          speed={-5}
          factor={1}
          onClick={() => parallax.current.scrollTo(1)}
          className="flex items-center justify-center"
        >
          <img src="BS1.png" alt="Me" className="block w-[30%] rounded-full" />
        </ParallaxLayer>

        <ParallaxLayer offset={1} speed={0.5} style={{ opacity: 0.1 }}>
          <img alt="cloud" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '70%' }} />
        </ParallaxLayer>
        <ParallaxLayer offset={1} speed={0.5} style={{ opacity: 0.1 }}>
          <img alt="cloud" src={url('cloud')} style={{ display: 'block', width: '30%', marginLeft: '10%', marginTop: '5%' }} />
        </ParallaxLayer>
        <ParallaxLayer id="sun" offset={0.75} speed={0.2}>
          <Sun />
        </ParallaxLayer>
        <ParallaxLayer 
          id="day1"
          offset={1}
          speed={0.5}
          onClick={() => parallax.current.scrollTo(0)}
        />

      </Parallax>
    </div>
  );
}
const url = (name: string, wrap = false) =>
  `${wrap ? 'url(' : ''}https://awv3node-homepage.surge.sh/build/assets/${name}.svg${wrap ? ')' : ''}`