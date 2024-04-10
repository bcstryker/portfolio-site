import { useSprings, animated } from '@react-spring/web';

export default function ItalianFlag() {
  // Assuming you want to animate two sections (for a full flag, consider three)
  const [springs, api] = useSprings(3, i => ({
    from: { transform: `translateX(${i % 2 === 0 ? -100 : 100}%)` },
    to: { transform: 'translateX(0%)' },
    config: { tension: 280, friction: 60 }
  }));

  return (
    <>
      {springs.map((props, i) => (
        <animated.div
          key={i}
          style={{
            ...props,
            width: '33.3%',
            height: '100vh', // Assuming full viewport height for demonstration
            position: 'absolute',
            left: `${i * 33.3}%`, // Position each "stripe" of the flag
            backgroundColor: i === 0 ? 'green' : i === 1 ? 'white' : 'red', // Italian flag colors
          }}
        />
      ))}
    </>
  );
}
