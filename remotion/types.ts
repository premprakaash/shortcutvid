export type RenderScene = {
  sceneKey: string;
  order: number;
  scriptSnippet: string;
  overlayText?: string | null;
  transition: string;
  startTime: number;
  endTime: number;
  visualUrl: string;
  isVideo: boolean;
};

export type RenderSubtitle = {
  text: string;
  start: number;
  end: number;
};

export type VideoCompositionProps = {
  title: string;
  audioUrl: string;
  subtitles: RenderSubtitle[];
  scenes: RenderScene[];
};
