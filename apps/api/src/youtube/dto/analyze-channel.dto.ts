export class AnalyzeChannelDto {
  // можно передать @handle, channelId (UCxxx...), или полный URL
  input: string;

  // сколько последних видео анализировать (по умолчанию 20)
  videoCount?: number;
}
