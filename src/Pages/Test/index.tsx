import React, { useRef } from 'react'
import { Parallax, ParallaxLayer, IParallax } from '@react-spring/parallax'
import styles from './styles.module.css'
import SlidingBox from './SlidingBox'

export default function Test() {
  const parallax = useRef<IParallax>(null!)

  const scroll = (to: number) => {
    if (parallax.current) {
      parallax.current.scrollTo(to)
    }
  }
  return (
    <div style={{ width: '100%', height: '100%', background: '#253237' }}>
      <Parallax ref={parallax} pages={3}>
        <ParallaxLayer offset={0} speed={-.2} factor={1} style={{ backgroundColor: '#253237'}}>
          <div style={{display: 'flex', alignItems: 'center', height: '100%'}}>
            <SlidingBox from={-.5} to={.1} delay={1500}/>
            <SlidingBox from={-.5} to={.2} delay={1400}/>
            <SlidingBox from={-.5} to={.3} delay={1300}/>

            <SlidingBox from={-.5} to={.4} delay={1200}/>
            <SlidingBox from={-.5} to={.5} delay={1100}/>
            <SlidingBox from={-.5} to={.6} delay={1000}/>
          </div>
        </ParallaxLayer>
        <ParallaxLayer offset={1} speed={1} style={{ backgroundColor: '#805E73' }} />
        <ParallaxLayer offset={2} speed={1} style={{ backgroundColor: '#87BCDE' }} />

        <ParallaxLayer
          offset={0}
          speed={0}
          factor={3}
          style={{
            backgroundImage: url('stars', true),
            backgroundSize: 'cover',
          }}
        />

        <ParallaxLayer offset={1.3} speed={-0.3} style={{ pointerEvents: 'none' }}>
          <img alt="tmp" src={url('satellite4')} style={{ width: '15%', marginLeft: '70%' }} />
        </ParallaxLayer>

        <ParallaxLayer offset={1} speed={0.8} style={{ opacity: 0.1 }}>
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '55%' }} />
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '10%', marginLeft: '15%' }} />
        </ParallaxLayer>

        <ParallaxLayer offset={1.75} speed={0.5} style={{ opacity: 0.1 }}>
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '70%' }} />
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '40%' }} />
        </ParallaxLayer>

        <ParallaxLayer offset={1} speed={0.2} style={{ opacity: 0.2 }}>
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '10%', marginLeft: '10%' }} />
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '75%' }} />
        </ParallaxLayer>

        <ParallaxLayer offset={1.6} speed={-0.1} style={{ opacity: 0.4 }}>
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '60%' }} />
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '25%', marginLeft: '30%' }} />
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '10%', marginLeft: '80%' }} />
        </ParallaxLayer>

        <ParallaxLayer offset={2.6} speed={0.4} style={{ opacity: 0.6 }}>
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '20%', marginLeft: '5%' }} />
          <img alt="tmp" src={url('cloud')} style={{ display: 'block', width: '15%', marginLeft: '75%' }} />
        </ParallaxLayer>

        <ParallaxLayer
          offset={2.5}
          speed={-0.4}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
          <img alt="tmp" src={url('earth')} style={{ width: '60%' }} />
        </ParallaxLayer>

        <ParallaxLayer
          offset={2}
          speed={-0.3}
          style={{
            backgroundSize: '80%',
            backgroundPosition: 'center',
            backgroundImage: url('clients', true),
          }}
        />

        <ParallaxLayer
          offset={1}
          speed={0.1}
          onClick={() => parallax.current.scrollTo(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <img alt="tmp" src={url('server')} style={{ width: '20%' }} />
        </ParallaxLayer>

        <ParallaxLayer
          offset={1}
          speed={0.1}
          onClick={() => parallax.current.scrollTo(2)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <img alt="tmp" src={url('bash')} style={{ width: '40%' }} />
        </ParallaxLayer>

        <ParallaxLayer
          offset={2}
          speed={-0}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => parallax.current.scrollTo(0)}>
          <img alt="tmp" src={url('clients-main')} style={{ width: '40%' }} />
        </ParallaxLayer>
      </Parallax>
    </div>
  )
}

const url = (name: string, wrap = false) =>
  `${wrap ? 'url(' : ''}https://awv3node-homepage.surge.sh/build/assets/${name}.svg${wrap ? ')' : ''}`