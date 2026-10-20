import { JobList } from "@/components/JobList";
import { ReelEditor } from "@/components/ReelEditor";
import { EDIT_CREDITS } from "@/lib/pricing";

export default function EditPage() {
  return (
    <>
      <ReelEditor cost={EDIT_CREDITS} />
      <JobList kind="edit" title="Tus reels" hrefPrefix="/app/reel/" />
    </>
  );
}
