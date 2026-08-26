import { videoEmbedUrl } from "@/lib/utils";

function isInstagramReel(url: string | null | undefined): boolean {
  return !!url && /instagram\.com\/reel\//.test(url);
}

export function VideoEmbed({
  url,
  title = "Video",
  className = "",
}: {
  url: string | null | undefined;
  title?: string;
  className?: string;
}) {
  const embedUrl = videoEmbedUrl(url);
  if (!embedUrl) return null;

  const isIg = isInstagramReel(url);

  return (
    <div
      className={`overflow-hidden rounded-xl bg-black ${isIg ? "max-w-[360px] mx-auto" : "w-full"} ${className}`}
    >
      <div className={isIg ? "aspect-[9/16]" : "aspect-video"}>
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
