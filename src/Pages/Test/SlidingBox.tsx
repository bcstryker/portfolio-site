import { useSpring, animated } from '@react-spring/web'

export default function MyComponent({from, to, delay=1000}: {from: number, to: number, delay?: number}) {
  const [springs, api] = useSpring(() => ({
    from: {
        x: from * window.innerWidth,
      },
      to: {
        x: to * window.innerWidth,
      },
      delay: delay,
  }))

  return (
    <animated.div
      style={{
        width: 80,
        height: 80,
        background: '#ff6d6d',
        borderRadius: 8,
        ...springs,
      }}
    />
  )
}