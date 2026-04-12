import React, { useEffect, useRef, useState } from "react";
import { StyleProp, Text, TextStyle } from "react-native";

interface TypewriterTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  delay?: number;
  speed?: number;
  cursor?: boolean;
  numberOfLines?: number;
}

export function TypewriterText({
  text,
  style,
  delay = 0,
  speed = 60,
  cursor = true,
  numberOfLines,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [cursorOn, setCursorOn] = useState(true);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");
    setCursorOn(true);

    const startTimer = setTimeout(() => {
      const typeNext = () => {
        if (indexRef.current < text.length) {
          indexRef.current++;
          setDisplayed(text.slice(0, indexRef.current));
          timerRef.current = setTimeout(typeNext, speed);
        } else {
          let blinks = 0;
          const blink = () => {
            setCursorOn((v) => !v);
            blinks++;
            if (blinks < 8) {
              blinkRef.current = setTimeout(blink, 340);
            }
          };
          blinkRef.current = setTimeout(blink, 280);
        }
      };
      typeNext();
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (blinkRef.current) clearTimeout(blinkRef.current);
    };
  }, [text, delay, speed]);

  const cursorChar = cursor && cursorOn ? "|" : "";

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {displayed}
      {cursorChar}
    </Text>
  );
}
