import { SiteLoader } from "@/components/workspace/site-loader";

export default function WorkspaceLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background dot-grid">
      <SiteLoader label="Loading workspace" />
    </div>
  );
}
