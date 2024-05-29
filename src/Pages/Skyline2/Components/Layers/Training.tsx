import { ParallaxLayer } from "@react-spring/parallax";
import React from "react";
import "../styles.css";

interface TrainingProps {
  parallax: any;
}

const Training: React.FC<TrainingProps> = ({ parallax }) => {
  return (
    <>
      {/* <ParallaxLayer
        offset={-.25}
        speed={1}
        onClick={() => parallax.current.scrollTo(2)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "left",
        }}
      >
        <div className="steel-div" style={{marginLeft: "10%"}}>
          <span className="etched-text">TRAINING</span>
        </div>
      </ParallaxLayer> */}
      <ParallaxLayer
        offset={-0.05}
        speed={.9}
        onClick={() => parallax.current.scrollTo(2)}
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <img alt="tmp" src={'online-learning.svg'} style={{ width: "40%", marginLeft: "15%" }} />
      </ParallaxLayer>
      <ParallaxLayer speed={.5} style={{ opacity: 0.1 }}>
        <img
          alt="tmp"
          src={url("cloud")}
          style={{ display: "block", width: "20%", marginLeft: "40%" }}
        />
        <img
          alt="tmp"
          src={url("cloud")}
          style={{ display: "block", width: "15%", marginLeft: "15%" }}
        />
      </ParallaxLayer>
      <ParallaxLayer
        speed={.6}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img alt="tmp" src={'road-to-knowledge.svg'} style={{ width: "20%", marginLeft: "40%" }} />
      </ParallaxLayer>
    </>
  );
};

const url = (name: string, wrap = false) =>
  `${wrap ? "url(" : ""}https://awv3node-homepage.surge.sh/build/assets/${name}.svg${
    wrap ? ")" : ""
  }`;

export default Training;
