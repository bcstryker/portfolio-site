import { ParallaxLayer } from '@react-spring/parallax';
import React from 'react';
// import NextPageButton from '../NextPageButton';
import { url } from '../../utils';

interface ContactProps {
    parallax: any;
    navigate: any;
}

const Contact: React.FC<ContactProps> = ({parallax, navigate}) => {
  return (
    <>
      <ParallaxLayer
          speed={.4}
          style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          }}
      >
          <img alt="tmp" src={url("earth")} style={{ width: "60%" }} />
      </ParallaxLayer>
    </>
  );
};

export default Contact;