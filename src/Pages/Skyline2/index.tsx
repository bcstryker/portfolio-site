import { IParallax, Parallax, ParallaxLayer } from "@react-spring/parallax"
import { useRef } from "react"
import { useNavigate } from 'react-router-dom';
import MenuBar from "./Components/MenuBar";
import Landing from "./Components/Layers/Landing";
import Training from "./Components/Layers/Training";
import Services from "./Components/Layers/Services";
import Contact from "./Components/Layers/Contact";
import About from "./Components/Layers/About";

export default function Skyline2() {
  const parallax = useRef<IParallax>(null!)
  const navigate = useNavigate();
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: 'radial-gradient(circle, #00002E 30%, #000016 70%, #000000)'
  }}>
      <Parallax ref={parallax} pages={5}>
        <ParallaxLayer offset={0} speed={0} sticky={{start: 0, end: 6}}>
          <MenuBar parallax={parallax}/>
        </ParallaxLayer>
        <Landing parallax={parallax} />
        <ParallaxLayer offset={1} speed={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Training parallax={parallax} />
        </ParallaxLayer>
        <ParallaxLayer offset={2} speed={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Services parallax={parallax} />
        </ParallaxLayer>
        <ParallaxLayer offset={2} speed={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <About parallax={parallax} />
        </ParallaxLayer>
        <ParallaxLayer offset={4} speed={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Contact parallax={parallax} navigate={navigate}/>  
        </ParallaxLayer>
      </Parallax>
    </div>
  )
}