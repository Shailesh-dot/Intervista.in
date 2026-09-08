import { motion } from "framer-motion";

export default function BlurText({ 
  text, 
  className = "", 
  variant = "word", // "letter" or "word"
  delay = 0, 
  stagger = 0.1,
  duration = 0.8,
  blur = "10px"
}) {
  const items = variant === "word" ? text.split(" ") : text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: stagger, 
        delayChildren: delay,
      },
    },
  };

  const child = {
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        duration: duration,
        ease: "easeOut"
      },
    },
    hidden: {
      opacity: 0,
      filter: `blur(${blur})`,
      y: 10,
    },
  };

  return (
    <motion.span
      style={{ display: "inline-block" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {items.map((item, index) => (
        <motion.span
          variants={child}
          style={{ display: "inline-block", whiteSpace: "pre" }}
          key={index}
        >
          {item}{variant === "word" ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
