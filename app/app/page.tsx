import { JobList } from "@/components/JobList";
import { ReelEditor } from "@/components/ReelEditor";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, PREMIUM_EDIT_CREDITS, formatArs } from "@/lib/pricing";

export default function EditPage() {
  return (
    <>
      <ReelEditor
        price={{ credits: EDIT_CREDITS, label: formatArs(EDIT_CREDITS * CREDIT_PRICE_ARS) }}
        premiumPrice={{ credits: PREMIUM_EDIT_CREDITS, label: formatArs(PREMIUM_EDIT_CREDITS * CREDIT_PRICE_ARS) }}
      />
      <JobList kind="edit" title="Tus reels" hrefPrefix="/app/reel/" />
    </>
  );
}
