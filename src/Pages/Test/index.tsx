import * as React from 'react';
import { useScroll, animated, useSpring } from '@react-spring/web';
import styles from './styles.module.css';

const X_LINES = 40;
const PAGE_COUNT = 5;
const INITIAL_WIDTH = 20;

export default function Zoomies() {
  const containerRef = React.useRef<HTMLDivElement>(null!);

  const [text1Styles, text1Api] = useSpring(() => ({
    y: '100%',
  }));
  const [text2Styles, text2Api] = useSpring(() => ({
    y: '100%',
  }));
  const [text3Styles, text3Api] = useSpring(() => ({
    y: '100%',
  }));

  const { scrollYProgress } = useScroll({
    container: containerRef,
    onChange: ({ value: { scrollYProgress } }) => {
      let screen1 = scrollYProgress >= 0.3 && scrollYProgress < 0.6;
      let screen2 = scrollYProgress >= 0.6 && scrollYProgress < 0.9;
      let screen3 = scrollYProgress >= 0.9;
  
      if (screen1) {
        text1Api.start({ y: '0' }); // Show text for room1
        text2Api.start({ y: '100%' }); // Hide text for room2
        text3Api.start({ y: '100%' }); // Hide text for room3
      } else if (screen2) {
        text1Api.start({ y: '100%' }); // Hide text for room1
        text2Api.start({ y: '0' }); // Show text for room2
        text3Api.start({ y: '100%' }); // Hide text for room3
      } else if (screen3) {
        text1Api.start({ y: '100%' }); // Hide text for room1
        text2Api.start({ y: '100%' }); // Hide text for room2
        text3Api.start({ y: '0' }); // Show text for room3
      } else {
        // Ensure all text is hidden if none of the conditions are met
        text1Api.start({ y: '100%' });
        text2Api.start({ y: '100%' });
        text3Api.start({ y: '100%' });
      }
    },
    default: {
      immediate: true,
    },
  });
  

  const rect1 = scrollYProgress.to([0, 0.33, 0.66, 1], [100, 0, 0, 0]);
  const rect2 = scrollYProgress.to([0, 0.33, 0.66, 1], [100, 100, 0, 0]);
  const rect3 = scrollYProgress.to([0, 0.33, 0.66, 1], [100, 100, 100, 0]);
//   const trapezoidOpacity = rect1.to(size => size < 100 ? 1 : 0);

  return (
    <div ref={containerRef} className={styles.body}>
      <div className={styles.animated__layers}>
        <animated.div className={styles.bar__container}>
          {Array.from({ length: X_LINES }).map((_, i) => (
            <animated.div
              key={i}
              className={styles.bar}
              style={{
                width: scrollYProgress.to(scrollP => {
                  const percentilePosition = (i + 1) / X_LINES;
                  return INITIAL_WIDTH / 4 + 40 * Math.cos(((percentilePosition - scrollP) * Math.PI) / 1.5) ** 32;
                }),
              }}
            />
          ))}
        </animated.div>
        {/* Trapezoid */}
        {/* <animated.div
          className={styles.trapezoid}
          style={{
            opacity: trapezoidOpacity, // Show the trapezoid as room1 disappears
          }}
        /> */}
        <animated.div
          className={styles.room1}
          style={{
            clipPath: rect1.to(size => `inset(${size}% ${size}%)`),
          }}
        >
          <h1 className={styles.title}>
            <span>
              <animated.span style={text1Styles}>Aha!</animated.span>
            </span>
            <span>
              <animated.span style={text1Styles}>You found me!</animated.span>
            </span>
          </h1>
        </animated.div>
        <animated.div
          className={styles.room2}
          style={{
            clipPath: rect2.to(size => `inset(${size}% ${size}%)`),
          }}
        >
            <h1 className={styles.title}>
            <span>
              <animated.span style={text2Styles}>Oh no!</animated.span>
            </span>
            <span>
              <animated.span style={text2Styles}>You found me again!</animated.span>
            </span>
          </h1>
        </animated.div>
        <animated.div
          className={styles.room3}
          style={{
            clipPath: rect3.to(size => `inset(${size}% ${size}%)`),
          }}
        >
            <h1 className={styles.title}>
            <span>
              <animated.span style={text2Styles}>Shucks!</animated.span>
            </span>
            <span>
              <animated.span style={text2Styles}>I'm bad at hiding...</animated.span>
            </span>
          </h1>
        </animated.div>
      </div>
      {new Array(PAGE_COUNT).fill(null).map((_, index) => (
        <div className={styles.full__page} key={index} />
      ))}
    </div>
  );
}
