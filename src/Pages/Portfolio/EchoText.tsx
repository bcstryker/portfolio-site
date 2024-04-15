import { useSpring, animated } from '@react-spring/web';
import './styles.css';

const EchoText = () => {
  const text = "WEB DESIGNER";
  const colors = [
    'white',
    'rgba(149, 0, 255, 0.8)',
    'rgba(149, 0, 255, 0.6)',
    'rgba(149, 0, 255, 0.4)',
    'rgba(149, 0, 255, 0.2)',
  ];

  return (
    <div className='echo-container'>
        {colors.map((color, index) => (
          <div
            key={index}
            className='echo-text'
            style={{
              color: colors[index],
              transform: `translate(${-5 * index}px, ${-5 * index}px)`,
              zIndex: colors.length - index,
            }}
          >
            {text}
          </div>
        ))}
      </div>
  );
};

const WebDeveloper = () => {
  // Define the animation properties
  const props = useSpring({
    from: { transform: 'translateY(-200%) scale(0.25)', opacity: 0 },
    to: { transform: 'translateY(20%) scale(1.5)', opacity: 1 },
    delay: 3000,
    config: { mass: 1, tension: 10, friction: 12 }
  });

  return (
    <animated.div style={{
      ...props,
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
        <EchoText />
    </animated.div>
  );
};

export default WebDeveloper;
