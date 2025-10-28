import { Component, JSX } from "solid-js"

interface HintRowProps {
  children: JSX.Element
  class?: string
}

const HintRow: Component<HintRowProps> = (props) => {
  return <span class={`text-xs text-muted ${props.class || ""}`}>{props.children}</span>
}

export default HintRow
