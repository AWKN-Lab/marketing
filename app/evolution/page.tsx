import { EvolutionReview } from "@/components/evolution-review";
import { candidates } from "@/lib/mock-data";

export default function EvolutionPage() {
  return <EvolutionReview candidates={candidates} />;
}
