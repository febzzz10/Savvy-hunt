import { CategoryResultsView } from "./view";

export default async function CategoryResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CategoryResultsView slug={slug} />;
}
