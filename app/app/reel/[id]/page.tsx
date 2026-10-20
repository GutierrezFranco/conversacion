import { ReelDetail } from "@/components/ReelDetail";
import { ITERATION_CREDITS } from "@/lib/pricing";
import { STYLES } from "@/lib/styles";

export default async function ReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const styleNames = Object.fromEntries(STYLES.map((s) => [s.id, s.name]));
  return <ReelDetail id={id} iterationCost={ITERATION_CREDITS} styleNames={styleNames} />;
}
