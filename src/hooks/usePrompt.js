// usePrompt.js
import { useContext } from "react";
import { PromptContext } from "./PromptProvider";

const usePrompt = () => {
  const prompt = useContext(PromptContext);
  return prompt;
};

export default usePrompt;
