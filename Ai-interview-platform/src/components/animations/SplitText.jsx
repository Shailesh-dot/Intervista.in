import { motion } from "framer-motion";

export default function SplitText({ 
  text, 
  className = "", 
  variant = "letter", // "letter" or "word"
  delay = 0, 
  stagger = 0.05,
  duration = 0.5 
}) {
  const items = variant === "word" ? text.split(" ") : text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { 
        staggerChildren: stagger, 
        delayChildren: delay * i,
      },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
        duration: duration
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.span
      style={{ display: "inline-block", overflow: "hidden" }}
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
