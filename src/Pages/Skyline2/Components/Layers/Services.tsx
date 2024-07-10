import { ParallaxLayer } from "@react-spring/parallax";
import React from "react";
import SectionTitle from "../SectionTitle";

interface ServicesProps {
  parallax: any;
}

const Services: React.FC<ServicesProps> = ({ parallax }) => {
  return (
    <>
      <ParallaxLayer
        offset={-0.1}
        speed={1}
        style={{
          display: "flex",
          alignItems: "center",
          marginLeft: "10%",
        }}
      >
        <SectionTitle title="Services" />
      </ParallaxLayer>
      <ParallaxLayer speed={1.4}>
        <img
          alt="engineering"
          src={"software-engineer.svg"}
          style={{ width: "40%", marginLeft: "20%" }}
        />
      </ParallaxLayer>
      {/* <ParallaxLayer offset={.5} speed={1} style={{ opacity: 0.6 }}>
        <img
          alt="tmp"
          src={url("cloud")}
          style={{ display: "block", width: "20%", marginLeft: "5%" }}
        />
        <img
          alt="tmp"
          src={url("cloud")}
          style={{ display: "block", width: "15%", marginLeft: "75%" }}
        />
      </ParallaxLayer> */}
      <ParallaxLayer offset={0.2} speed={0.8}>
        <img
          alt="iteration"
          src={"product-iteration.svg"}
          style={{ width: "35%", marginLeft: "50%" }}
        />
      </ParallaxLayer>
    </>
  );
};

export default Services;
