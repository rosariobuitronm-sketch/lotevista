import type { DetailedHTMLProps, HTMLAttributes } from "react";

// Permite usar la etiqueta <model-viewer> de Google dentro de JSX (React 19).
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        ar?: boolean | "";
        "ar-modes"?: string;
        "camera-controls"?: boolean | "";
        "auto-rotate"?: boolean | "";
        "touch-action"?: string;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        "camera-orbit"?: string;
        "min-camera-orbit"?: string;
        "max-camera-orbit"?: string;
        "field-of-view"?: string;
        "interaction-prompt"?: string;
        "rotation-per-second"?: string;
        "disable-zoom"?: boolean | "";
        loading?: string;
        reveal?: string;
      };
    }
  }
}
