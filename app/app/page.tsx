import { JobList } from "@/components/JobList";
import { ReelEditor } from "@/components/ReelEditor";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, formatArs } from "@/lib/pricing";

export default function EditPage() {
  return (
    <>
      <ReelEditor cost={EDIT_CREDITS} priceLabel={formatArs(EDIT_CREDITS * CREDIT_PRICE_ARS)} />
      <JobList kind="edit" title="Tus reels" hrefPrefix="/app/reel/" />
    </>
  );
}
